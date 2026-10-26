function setResult(parentSelector, text, status) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return;
    const resultEl = parent.querySelector('.result');
    if (!resultEl) return;

    let iconHtml = '';
    if (status === 'error') iconHtml = ' <i class="fa fa-circle-xmark ball ball__error"></i>';
    else if (status === 'success') iconHtml = ' <i class="fa fa-circle-check ball ball__success"></i>';
    else if (status === 'warning') iconHtml = ' <i class="fa fa-circle-exclamation ball ball__warning"></i>';

    const isAbsent = (status === 'error' || status === 'warning') && (!text || text === 'Отсутствует');
    const innerText = isAbsent
        ? `<span class="empty-value">${escHtml(text)}</span>`
        : escHtml(text);

    const textHtml = iconHtml
        ? `<span class="result-text">${innerText}</span>${iconHtml}`
        : innerText;

    const copyBtn = resultEl.querySelector('.copy-icon');
    resultEl.innerHTML = textHtml;
    if (copyBtn) resultEl.appendChild(copyBtn);
}

function setIndexingResult(parentSelector, value, description, status) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return;
    const resultEl = parent.querySelector('.result');
    if (!resultEl) return;
    let iconHtml = '';
    if (status === 'error') iconHtml = '<i class="fa fa-circle-xmark ball ball__error"></i>';
    else if (status === 'success') iconHtml = '<i class="fa fa-circle-check ball ball__success"></i>';
    else if (status === 'warning') iconHtml = '<i class="fa fa-circle-exclamation ball ball__warning"></i>';
    resultEl.innerHTML = `<div class="indexing-content"><span class="indexing-item__value">${escHtml(value)}</span><span class="indexing-item__desc">${escHtml(description)}</span></div>${iconHtml}`;
}

function setHint(parentSelector, text) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return;
    const hint = parent.querySelector('.hint');
    if (hint) hint.textContent = text;
}

function setLink(selector, href) {
    const el = document.querySelector(selector);
    if (el) el.href = href;
}

function setLabel(forAttr, text) {
    const label = document.querySelector(`label[for="${forAttr}"]`);
    if (label) label.textContent = text;
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

function showCopyFeedback(btn, successText = 'Скопировано!', tooltipSelector = '.tooltip') {
    const tooltip = btn.querySelector(tooltipSelector);
    if (tooltip) {
        const originalText = tooltip.textContent;
        tooltip.textContent = successText;
        setTimeout(() => { tooltip.textContent = originalText; }, CONFIG.COPY_TOOLTIP_DURATION);
    }
}

function setupCopyButton(selector, text) {
    const btn = document.querySelector(selector);
    if (!btn) return;
    if (btn.dataset.copyInitialized) return;
    btn.dataset.copyInitialized = 'true';
    btn.addEventListener('click', () => {
        copyToClipboard(text);
        showCopyFeedback(btn);
    });
}

function setupGlobalCopyOnClick() {
    const SELECTORS = '.result-text, .link-card__href, .link-card__anchor, .image-item__src a, .dropdown__item_result';
    document.addEventListener('click', (e) => {
        const target = e.target.closest(SELECTORS);
        if (!target) return;
        if (target.tagName === 'A' && e.target.tagName === 'A') return;
        const text = target.textContent.trim();
        if (!text || text.length < 2) return;
        copyToClipboard(text);
        showCopyFlash(target);
    });
}

function showCopyFlash(el) {
    el.classList.add('copied');
    setTimeout(() => el.classList.remove('copied'), CONFIG.COPY_TOOLTIP_DURATION);

    const existing = document.querySelector('.copy-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = 'Скопировано';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('copy-toast--visible'));
    setTimeout(() => {
        toast.classList.remove('copy-toast--visible');
        setTimeout(() => toast.remove(), 200);
    }, CONFIG.COPY_TOAST_DURATION);
}

function showError(msg) {
    const firstResult = document.querySelector('#title .result');
    if (firstResult) firstResult.innerHTML = `<span class="empty-value">${escHtml(msg)}</span>`;
}

function setLoadingState() {
    document.querySelectorAll('.result').forEach(el => {
        if (!el.querySelector('.copy-icon') && !el.querySelector('img')) {
            el.innerHTML = '<span class="empty-value">Загрузка...</span>';
        }
    });
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escAttr(str) {
    return escHtml(str || '');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPageTextForAi() {
    if (!globalTab?.id) return '';
    try {
        await ensureContentScriptLoaded(globalTab.id);
        const response = await sendMessageWithTimeout(globalTab.id, { action: 'getPageText' }, CONFIG.MESSAGE_TIMEOUT);
        return response?.text || '';
    } catch {
        return '';
    }
}

function isPrivateIpv4Hostname(hostname) {
    const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) return false;

    const parts = match.slice(1).map(Number);
    if (parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) return false;

    const [a, b] = parts;
    return (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    );
}

function isSensitiveAiHost(hostname) {
    if (!hostname) return true;

    const normalizedHost = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
    if (!normalizedHost) return true;

    if (normalizedHost === 'localhost' || normalizedHost.endsWith('.localhost')) return true;
    if (isPrivateIpv4Hostname(normalizedHost)) return true;
    if (normalizedHost === '::1' || normalizedHost.startsWith('fe80:')) return true;
    if (normalizedHost.startsWith('fc') || normalizedHost.startsWith('fd')) return true;
    if (!normalizedHost.includes('.') && !normalizedHost.includes(':')) return true;

    return ['.local', '.internal', '.intra', '.lan', '.home', '.corp', '.test'].some(suffix =>
        normalizedHost.endsWith(suffix)
    );
}

function ensureAiAllowedForCurrentPage() {
    if (sensitiveAiConsentGranted) return true;
    if (!globalUrl) return true;

    let currentUrl;
    try {
        currentUrl = new URL(globalUrl);
    } catch {
        return true;
    }

    const isSensitiveOrigin = currentUrl.protocol === 'file:' || isSensitiveAiHost(currentUrl.hostname);
    if (!isSensitiveOrigin) return true;

    const readableTarget = currentUrl.protocol === 'file:'
        ? 'локального файла'
        : currentUrl.host || currentUrl.hostname || currentUrl.href;
    const confirmed = window.confirm(
        `AI-анализ для ${readableTarget} отправит текст страницы во внешний AI proxy.\n\n` +
        'Подтвердите отправку только если страница не содержит приватные, служебные или внутренние данные.'
    );

    if (confirmed) {
        sensitiveAiConsentGranted = true;
    }

    return confirmed;
}

async function runAiActionRequest(actionType, options = {}) {
    if (!ensureAiAllowedForCurrentPage()) {
        return {
            success: false,
            error: 'AI-анализ для локальных и внутренних адресов требует явного подтверждения.'
        };
    }

    const focusKeyword = typeof options.focusKeyword === 'string' ? options.focusKeyword.trim() : '';
    const pageText = await getPageTextForAi();
    if (!pageText) {
        return { success: false, error: 'Не удалось получить текст страницы' };
    }

    let requestText = pageText;
    if (actionType === 'generateMetaTags') {
        const parts = [];
        if (focusKeyword) {
            parts.push(`Основной ключ для мета-тегов: ${focusKeyword}`);
            parts.push(`Используй этот ключ как главный фокус для title и description, если это не противоречит содержанию страницы.`);
        }
        const serp = options.serpData;
        if (serp && (serp.googleItems?.length || serp.yandexItems?.length)) {
            parts.push(`\nТитулы конкурентов из топ выдачи по запросу «${serp.query || focusKeyword}» — используй для выбора конкурентного угла и оптимальной длины title:`);
            if (serp.googleItems?.length) {
                parts.push('Google:');
                serp.googleItems.forEach(i => parts.push(`  ${i.position}. ${i.title} (${(i.title||'').length} симв.)`));
            }
            if (serp.yandexItems?.length) {
                parts.push('Яндекс:');
                serp.yandexItems.forEach(i => parts.push(`  ${i.position}. ${i.title} (${(i.title||'').length} симв.)`));
            }
        }
        parts.push(`\nКонтент страницы:\n${pageText}`);
        requestText = parts.join('\n');
    }

    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: actionType,
            text: requestText,
            url: globalUrl,
            focusKeyword
        }, (response) => {
            resolve(response || { success: false, error: 'Ошибка запроса к API' });
        });
    });
}

function setExternalLink(el, href, text, title = '') {
    if (!el) return;
    el.textContent = text || href || '';

    try {
        const safeUrl = new URL(href);
        el.href = safeUrl.href;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
        if (title) el.title = title;
    } catch {
        el.removeAttribute('href');
        el.removeAttribute('target');
        el.removeAttribute('rel');
        el.removeAttribute('title');
    }
}
