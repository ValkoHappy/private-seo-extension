const SERP_RESULT_LIMIT = 5;
const SERP_TIMEOUT_MS = 20000;
function buildSerpUrl(query, engine) {
    const encodedQuery = encodeURIComponent(query);
    if (engine === 'yandex') {
        return `https://yandex.ru/search/?text=${encodedQuery}&lr=213`;
    }
    return `https://www.google.com/search?q=${encodedQuery}&hl=ru&num=10&pws=0`;
}

function waitForTabLoadComplete(chrome, tabId, timeoutMs = SERP_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(handleUpdated);
            reject(new Error('Истекло время ожидания загрузки SERP.'));
        }, timeoutMs);

        function handleUpdated(updatedTabId, info) {
            if (updatedTabId !== tabId || info.status !== 'complete') return;
            clearTimeout(timeoutId);
            chrome.tabs.onUpdated.removeListener(handleUpdated);
            resolve();
        }

        chrome.tabs.onUpdated.addListener(handleUpdated);
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractSerpTitles(engine, limit) {
    const isHttpUrl = (url) => /^https?:\/\//i.test(url || '');
    const normalizeText = (value) =>
        String(value || '')
            .replace(/\s+/g, ' ')
            .trim();
    const items = [];
    const seen = new Set();

    const pushItem = (title, url) => {
        const cleanTitle = normalizeText(title);
        const cleanUrl = String(url || '').trim();
        if (!cleanTitle || !isHttpUrl(cleanUrl)) return;
        if (cleanUrl.includes('google.com/search') || cleanUrl.includes('yandex.ru/search')) return;
        const key = `${cleanTitle}::${cleanUrl}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({
            position: items.length + 1,
            title: cleanTitle,
            url: cleanUrl
        });
    };

    if (engine === 'yandex') {
        // <span class="OrganicTitleContentSpan organic__title"> holds the title text
        document.querySelectorAll('.OrganicTitleContentSpan').forEach((span) => {
            if (items.length >= limit) return;
            const anchor = span.closest('a[href]') || span.closest('h2')?.querySelector('a[href]');
            if (!anchor) return;
            pushItem(span.textContent, anchor.href);
        });
    } else {
        // Google: <a class="zReHs" href="..."><h3 class="LC20lb ...">Title</h3></a>
        const titleNodes = document.querySelectorAll('h3.LC20lb');
        if (titleNodes.length) {
            titleNodes.forEach((h3) => {
                if (items.length >= limit) return;
                const anchor = h3.closest('a[href]');
                if (!anchor) return;
                pushItem(h3.textContent, anchor.href);
            });
        } else {
            // Fallback if Google changes markup
            document.querySelectorAll('a[href]').forEach((anchor) => {
                if (items.length >= limit) return;
                const h3 = anchor.querySelector('h3');
                if (!h3) return;
                pushItem(h3.textContent, anchor.href);
            });
        }
    }

    return items.slice(0, limit);
}
export { buildSerpUrl, waitForTabLoadComplete, sleep, extractSerpTitles, SERP_RESULT_LIMIT };
