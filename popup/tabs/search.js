function fillSearchTab(urlObj, data) {
    const host = urlObj.hostname;
    const fullUrl = globalUrl;
    const pathAndQuery = urlObj.pathname + urlObj.search;
    const title = (data.titles[0] || {}).innerText || '';

    chrome.storage.sync.get(DEFAULT_OPTIONS, (opts) => {
        const queryCurrentYandex = opts.numericalSearchYandex
            ? `url:${host}${pathAndQuery}+|+url:www.${host}${pathAndQuery}`
            : `url:${host}${pathAndQuery}`;
        setLink('#checkSiteYandexCurrentUrl a', `https://yandex.ru/search/?how=tm&text=${queryCurrentYandex}`);

        const queryYandexUrl = opts.numericalSearchYandex
            ? `url:${host}${pathAndQuery}/*+|+url:www.${host}${pathAndQuery}/*+|+url:${host}${pathAndQuery}+|+url:www.${host}${pathAndQuery}`
            : `url:${host}${pathAndQuery}/*+|+url:${host}${pathAndQuery}`;
        setLink('#checkYandexUrl a', `https://yandex.ru/search/?how=tm&text=${queryYandexUrl}`);
    });

    setLink('#checkSiteGoogleCurrentUrl a',
        `https://www.google.ru/search?q=site:${encodeURIComponent(fullUrl)}`);
    setLink('#checkSiteYandexSite a',
        `https://yandex.ru/search/?text=site%3A${host}`);
    setLink('#checkSiteGoogleSite a',
        `https://www.google.ru/search?q=site%3A${host}`);
    setLink('#checkHostYandexSite a',
        `https://yandex.ru/search/?text=host%3A${host}`);

    if (title) {
        setLink('#yandexCheckDuplicate a',
            `https://yandex.ru/search/?text=title%3A(%22${encodeURIComponent(title)}%22)%20site%3A${host}`);
    }

    // Maps search
    const mapsRow = document.getElementById('searchMaps');
    if (mapsRow) {
        const links = mapsRow.querySelectorAll('a');
        if (links[0]) links[0].href = `https://yandex.ru/maps/?mode=search&text=${host}`;
        if (links[1]) links[1].href = `https://www.google.com/maps/search/${host}`;
    }

    // Copy all URLs from SERP
    const copyBtn = document.getElementById('yandexCopy');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            sendMessageWithTimeout(globalTab.id, { action: 'getSeoData' }, CONFIG.MESSAGE_TIMEOUT)
                .then(res => {
                    if (!res) return;
                    const urls = (res.aTags || []).map(a => a.hrefFull).filter(Boolean).join('\n');
                    copyToClipboard(urls);
                })
                .catch(() => {});
        });
    }
}

// ================================================================
// TAB 3: PAGE
// ================================================================
