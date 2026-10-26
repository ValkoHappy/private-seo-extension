function evaluateRobotsForPage(robotsTxt, pageUrl) {
    const groups = parseRobotsTxtGroups(robotsTxt);
    const pagePath = pageUrl ? `${pageUrl.pathname || '/'}${pageUrl.search || ''}` : '/';
    const checkedAgents = [];
    const yandexGroups = groups.filter((group) => group.userAgents.includes('yandex'));
    const wildcardGroups = groups.filter((group) => group.userAgents.includes('*'));
    const relevantGroups = yandexGroups.length ? yandexGroups : wildcardGroups;
    if (yandexGroups.length) checkedAgents.push('Yandex');
    if (!yandexGroups.length && wildcardGroups.length) checkedAgents.push('*');
    if (!relevantGroups.length) return { isBlocked: false, checkedAgents, rule: null };
    const matchedRules = relevantGroups
        .flatMap((group) => group.rules)
        .filter((rule) => rule.pattern && matchesRobotsRule(pagePath, rule.pattern));
    if (!matchedRules.length) return { isBlocked: false, checkedAgents, rule: null };
    matchedRules.sort((a, b) => {
        const lengthDiff = (b.pattern?.length || 0) - (a.pattern?.length || 0);
        if (lengthDiff !== 0) return lengthDiff;
        if (a.type === b.type) return 0;
        return a.type === 'allow' ? -1 : 1;
    });
    const topRule = matchedRules[0];
    return {
        isBlocked: topRule.type === 'disallow',
        checkedAgents,
        rule: topRule
    };
}

function parseRobotsTxtGroups(robotsTxt) {
    const groups = [];
    let currentGroup = null;
    robotsTxt.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.replace(/#.*$/, '').trim();
        if (!line) return;
        const userAgentMatch = line.match(/^user-agent:\s*(.+)$/i);
        if (userAgentMatch) {
            const agent = userAgentMatch[1].trim().toLowerCase();
            if (!currentGroup || currentGroup.rules.length > 0) {
                currentGroup = { userAgents: [], rules: [] };
                groups.push(currentGroup);
            }
            currentGroup.userAgents.push(agent);
            return;
        }
        if (!currentGroup) return;
        const ruleMatch = line.match(/^(allow|disallow):\s*(.*)$/i);
        if (!ruleMatch) return;
        const type = ruleMatch[1].toLowerCase();
        const pattern = ruleMatch[2].trim();
        if (!pattern) return;
        currentGroup.rules.push({ type, pattern });
    });
    return groups;
}

function matchesRobotsRule(path, pattern) {
    const hasEndAnchor = pattern.endsWith('$');
    const normalizedPattern = hasEndAnchor ? pattern.slice(0, -1) : pattern;
    const escaped = normalizedPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const regex = new RegExp(`^${escaped}${hasEndAnchor ? '$' : '.*'}`);
    return regex.test(path);
}

const ISSUE_SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

function buildAuditIssues(ctx) {
    if (!ctx.ready) return [];
    const issues = [];
    const allH1 = (ctx.headings || []).filter((h) => h.nodeName === 'H1');
    const imgWithoutAlt = (ctx.imgTags || []).filter((img) => !img.alt || !img.alt.trim()).length;
    const ogTitle = (ctx.metaTags?.['og:title'] || [{}])[0]?.content || '';
    const ogImage = (ctx.metaTags?.['og:image'] || [{}])[0]?.content || '';

    if (!ctx.title) {
        pushAuditIssue(
            issues,
            'critical',
            'Отсутствует title',
            'Поисковики не получают основной заголовок страницы для сниппета и релевантности.',
            'Добавьте уникальный title с главным ключом и понятным интентом страницы.'
        );
    } else if (ctx.title.length < 15) {
        pushAuditIssue(
            issues,
            'warning',
            'Слишком короткий title',
            `Текущая длина title: ${ctx.title.length} символов.`,
            'Сделайте title конкретнее, чтобы он лучше раскрывал тему страницы.'
        );
    } else if (ctx.title.length > 70) {
        pushAuditIssue(
            issues,
            'warning',
            'Слишком длинный title',
            `Текущая длина title: ${ctx.title.length} символов.`,
            'Сократите title, чтобы он не терял смысл при обрезке в выдаче.'
        );
    }

    if (!ctx.description) {
        pushAuditIssue(
            issues,
            'warning',
            'Отсутствует meta description',
            'Страница не задаёт управляемое описание для сниппета.',
            'Добавьте description с пользой страницы и кратким CTA.'
        );
    } else if (ctx.description.length < 70) {
        pushAuditIssue(
            issues,
            'warning',
            'Слишком короткий meta description',
            `Текущая длина description: ${ctx.description.length} символов.`,
            'Расширьте description до содержательного описания страницы.'
        );
    } else if (ctx.description.length > 160) {
        pushAuditIssue(
            issues,
            'warning',
            'Слишком длинный meta description',
            `Текущая длина description: ${ctx.description.length} символов.`,
            'Сократите description, чтобы снизить вероятность обрезки в сниппете.'
        );
    }

    if (allH1.length === 0) {
        pushAuditIssue(
            issues,
            'warning',
            'Отсутствует H1',
            'На странице нет основного заголовка документа.',
            'Добавьте один H1, который отражает тему страницы и не конфликтует с title.'
        );
    } else if (allH1.length > 1) {
        pushAuditIssue(
            issues,
            'warning',
            'Несколько H1 на странице',
            `Найдено H1: ${allH1.length}.`,
            'Оставьте один основной H1, остальные блоки перенесите в H2-H6.'
        );
    }

    const noindexSources = [];
    if (hasNoindexDirective(ctx.robots)) noindexSources.push('meta robots');
    if (hasNoindexDirective(ctx.xRobots)) noindexSources.push('X-Robots-Tag');
    if (noindexSources.length) {
        pushAuditIssue(
            issues,
            'critical',
            'Страница закрыта от индексации',
            `Найдена директива noindex в: ${noindexSources.join(', ')}.`,
            'Проверьте, действительно ли страницу нужно держать вне индекса. Если нет, уберите noindex.'
        );
    }

    if (ctx.robotsTxtBlocked) {
        pushAuditIssue(
            issues,
            'critical',
            'robots.txt блокирует сканирование',
            'Обнаружен глобальный Disallow для User-agent: *.',
            'Снимите полный запрет в robots.txt, если страница должна индексироваться.'
        );
    }

    if (typeof ctx.statusCode === 'number') {
        if (ctx.statusCode >= 400 || ctx.statusCode === 0) {
            pushAuditIssue(
                issues,
                'critical',
                'Страница отвечает ошибкой',
                `Текущий HTTP-статус: ${ctx.statusCode || '0'}.`,
                'Исправьте ответ сервера. Рабочая страница должна возвращать 200.'
            );
        } else if (ctx.statusCode >= 300) {
            pushAuditIssue(
                issues,
                'warning',
                'Страница отвечает редиректом',
                `Текущий HTTP-статус: ${ctx.statusCode}.`,
                'Проверьте, нужен ли редирект на конечной посадочной странице, и ведут ли внутренние ссылки сразу на финальный URL.'
            );
        }
    }

    if (!ctx.canonical) {
        pushAuditIssue(
            issues,
            'warning',
            'Отсутствует canonical',
            'Страница не задаёт канонический URL.',
            'Добавьте canonical, если возможны дубли или URL-параметры.'
        );
    } else if (
        normalizeComparableUrl(ctx.canonical, ctx.url) !== normalizeComparableUrl(ctx.url, ctx.url)
    ) {
        pushAuditIssue(
            issues,
            'warning',
            'Canonical указывает на другой URL',
            `Canonical: ${ctx.canonical}`,
            'Проверьте, действительно ли текущая страница должна канонизироваться на другой адрес.'
        );
    }

    if (!ctx.lang) {
        pushAuditIssue(
            issues,
            'warning',
            'Не указан lang у документа',
            'Поисковики и вспомогательные технологии не получают явный язык страницы.',
            'Добавьте атрибут lang на тег html.'
        );
    }

    if (ctx.url && !ctx.url.startsWith('https://')) {
        pushAuditIssue(
            issues,
            'warning',
            'Страница открыта не по HTTPS',
            'Для страницы используется незащищённый протокол.',
            'Переведите страницу на HTTPS и обновите внутренние ссылки.'
        );
    }

    if (ctx.sitemapCount === 0) {
        pushAuditIssue(
            issues,
            'warning',
            'Не найден sitemap.xml',
            'Плагин не обнаружил карту сайта по стандартным путям.',
            'Добавьте sitemap.xml и укажите её в robots.txt.'
        );
    }

    if (imgWithoutAlt > 0) {
        pushAuditIssue(
            issues,
            'warning',
            'Есть изображения без alt',
            `Изображений без alt: ${imgWithoutAlt}.`,
            'Добавьте информативные alt хотя бы для значимых контентных и продуктовых изображений.'
        );
    }

    if (ctx.webVitals) {
        const lcp = Math.round(ctx.webVitals.lcp || 0);
        const cls = Number(ctx.webVitals.cls || 0);
        const ttfb = Math.round(ctx.webVitals.ttfb || 0);
        if (lcp > 4000) {
            pushAuditIssue(
                issues,
                'warning',
                'Плохой LCP',
                `LCP: ${lcp} мс.`,
                'Оптимизируйте самый крупный контентный элемент: серверный ответ, hero-изображение, CSS и критический рендер.'
            );
        }
        if (cls > 0.25) {
            pushAuditIssue(
                issues,
                'warning',
                'Плохой CLS',
                `CLS: ${cls.toFixed(3)}.`,
                'Уберите неожиданные сдвиги: задайте размеры медиа и стабилизируйте динамические блоки.'
            );
        }
        if (ttfb > 1800) {
            pushAuditIssue(
                issues,
                'warning',
                'Медленный ответ сервера',
                `TTFB: ${ttfb} мс.`,
                'Проверьте сервер, кэширование и тяжёлые бэкенд-запросы.'
            );
        }
    }

    if (!ogTitle || !ogImage) {
        pushAuditIssue(
            issues,
            'info',
            'Неполная Open Graph-разметка',
            'Страница может хуже выглядеть при шаринге в соцсетях и мессенджерах.',
            'Добавьте как минимум og:title и og:image для управляемого превью.'
        );
    }

    return issues.sort(
        (a, b) => ISSUE_SEVERITY_ORDER[a.severity] - ISSUE_SEVERITY_ORDER[b.severity]
    );
}

function pushAuditIssue(list, severity, title, details, recommendation) {
    list.push({ severity, title, details, recommendation });
}

function hasNoindexDirective(value) {
    return /(^|[\s,;])noindex\b/i.test(value || '');
}

function normalizeComparableUrl(value, baseUrl) {
    if (!value) return '';
    try {
        const url = new URL(value, baseUrl || undefined);
        url.hash = '';
        if (url.pathname !== '/' && url.pathname.endsWith('/')) {
            url.pathname = url.pathname.replace(/\/+$/, '');
        }
        return `${url.origin}${url.pathname}${url.search}`;
    } catch {
        return String(value).trim();
    }
}
class SeoAuditPolicy {
    analyze(context) {
        return buildAuditIssues(context);
    }
    evaluateRobots(text, url) {
        return evaluateRobotsForPage(text, url);
    }
}
