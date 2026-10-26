function fillPageTab(urlObj) {
    const fullUrl = globalUrl;
    const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
    const yandexHostId = `${urlObj.protocol}//${urlObj.hostname}:${port}`.replace('//', '');

    // PageSpeed
    setLink('#openGooglePageSpeed a',
        `https://pagespeed.web.dev/report?url=${encodeURIComponent(fullUrl)}`);
    setLink('#openGoogleMobileFriendlyTest a',
        `https://pagespeed.web.dev/report?url=${encodeURIComponent(fullUrl)}&strategy=mobile`);

    // Toggle buttons инициализируются в setupToolsToggles
    // Все подсветки теперь работают через chrome.scripting.executeScript

    // Yandex reindex
    const yandexReindex = document.getElementById('yandexPereobhod');
    if (yandexReindex) {
        yandexReindex.addEventListener('click', () => {
            copyToClipboard(fullUrl);
            chrome.tabs.create({
                url: `https://webmaster.yandex.ru/sites/add/?hostId=${encodeURIComponent(yandexHostId)}`
            });
        });
    }

    // Yandex server response check
    const yandexServer = document.getElementById('yandexServerResonse');
    if (yandexServer) {
        yandexServer.addEventListener('click', () => {
            chrome.tabs.create({
                url: `https://webmaster.yandex.ru/tools/server-response/?url=${encodeURIComponent(fullUrl)}&user-agent=robot`
            });
        });
    }

    // Text statistics
    const showTextBtn = document.getElementById('showTextInfo');
    if (showTextBtn) {
        let loaded = false;
        showTextBtn.addEventListener('click', () => {
            const dd = showTextBtn.closest('.tabs-content__row_dropdown')?.querySelector('.dropdown');
            if (dd) {
                dd.classList.toggle('active');
                const icon = showTextBtn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-chevron-down');
                    icon.classList.toggle('fa-chevron-up');
                }
            }
            if (!loaded) {
                loaded = true;
                loadTextStats();
            }
        });
    }
}



function loadTextStats() {
    sendMessageWithTimeout(globalTab.id, { action: 'getTextStats' }, CONFIG.MESSAGE_TIMEOUT)
        .then(res => {
            if (!res) return;

            const el = (id) => document.querySelector(`#${id} .dropdown__item_result`);

            if (el('charactersWords')) el('charactersWords').textContent = res.totalWords || 0;
            if (el('characters')) el('characters').textContent = res.totalCharsNoSpace || 0;

            if (el('words_without_a')) el('words_without_a').innerHTML =
                formatWordList(res.top10Words);
            if (el('bigrammes')) el('bigrammes').innerHTML =
                formatWordList(res.top10Bigrams);
            if (el('words_with_alt')) el('words_with_alt').innerHTML =
                formatWordList(res.top10AltTitle);
            if (el('ankors')) el('ankors').innerHTML =
                formatWordList(res.top10Anchors);
        })
        .catch(() => {});
}

function formatWordList(items) {
    if (!items || !items.length) return '<span class="empty-value">Нет данных</span>';
    return items.map(({ word, count, density }) =>
        `<div class="word-stat-item"><span class="word-stat-word">${escHtml(word)}</span> <span class="word-stat-count">(${count}${density ? '/' + density : ''})</span></div>`
    ).join('');
}

// ================================================================
// TAB 4: LINKS
// ================================================================
