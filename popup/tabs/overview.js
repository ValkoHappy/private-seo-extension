const seoAuditPolicy = new SeoAuditPolicy();

function fillOverviewTab(data, urlObj) {
    const { titles, metaTags, canonicals, hreflangs, lang, headings, aTags, imgTags, webVitals } = data;

    if (webVitals) {
        const lcpEl = document.querySelector('#cwvLcp .result');
        const clsEl = document.querySelector('#cwvCls .result');
        const ttfbEl = document.querySelector('#cwvTtfb .result');

        const getIcon = (c) => c === 'success' ? 'fa-circle-check' : (c === 'error' ? 'fa-circle-xmark' : 'fa-circle-exclamation');
        if (lcpEl) {
            const lcp = Math.round(webVitals.lcp);
            const color = lcp === 0 ? 'warning' : lcp <= 2500 ? 'success' : lcp <= 4000 ? 'warning' : 'error';
            lcpEl.innerHTML = `<span class="result-text">${lcp > 0 ? lcp + ' мс' : '—'}</span><i class="fa ${getIcon(color)} ball ball__${color}"></i>`;
        }
        if (clsEl) {
            const cls = webVitals.cls.toFixed(3);
            const color = (cls == 0 && webVitals.lcp === 0) ? 'warning' : cls <= 0.1 ? 'success' : cls <= 0.25 ? 'warning' : 'error';
            clsEl.innerHTML = `<span class="result-text">${cls > 0 ? cls : '—'}</span><i class="fa ${getIcon(color)} ball ball__${color}"></i>`;
        }
        if (ttfbEl) {
            const ttfb = Math.round(webVitals.ttfb);
            const color = ttfb === 0 ? 'warning' : ttfb <= 800 ? 'success' : ttfb <= 1800 ? 'warning' : 'error';
            ttfbEl.innerHTML = `<span class="result-text">${ttfb > 0 ? ttfb + ' мс' : '—'}</span><i class="fa ${getIcon(color)} ball ball__${color}"></i>`;
        }
    }

    const title = titles.length ? titles[0].innerText : '';
    const description = (metaTags['description'] || [{}])[0].content || '';
    const robots = (metaTags['robots'] || [{}])[0].content || '';
    const xRobots = '';
    const canonical = canonicals.length ? canonicals[0].href : '';
    const h1 = headings.find(h => h.nodeName === 'H1');

    updateAuditContext({
        ready: true,
        url: globalUrl,
        title,
        description,
        robots,
        xRobots,
        canonical,
        lang,
        hreflangs: hreflangs || [],
        headings: headings || [],
        aTags: aTags || [],
        imgTags: imgTags || [],
        metaTags: metaTags || {},
        webVitals: webVitals || null
    });

    setResult('#title', title || 'Отсутствует', title ? 'success' : 'error');
    setHint('#title', title ? `Символов: ${title.length}` : '');

    const allH1 = headings.filter(h => h.nodeName === 'H1');
    const h1ResultEl = document.querySelector('#h1 .result');
    if (h1ResultEl) {
        if (allH1.length === 0) {
            h1ResultEl.innerHTML = '<span class="result-text"><span class="empty-value">Отсутствует</span></span><i class="fa fa-circle-xmark ball ball__error"></i>';
        } else if (allH1.length === 1) {
            h1ResultEl.innerHTML = `<span class="result-text">${escHtml(allH1[0].textContent)}</span><i class="fa fa-circle-check ball ball__success"></i>`;
        } else {
            const list = allH1.map((h, i) => `<span class="h1-item"><b>${i + 1}:</b> ${escHtml(h.textContent)}</span>`).join('');
            h1ResultEl.innerHTML = `<span class="result-text"><span class="h1-warning"><i class="fa fa-circle-exclamation ball ball__warning"></i> ${allH1.length} H1 на странице</span>${list}</span>`;
        }
    }

    setResult('#description', description || 'Отсутствует', description ? 'success' : 'error');
    setHint('#description', description ? `Символов: ${description.length}` : '');

    const urlAnchor = document.querySelector('#url .tabs-content__row_prop a');
    if (urlAnchor) { urlAnchor.href = globalUrl; urlAnchor.textContent = globalUrl; }
    setHint('#url', `Символов: ${globalUrl.length}`);

    setResult('#lang', lang || 'Отсутствует', lang ? 'ok' : 'warning');

    fillHreflang(hreflangs || []);

    if (canonical) {
        setIndexingResult('#indexing-canonical', canonical, 'Тег найден', 'success');
    } else {
        setIndexingResult('#indexing-canonical', 'Тег отсутствует', 'Индексирование страницы разрешено', 'success');
    }

    if (robots) {
        const blocked = /noindex/i.test(robots);
        setIndexingResult('#indexing-metatag', robots,
            blocked ? 'Индексирование запрещено' : 'Индексирование разрешено',
            blocked ? 'error' : 'ok');
    } else {
        setIndexingResult('#indexing-metatag', 'Метатег отсутствует', 'Индексирование страницы разрешено', 'success');
    }

    if (xRobots) {
        const blocked = /noindex/i.test(xRobots);
        setIndexingResult('#indexing-x-robots-tag', xRobots,
            blocked ? 'Индексирование запрещено' : 'Индексирование разрешено',
            blocked ? 'error' : 'ok');
    } else {
        setIndexingResult('#indexing-x-robots-tag', 'Метатег отсутствует', 'Индексирование страницы разрешено', 'success');
    }

    const robotsLink = document.querySelector('#indexing-robots .dropdown__item_name a');
    if (robotsLink) robotsLink.href = `${urlObj.origin}/robots.txt`;

    setupPrivacySensitiveLoads(urlObj);

    const hCounts = { H1: 0, H2: 0, H3: 0, H4: 0, H5: 0, H6: 0 };
    headings.forEach(h => { if (hCounts[h.nodeName] !== undefined) hCounts[h.nodeName]++; });
    ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].forEach(tag => {
        const id = `h${tag[1]}Length`;
        const el = document.getElementById(id);
        if (!el) return;
        const counter = el.querySelector('.counter');
        const count = hCounts[tag];
        if (counter) {
            counter.textContent = count;
        }
        const texts = headings.filter(h => h.nodeName === tag).map(h => h.textContent);
        fillHeadingDropdown(el, texts);
    });

    const allCount = headings.length;
    const allTitlesEl = document.getElementById('allTitles');
    if (allTitlesEl) {
        const counter = allTitlesEl.querySelector('.counter');
        if (counter) counter.textContent = allCount;
        const scrollContainer = allTitlesEl.querySelector('.dropdown__scroll_container');
        if (scrollContainer) {
            scrollContainer.innerHTML = headings.map(h =>
                `<span class="dropdown__title heading-${h.nodeName}">${escHtml(h.textContent)}</span>`
            ).join('');
        }
    }

    const linksEl = document.getElementById('linksLength');
    if (linksEl) {
        const counter = linksEl.querySelector('.counter');
        if (counter) counter.textContent = aTags.length;
    }

    const imagesEl = document.getElementById('imgLength');
    if (imagesEl) {
        const counter = imagesEl.querySelector('.counter');
        if (counter) counter.textContent = imgTags.length;
    }

    const copyBtn = document.getElementById('copy-metatags-and-headings');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            chrome.storage.sync.get(['metaTagsTemplate'], (data) => {
                const tpl = data.metaTagsTemplate ||
                    'title: {title}\nh1: {h1}\ndescription: {description}\nurl: {url}';
                const result = tpl
                    .replace('{title}', title)
                    .replace('{h1}', allH1.length ? allH1.map(h => h.textContent).join(' | ') : '')
                    .replace('{description}', description)
                    .replace('{url}', globalUrl);
                copyToClipboard(result).then(success => {
                    const orig = copyBtn.innerHTML;
                    const origTitle = copyBtn.getAttribute('title') || '';
                    const origAria = copyBtn.getAttribute('aria-label') || '';
                    copyBtn.innerHTML = success
                        ? '<i class="fa fa-check"></i>'
                        : '<i class="fa fa-xmark"></i>';
                    copyBtn.setAttribute('title', success ? 'Скопировано' : 'Не удалось скопировать');
                    copyBtn.setAttribute('aria-label', success ? 'Скопировано' : 'Не удалось скопировать');
                    setTimeout(() => {
                        copyBtn.innerHTML = orig;
                        copyBtn.setAttribute('title', origTitle);
                        copyBtn.setAttribute('aria-label', origAria);
                    }, CONFIG.COPY_FLASH_DURATION);
                });
            });
        });
    }

    const exportBtn = document.getElementById('exportFullReport');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const canonicalStr = canonicals.length ? canonicals[0].href : '';
            const score = Object.values(SeoScore.state).reduce((a, b) => a + b, 0);
            const h1Text = h1 ? h1.textContent : '';
            const report = [
                `=== SEO ОТЧЁТ ===`,
                `URL: ${globalUrl}`,
                `SEO оценка: ${score}/100`,
                ``,
                `--- МЕТАТЕГИ ---`,
                `Title (${title.length} симв.): ${title || '—'}`,
                `H1: ${h1Text || '—'}`,
                `Description (${description.length} симв.): ${description || '—'}`,
                ``,
                `--- ИНДЕКСИРОВАНИЕ ---`,
                `Canonical: ${canonicalStr || 'Отсутствует'}`,
                `Lang: ${lang || 'Отсутствует'}`,
                ``,
                `--- ЗАГОЛОВКИ ---`,
                ...['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].map(tag => {
                    const found = headings.filter(h => h.nodeName === tag);
                    return found.length ? `${tag} (${found.length}): ${found.map(h => h.textContent).join(' | ')}` : `${tag}: —`;
                }),
                ``,
                `Ссылок: ${aTags.length} | Изображений: ${imgTags.length}`
            ].join('\n');
            copyToClipboard(report).then(success => {
                exportBtn.innerHTML = success ? '<i class="fa fa-check"></i>' : '<i class="fa fa-xmark"></i>';
                setTimeout(() => { exportBtn.innerHTML = '<i class="far fa-copy"></i>'; }, CONFIG.COPY_FLASH_DURATION);
            });
        });
    }

    const exportPdfBtn = document.getElementById('exportPdfReport');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async () => {
            const scoreVal = document.getElementById('seoScoreValue')?.textContent || '';
            let wordsVal = document.getElementById('charactersWords')?.textContent || '';
            if (!wordsVal && globalTab?.id) {
                try {
                    await ensureContentScriptLoaded(globalTab.id);
                    const textStats = await sendMessageWithTimeout(globalTab.id, { action: 'getTextStats' }, CONFIG.MESSAGE_TIMEOUT);
                    wordsVal = textStats?.totalWords ? String(textStats.totalWords) : '';
                } catch {}
            }

            const internalLinks = aTags.filter(l => !l.isExternal && l.href && !l.href.startsWith('javascript') && !l.href.startsWith('tel') && !l.href.startsWith('mailto')).length;
            const externalLinks = aTags.filter(l => l.isExternal).length;
            const nofollowLinks = aTags.filter(l => (l.rel || '').toLowerCase().includes('nofollow')).length;
            const imgWithoutAlt = imgTags.filter(i => !i.alt).length;

            const reportData = {
                url: globalUrl,
                date: new Date().toLocaleString(),
                score: scoreVal,
                title,
                description,
                h1: allH1.length ? allH1.map(h => h.textContent).join(' | ') : '',
                canonical,
                robots,
                wordCount: wordsVal,
                lcp: webVitals?.lcp ? Math.round(webVitals.lcp) : 0,
                cls: webVitals?.cls ? webVitals.cls.toFixed(3) : 0,
                ttfb: webVitals?.ttfb ? Math.round(webVitals.ttfb) : 0,
                linksTotal: aTags.length,
                linksInternal: internalLinks,
                linksExternal: externalLinks,
                linksNofollow: nofollowLinks,
                imagesTotal: imgTags.length,
                imagesNoAlt: imgWithoutAlt,
                headingsConfig: {
                    h1: headings.filter(h => h.nodeName === 'H1').length,
                    h2: headings.filter(h => h.nodeName === 'H2').length,
                    h3: headings.filter(h => h.nodeName === 'H3').length,
                    h4: headings.filter(h => h.nodeName === 'H4').length,
                    h5: headings.filter(h => h.nodeName === 'H5').length,
                    h6: headings.filter(h => h.nodeName === 'H6').length
                },
                ogTitle: (metaTags['og:title'] || [{}])[0].content || '',
                ogImage: (metaTags['og:image'] || [{}])[0].content || ''
            };

            syncAuditIssues();
            reportData.auditIssues = globalAuditIssues.map(issue => ({ ...issue }));

            const aiTabTitle = document.getElementById('aiTabTitle')?.textContent || '';
            const aiTabDescription = document.getElementById('aiTabDescription')?.textContent || '';
            const aiTabIntent = document.getElementById('aiTabIntentContent')?.textContent || '';
            const aiTabSpam = document.getElementById('aiTabSpamContent')?.textContent || '';
            if (aiTabTitle || aiTabIntent || aiTabSpam) {
                reportData.aiMeta = { title: aiTabTitle, description: aiTabDescription };
                reportData.aiIntent = aiTabIntent;
                reportData.aiSpam = aiTabSpam;
            }

            chrome.storage.local.set({ seoReportData: reportData }, () => {
                chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
            });
        });
    }

    const overviewAiBtn = document.getElementById('overviewAiAnalysis');
    if (overviewAiBtn) {
        overviewAiBtn.addEventListener('click', () => {
            const aiTabEl = document.querySelector('.tabs-item[data-tab="ai"]');
            if (aiTabEl) aiTabEl.click();
        });
    }

    SeoScore.init(data);
}

// ================================================================
// SEO SCORE
// ================================================================
const SeoScore = {
    state: { title: 0, h1: 0, description: 0, https: 0, canonical: 0, lang: 0, robots: 0, sitemap: 0 },
    update() {
        const total = Math.min(100, Object.values(this.state).reduce((a, b) => a + b, 0));
        const bar = document.getElementById('seoScoreBar');
        const val = document.getElementById('seoScoreValue');
        if (!bar || !val) return;
        bar.style.width = total + '%';
        val.textContent = total + '/100';
        if (total >= 80) {
            bar.style.background = 'var(--success)';
            val.style.color = 'var(--success)';
        } else if (total >= 50) {
            bar.style.background = 'var(--warning)';
            val.style.color = 'var(--warning)';
        } else {
            bar.style.background = 'var(--error)';
            val.style.color = 'var(--error)';
        }
    },
    init(data) {
        const { titles, metaTags, canonicals, lang, headings } = data;
        const title = titles.length ? titles[0].innerText : '';
        const description = (metaTags['description'] || [{}])[0]?.content || '';
        const h1 = headings.find(h => h.nodeName === 'H1');
        const canonical = canonicals.length ? canonicals[0].href : '';
        this.state.title = title ? CONFIG.SEO_WEIGHTS.title : 0;
        this.state.h1 = h1 ? CONFIG.SEO_WEIGHTS.h1 : 0;
        this.state.description = description ? CONFIG.SEO_WEIGHTS.description : 0;
        this.state.https = (globalUrl && globalUrl.startsWith('https://')) ? CONFIG.SEO_WEIGHTS.https : 0;
        this.state.canonical = canonical ? CONFIG.SEO_WEIGHTS.canonical : 0;
        this.state.lang = lang ? CONFIG.SEO_WEIGHTS.lang : 0;
        this.state.robots = CONFIG.SEO_WEIGHTS.robots;
        this.state.sitemap = 0;
        this.update();
    },
    updateRobots(isBlocked) {
        this.state.robots = isBlocked ? 0 : CONFIG.SEO_WEIGHTS.robots;
        this.update();
    },
    updateSitemap(found) {
        this.state.sitemap = found ? CONFIG.SEO_WEIGHTS.sitemap : 0;
        this.update();
    }
};

function fillHeadingDropdown(containerEl, texts) {
    if (!containerEl) return;
    const sc = containerEl.querySelector('.dropdown__scroll_container');
    if (!sc) return;
    sc.innerHTML = texts.map(t => `<p>${escHtml(t)}</p>`).join('');
}

// ================================================================
// DEFERRED FILLS (from background)
// ================================================================
function fillStatusCode(status) {
    const color = status >= 200 && status < 300 ? 'success' : status >= 300 && status < 400 ? 'warning' : 'error';
    setResult('#statusCode', status ? status.toString() : 'Ошибка', color);
    updateAuditContext({ statusCode: typeof status === 'number' ? status : null });
}

function fillRobotsTxt(robotsTxt) {
    if (robotsTxt && robotsTxt.trim()) {
        const agents = [...new Set(
            robotsTxt.split('\n')
                .map(l => l.trim())
                .filter(l => /^user-agent:/i.test(l))
                .map(l => l.replace(/^user-agent:\s*/i, '').trim())
        )];
        const agentStr = agents.length ? agents.slice(0, 3).join(', ') : '*';
        const pageUrl = safeParseUrl(globalUrl);
        const robotsState = evaluateRobotsForPage(robotsTxt, pageUrl);
        const robotsDescription = robotsState.checkedAgents.length
            ? `Сканирование страницы ${robotsState.isBlocked ? 'запрещено' : 'разрешено'}`
            : 'Файл найден';
        const robotsStatus = robotsState.isBlocked ? 'error' : 'success';
        setIndexingResult('#indexing-robots', `User-agent: ${agentStr}`, robotsDescription, robotsStatus);
        SeoScore.updateRobots(robotsState.isBlocked);
        updateAuditContext({
            robotsTxtBlocked: robotsState.isBlocked,
            robotsTxtAgents: robotsState.checkedAgents,
            robotsTxtRule: robotsState.rule
        });
    } else {
        setIndexingResult('#indexing-robots', 'Файл не найден', 'Сканирование разрешено', 'success');
        SeoScore.updateRobots(false);
        updateAuditContext({ robotsTxtBlocked: false, robotsTxtAgents: [], robotsTxtRule: null });
    }
}

function fillXRobotsTag(xRobots) {
    if (xRobots) {
        const blocked = /noindex/i.test(xRobots);
        setIndexingResult(
            '#indexing-x-robots-tag',
            xRobots,
            blocked ? 'Индексирование страницы запрещено' : 'Индексирование страницы разрешено',
            blocked ? 'error' : 'ok'
        );
        updateAuditContext({ xRobots });
        return;
    }
    setIndexingResult(
        '#indexing-x-robots-tag',
        'Заголовок отсутствует',
        'Индексирование страницы разрешено',
        'success'
    );
    updateAuditContext({ xRobots: '' });
}

function setupPrivacySensitiveLoads(urlObj) {
    const ipRow = document.querySelector('#ip .result');
    const iksRow = document.querySelector('#yaIksImg .result');
    if (ipRow) {
        ipRow.innerHTML = '<span class="empty-value">Загрузка...</span>';
        sendRuntimeMessageAsync({ action: 'getIpInfo', hostname: urlObj.hostname })
            .then((res) => { fillIpInfo(res); })
            .catch(() => { setResult('#ip', 'Не удалось загрузить', 'warning'); });
    }
    if (iksRow) {
        iksRow.innerHTML = '<span class="empty-value">Загрузка...</span>';
        const img = document.createElement('img');
        img.alt = 'Индекс ИКС';
        img.referrerPolicy = 'no-referrer';
        img.onload = () => { iksRow.replaceChildren(img); };
        img.onerror = () => { setResult('#yaIksImg', 'Не удалось загрузить', 'warning'); };
        img.src = `${CONFIG.YANDEX_ICS_URL}${encodeURIComponent(urlObj.hostname)}`;
    }
}

function safeParseUrl(url) {
    try { return new URL(url); } catch { return null; }
}







function fillIpInfo(res) {
    if (!res) return;
    let ipText = 'Не определён';
    if (res.ip) {
        const parts = [res.ip];
        if (res.city) parts.push(res.city);
        if (res.country) parts.push(res.country);
        if (res.org) parts.push(res.org.replace(/^AS\d+\s*/, ''));
        ipText = parts.join(' · ');
    }
    setResult('#ip', ipText, res.ip ? 'ok' : 'warning');
}

function fillSitemap(sitemaps) {
    const sitemapRow = document.getElementById('sitemapXml');
    if (!sitemapRow) return;
    const countEl = sitemapRow.querySelector('.tabs-content__row_prop');
    const sitemapBtn = sitemapRow.querySelector('.btn_arrow');
    if (countEl) countEl.innerHTML = sitemaps.length
        ? `<span class="count-badge">${sitemaps.length}</span>`
        : `<span class="count-empty">Отсутствует</span>`;
    if (sitemapBtn) sitemapBtn.style.display = sitemaps.length ? '' : 'none';
    const dd = sitemapRow.querySelector('.dropdown');
    if (!dd) return;
    dd.innerHTML = '';
    if (sitemaps.length) {
        sitemaps.forEach(sm => {
            const div = document.createElement('div');
            div.className = 'dropdown__item';
            div.innerHTML = '<a style="word-break:break-all"></a>';
            setExternalLink(div.querySelector('a'), sm, sm);
            dd.appendChild(div);
        });
        dd.classList.add('active');
    }
    SeoScore.updateSitemap(sitemaps.length > 0);
    updateAuditContext({ sitemapCount: sitemaps.length });
}


const ISSUE_LABELS = { critical: 'Critical', warning: 'Warning', info: 'Info', success: 'OK' };

function updateAuditContext(patch) {
    auditContext = { ...auditContext, ...patch };
    syncAuditIssues();
}

function syncAuditIssues() {
    if (!auditContext.ready) return;
    globalAuditIssues = seoAuditPolicy.analyze(auditContext);
    renderAuditIssues(globalAuditIssues);
}









function renderAuditIssues(issues) {
    const listEl = document.getElementById('overviewIssuesList');
    if (!listEl) return;
    updateAuditIssueCounters(issues);
    listEl.replaceChildren();
    if (!issues.length) {
        const empty = document.createElement('div');
        empty.className = 'dropdown__item audit-empty';
        const badge = document.createElement('span');
        badge.className = 'audit-pill audit-pill--success';
        badge.textContent = ISSUE_LABELS.success;
        const text = document.createElement('div');
        text.className = 'audit-issue__details';
        text.style.marginTop = '10px';
        text.textContent = 'Критичных и предупреждающих SEO-проблем по базовым правилам не найдено.';
        empty.appendChild(badge);
        empty.appendChild(text);
        listEl.appendChild(empty);
        return;
    }
    issues.forEach((issue) => {
        const item = document.createElement('div');
        item.className = `dropdown__item audit-issue audit-issue--${issue.severity}`;
        const header = document.createElement('div');
        header.className = 'audit-issue__header';
        const title = document.createElement('div');
        title.className = 'audit-issue__title';
        title.textContent = issue.title;
        const badge = document.createElement('span');
        badge.className = `audit-pill audit-pill--${issue.severity}`;
        badge.textContent = ISSUE_LABELS[issue.severity];
        const details = document.createElement('div');
        details.className = 'audit-issue__details';
        details.textContent = issue.details;
        const recommendation = document.createElement('div');
        recommendation.className = 'audit-issue__recommendation';
        recommendation.textContent = `Что делать: ${issue.recommendation}`;
        header.appendChild(title);
        header.appendChild(badge);
        item.appendChild(header);
        item.appendChild(details);
        item.appendChild(recommendation);
        listEl.appendChild(item);
    });
}

function updateAuditIssueCounters(issues) {
    const counts = issues.reduce((acc, issue) => {
        acc[issue.severity] += 1;
        return acc;
    }, { critical: 0, warning: 0, info: 0 });
    const criticalEl = document.getElementById('auditCriticalCount');
    const warningEl = document.getElementById('auditWarningCount');
    const infoEl = document.getElementById('auditInfoCount');
    if (criticalEl) criticalEl.textContent = `${counts.critical} Critical`;
    if (warningEl) warningEl.textContent = `${counts.warning} Warning`;
    if (infoEl) infoEl.textContent = `${counts.info} Info`;
}

async function runOverviewAiReview(options = {}) {
    const sectionEl = document.getElementById('overviewAiReviewSection');
    const loaderEl = document.getElementById('overviewAiReviewLoader');
    const loaderTextEl = document.getElementById('overviewAiReviewLoaderText');
    const errorEl = document.getElementById('overviewAiReviewError');
    const triggerButtons = [
        document.getElementById('overviewAiAnalysis'),
        document.getElementById('aiBtnReview')
    ].filter(Boolean);
    const showOwnLoader = options.showOwnLoader !== false;
    if (!sectionEl || !loaderEl || !loaderTextEl || !errorEl) {
        return { success: false, error: 'Overview AI UI is unavailable' };
    }
    sectionEl.style.display = 'block';
    loaderEl.style.display = showOwnLoader ? 'flex' : 'none';
    loaderTextEl.textContent = 'AI анализирует страницу...';
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    if (showOwnLoader) {
        triggerButtons.forEach((btn) => { btn.disabled = true; });
    }
    try {
        loaderTextEl.textContent = 'Дожидаюсь данных индексации...';
        await waitForDeferredAuditSignals();
        loaderTextEl.textContent = 'AI анализирует страницу...';
        syncAuditIssues();
        const [intentResp, spamResp] = await Promise.all([
            runAiActionRequest('analyzeIntent'),
            runAiActionRequest('analyzeSpam')
        ]);
        if (!intentResp?.success && !spamResp?.success) {
            throw new Error(intentResp?.error || spamResp?.error || 'Не удалось получить ответ от AI');
        }
        const intentText = intentResp?.success ? stripMarkdown(intentResp.text || '') : '';
        const spamText = spamResp?.success ? stripMarkdown(spamResp.text || '') : '';
        const review = buildOverviewAiReview({
            issues: globalAuditIssues,
            intentText,
            spamText,
            baseScore: parseInt(document.getElementById('seoScoreValue')?.textContent || '0', 10) || 0
        });
        renderOverviewAiReview(review);
        return { success: true, review, intentText, spamText };
    } catch (error) {
        errorEl.textContent = error.message || 'Не удалось выполнить AI-анализ';
        errorEl.style.display = 'block';
        return { success: false, error: error.message || 'Не удалось выполнить AI-анализ' };
    } finally {
        loaderEl.style.display = 'none';
        if (showOwnLoader) {
            triggerButtons.forEach((btn) => { btn.disabled = false; });
        }
    }
}

function buildOverviewAiReview({ issues, intentText, spamText, baseScore }) {
    const criticalCount = issues.filter(issue => issue.severity === 'critical').length;
    const warningCount = issues.filter(issue => issue.severity === 'warning').length;
    const infoCount = issues.filter(issue => issue.severity === 'info').length;
    let score = baseScore;
    score -= criticalCount * 12;
    score -= warningCount * 4;
    const spamLower = spamText.toLowerCase();
    if (spamLower.includes('высокая')) score -= 6;
    else if (spamLower.includes('средняя')) score -= 3;
    if (spamLower.includes('переспам')) score -= 4;
    score = Math.max(0, Math.min(100, score));
    const verdict = score >= 80
        ? 'Страница выглядит сильной, но всё ещё есть точки роста.'
        : score >= 60
            ? 'Страница в рабочем состоянии, но AI видит заметные SEO-риски.'
            : 'Страница требует доработки: текущие сигналы и AI-анализ указывают на ощутимые ограничения роста.';
    const issueHighlights = issues.slice(0, 3).map(issue => issue.title.toLowerCase());
    const summaryParts = [];
    if (criticalCount || warningCount || infoCount) {
        summaryParts.push(`AI видит профиль рисков ${criticalCount} critical, ${warningCount} warning и ${infoCount} info.`);
    }
    if (issueHighlights.length) {
        summaryParts.push(`Главные зоны внимания: ${issueHighlights.join(', ')}.`);
    }
    const intentLine = extractFirstMeaningfulLine(intentText);
    const spamLine = extractFirstMeaningfulLine(spamText);
    if (intentLine) summaryParts.push(intentLine);
    if (spamLine) summaryParts.push(spamLine);
    const recommendations = issues.slice(0, 4).map(issue => issue.recommendation);
    if (!recommendations.length && spamLine) recommendations.push(spamLine);
    if (!recommendations.length && intentLine) recommendations.push(intentLine);
    const insights = [intentLine, spamLine].filter(Boolean);
    if (!insights.length) {
        insights.push('AI не вернул развёрнутых текстовых наблюдений, но техническая оценка уже собрана.');
    }
    return { score, verdict, summary: summaryParts.join(' '), recommendations, insights };
}

function extractFirstMeaningfulLine(text) {
    if (!text) return '';
    const lines = text
        .split(/\r?\n/)
        .map(line => line.replace(/^[\s\-*•\d.)]+/, '').trim())
        .filter(Boolean);
    return lines.find(line => line.length > 18) || lines[0] || '';
}

function renderOverviewAiReview(review) {
    const scoreEl = document.getElementById('overviewAiReviewScore');
    const verdictEl = document.getElementById('overviewAiReviewVerdict');
    const summaryEl = document.getElementById('overviewAiReviewSummary');
    const recommendationsEl = document.getElementById('overviewAiReviewRecommendations');
    const insightsEl = document.getElementById('overviewAiReviewInsights');
    if (!scoreEl || !verdictEl || !summaryEl || !recommendationsEl || !insightsEl) return;
    scoreEl.textContent = `${review.score}/100`;
    scoreEl.style.color = review.score >= 80 ? 'var(--success)' : review.score >= 60 ? 'var(--warning)' : 'var(--error)';
    scoreEl.style.background = review.score >= 80
        ? 'rgba(34, 197, 94, 0.10)'
        : review.score >= 60
            ? 'rgba(245, 158, 11, 0.12)'
            : 'rgba(239, 68, 68, 0.10)';
    verdictEl.textContent = review.verdict;
    summaryEl.textContent = review.summary;
    fillOverviewAiList(recommendationsEl, review.recommendations);
    fillOverviewAiList(insightsEl, review.insights);
}

function fillOverviewAiList(container, items) {
    if (!container) return;
    container.replaceChildren();
    (items || []).filter(Boolean).forEach((item) => {
        const row = document.createElement('div');
        row.className = 'overview-ai-item';
        row.textContent = item;
        container.appendChild(row);
    });
}

function fillHreflang(hreflangs) {
    const row = document.getElementById('hreflang');
    if (!row) return;
    const countEl = row.querySelector('.tabs-content__row_prop');
    const btn = row.querySelector('.btn_arrow');
    const dd = row.querySelector('.dropdown');
    if (!hreflangs.length) {
        if (countEl) countEl.innerHTML = `<span class="count-empty">Отсутствует</span>`;
        if (btn) btn.style.display = 'none';
        return;
    }
    if (countEl) countEl.innerHTML = `<span class="count-badge">${hreflangs.length}</span>`;
    if (!dd) return;
    dd.innerHTML = '';
    hreflangs.forEach(({ hreflang, href }) => {
        const div = document.createElement('div');
        div.className = 'dropdown__item hreflang-item';
        div.innerHTML = '<span class="hreflang-lang"></span><a class="hreflang-url"></a>';
        div.querySelector('.hreflang-lang').textContent = hreflang || '';
        setExternalLink(div.querySelector('.hreflang-url'), href, href);
        dd.appendChild(div);
    });
    dd.classList.add('active');
}
