// ============================================================
// PrivateSEO — Content Script
// Extracts all SEO data from the active page
// ============================================================

// Проверка флага инициализации — предотвращает утечку памяти
// при повторной инъекции скрипта
if (window.__seoPluginInitialized) {
    // скрипт уже загружен, не регистрируем слушатели повторно
} else {
    window.__seoPluginInitialized = true;

    // --- Core Web Vitals Tracking ---
    window.__seoPluginVitals = { lcp: 0, cls: 0, ttfb: 0 };
    try {
        new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) window.__seoPluginVitals.ttfb = entries[0].responseStart;
        }).observe({ type: 'navigation', buffered: true });

        new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) window.__seoPluginVitals.lcp = lastEntry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) window.__seoPluginVitals.cls += entry.value;
            }
        }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action;

    // Обработка ping — позволяет popup проверить что content script загружен
    if (action === 'ping') {
        sendResponse({ pong: true });
        return;
    }

    if (action === 'getSeoData') {
        try {
            sendResponse(parseSeoData());
        } catch (error) {
            sendResponse(buildEmptySeoData(error));
        }
        return false;
    }

    if (action === 'getTextStats') {
        try {
            sendResponse(getTextStats());
        } catch (error) {
            sendResponse({
                totalWords: 0,
                totalCharsNoSpace: 0,
                top10Words: [],
                top10Bigrams: [],
                top10AltTitle: [],
                top10Anchors: [],
                __parseError: error?.message || 'Failed to parse text stats'
            });
        }
        return false;
    }

    if (action === 'getPageText') {
        try {
            sendResponse({ text: getPageText() });
        } catch (error) {
            sendResponse({
                text: '',
                __parseError: error?.message || 'Failed to extract page text'
            });
        }
        return false;
    }
});

function getNodeText(node) {
    if (!node) return '';
    const raw = typeof node.innerText === 'string' ? node.innerText : node.textContent;
    return (raw || '').trim();
}

function buildEmptySeoData(error) {
    return {
        titles: [],
        metaTags: {},
        canonicals: [],
        hreflangs: [],
        lang: '',
        headings: [],
        aTags: [],
        imgTags: [],
        trackers: {
            yandexMetrika: false,
            googleAnalytics: false,
            googleTagManager: false,
            vkPixel: false,
            facebookPixel: false
        },
        jsonLd: [],
        webVitals: window.__seoPluginVitals || { lcp: 0, cls: 0, ttfb: 0 },
        __parseError: error?.message || 'Failed to parse SEO data'
    };
}

// ----------------------------------------------------------------
// Main SEO data extraction
// ----------------------------------------------------------------
function parseSeoData() {
    const host = window.location.hostname;
    const origin = window.location.origin;

    // --- Titles ---
    const titleEls = document.head ? document.head.querySelectorAll('title') : [];
    const titles = [...titleEls].map(el => ({
        nodeName: 'title',
        innerText: getNodeText(el),
        isFromHead: document.head ? document.head.contains(el) : false
    }));

    // --- Meta tags (all of them) ---
    const metaTags = {};
    document.querySelectorAll('meta').forEach(meta => {
        const name = (meta.getAttribute('name') || meta.getAttribute('property') || '').toLowerCase();
        const content = meta.getAttribute('content') || '';
        if (!name) return;
        if (!metaTags[name]) metaTags[name] = [];
        metaTags[name].push({ content });
    });

    // --- Canonicals & hreflangs ---
    const canonicals = [];
    const hreflangs = [];
    document.querySelectorAll('link[rel]').forEach(link => {
        const rel = link.getAttribute('rel') || '';
        if (rel === 'canonical') {
            canonicals.push({ hreflang: '', href: link.getAttribute('href') || '' });
        }
        if (rel === 'alternate') {
            const hl = link.getAttribute('hreflang');
            if (hl) hreflangs.push({ hreflang: hl, href: link.getAttribute('href') || '' });
        }
    });

    // --- Lang ---
    const lang = document.documentElement.getAttribute('lang') || '';

    // --- Headings ---
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(el => ({
        nodeName: el.nodeName,
        textContent: getNodeText(el)
    }));

    // --- Links ---
    const aTags = [...document.querySelectorAll('a[href]')].reduce((acc, a) => {
        try {
            const href = a.getAttribute('href') || '';
            // Skip data: and javascript: hrefs
            if (/^(javascript|data|mailto|tel):/i.test(href)) return acc;
            let hrefFull = '';
            let isExternal = false;
            try {
                const u = new URL(href, origin);
                hrefFull = u.href;
                isExternal = u.hostname !== host && u.hostname !== '';
            } catch (e) {}
            acc.push({
                href,
                hrefFull,
                innerText: getNodeText(a).slice(0, 200),
                rel: a.getAttribute('rel') || '',
                isExternal
            });
        } catch (e) {}
        return acc;
    }, []);

    // --- Images ---
    const imgTags = [...document.querySelectorAll('img')].reduce((acc, img) => {
        try {
            const src = img.getAttribute('src') || '';
            if (src.startsWith('data:')) return acc; // skip inline base64 (huge)
            acc.push({
                src,
                alt: img.getAttribute('alt'),   // null if missing, '' if empty
                title: img.getAttribute('title') || '',
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height
            });
        } catch (e) {}
        return acc;
    }, []);

    // --- Trackers detection ---
    const allScripts = [...document.querySelectorAll('script')]
        .map(s => (s.src || '') + ' ' + (s.textContent || '')).join(' ');
    const trackers = {
        yandexMetrika: /mc\.yandex\.ru\/metrika|ym\(|yaCounter/i.test(allScripts),
        googleAnalytics: /google-analytics\.com\/analytics|gtag\(|UA-\d{5,}/i.test(allScripts),
        googleTagManager: /googletagmanager\.com\/gtm|GTM-[A-Z0-9]+/i.test(allScripts),
        vkPixel: /vk\.com\/js\/api\/openapi|VK\.Retargeting/i.test(allScripts),
        facebookPixel: /connect\.facebook\.net|fbq\(/i.test(allScripts)
    };

    // --- JSON-LD ---
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map(el => {
        try {
            return { success: true, data: JSON.parse(el.textContent || el.innerText || '') };
        } catch (e) {
            return { success: false, raw: el.textContent || el.innerText || '' };
        }
    });

    return {
        titles,
        metaTags,
        canonicals,
        hreflangs,
        lang,
        headings,
        aTags,
        imgTags,
        trackers,
        jsonLd,
        webVitals: window.__seoPluginVitals || { lcp: 0, cls: 0, ttfb: 0 }
    };
}

// ----------------------------------------------------------------
// Text statistics (word freq, bigrams, etc.)
// ----------------------------------------------------------------
function getTextStats() {
    const host = window.location.hostname;

    // Collect anchor texts for internal links (to exclude from body text)
    const internalAnchorTexts = [];
    const anchorWordFreq = {};
    document.querySelectorAll('a[href]').forEach(a => {
        try {
            const u = new URL(a.getAttribute('href') || '', window.location.origin);
            const isInternal = u.hostname === host || a.getAttribute('href').startsWith('/');
            const text = getNodeText(a);
            if (text) {
                internalAnchorTexts.push(text);
                if (isInternal) {
                    tokenize(text).forEach(w => {
                        anchorWordFreq[w] = (anchorWordFreq[w] || 0) + 1;
                    });
                }
            }
        } catch (e) {}
    });

    // Body text excluding links, scripts, styles
    const bodyClone = document.body.cloneNode(true);
    bodyClone.querySelectorAll('script,style,noscript,a').forEach(el => el.remove());
    const bodyText = bodyClone.innerText || bodyClone.textContent || '';

    const words = tokenize(bodyText);
    const totalWords = words.length;
    const totalCharsNoSpace = bodyText.replace(/\s+/g, '').length;

    // Word frequency
    const wordFreq = {};
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });

    // Top 10 words
    const top10Words = topN(wordFreq, 10, totalWords);

    // Bigrams
    const bigramFreq = {};
    for (let i = 0; i < words.length - 1; i++) {
        const bg = words[i] + ' ' + words[i + 1];
        bigramFreq[bg] = (bigramFreq[bg] || 0) + 1;
    }
    const top10Bigrams = topN(bigramFreq, 10, totalWords - 1);

    // Alt + title words from images
    const altTitleFreq = {};
    document.querySelectorAll('img').forEach(img => {
        const alt = img.getAttribute('alt') || '';
        const title = img.getAttribute('title') || '';
        tokenize(alt + ' ' + title).forEach(w => {
            altTitleFreq[w] = (altTitleFreq[w] || 0) + 1;
        });
    });
    const top10AltTitle = topN(altTitleFreq, 10, null);

    // Top 10 internal anchor words
    const top10Anchors = topN(anchorWordFreq, 10, null);

    return {
        totalWords,
        totalCharsNoSpace,
        top10Words,
        top10Bigrams,
        top10AltTitle,
        top10Anchors
    };
}

function getPageText() {
    if (!document.body) return '';
    const bodyClone = document.body.cloneNode(true);
    bodyClone.querySelectorAll('script,style,nav,header,footer,aside,[role="navigation"]').forEach(el => el.remove());
    return (bodyClone.innerText || bodyClone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 5000);
}

const STOP_WORDS = new Set([
    'и','в','на','с','по','из','к','от','за','не','что','как','это','то',
    'а','но','или','же','бы','ли','уже','еще','еще','о','об','при','для',
    'до','после','без','со','во','ни','нет','да','так','вот','чем','тем',
    'он','она','оно','они','мы','вы','я','ты','его','её','им','их','мне',
    'меня','тебя','себя','нас','вас','их','все','всё','всех','всем',
    'the','a','an','is','are','was','were','be','been','being','have','has',
    'had','do','does','did','will','would','could','should','may','might',
    'to','of','in','for','on','with','at','by','from','as','or','and',
    'but','not','this','that','it','its','i','you','he','she','we','they'
]);

function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^а-яёa-z0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function topN(freq, n, total) {
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([word, count]) => ({
            word,
            count,
            density: total ? ((count / total) * 100).toFixed(2) + '%' : ''
        }));
}

// Закрывающая скобка для блока проверки флага инициализации
}
