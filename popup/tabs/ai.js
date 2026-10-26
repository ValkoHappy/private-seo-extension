function stripMarkdown(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** в†’ bold
        .replace(/\*(.+?)\*/g, '$1')        // *italic* в†’ italic
        .replace(/#{1,6} /g, '')            // # headers
        .replace(/`(.+?)`/g, '$1')          // `code` в†’ code
        .trim();
}

// ----------------------------------------------------------------
// AI cache — persist results across popup open/close (per page URL)
// ----------------------------------------------------------------
function aiCacheKey() {
    return `aiCache_${globalUrl || ''}`;
}

function saveAiCache(patch) {
    const key = aiCacheKey();
    chrome.storage.session.get(key, (stored) => {
        const prev = stored[key] || {};
        chrome.storage.session.set({ [key]: { ...prev, ...patch } });
    });
}

function loadAiCache(cb) {
    chrome.storage.session.get(aiCacheKey(), (stored) => {
        cb(stored[aiCacheKey()] || {});
    });
}

function applyAiCache(cache, { metaResult, serpResult, intentResult, spamResult, focusKeywordInput }) {
    if (cache.keyword && focusKeywordInput) {
        focusKeywordInput.value = cache.keyword;
    }
    if (cache.meta) {
        document.getElementById('aiTabTitle').textContent       = cache.meta.title || '';
        document.getElementById('aiTabDescription').textContent = cache.meta.description || '';
        document.getElementById('aiTabTitleChars').textContent  = cache.meta.title ? `${cache.meta.title.length} симв.` : '';
        document.getElementById('aiTabDescChars').textContent   = cache.meta.description ? `${cache.meta.description.length} симв.` : '';
        metaResult.style.display = 'flex';
    }
    if (cache.intent) {
        document.getElementById('aiTabIntentContent').textContent = cache.intent.text || '';
        intentResult.style.display = 'flex';
    }
    if (cache.spam) {
        document.getElementById('aiTabSpamContent').textContent = cache.spam.text || '';
        spamResult.style.display = 'flex';
    }
    if (cache.serp) {
        renderSerpComparison(cache.serp);
        serpResult.style.display = 'flex';
    }
}

function setupAiTab() {
    const btnReview = document.getElementById('aiBtnReview');
    const btnMeta   = document.getElementById('aiBtnMeta');
    const btnIntent = document.getElementById('aiBtnIntent');
    const btnSpam   = document.getElementById('aiBtnSpam');
    const btnAll    = document.getElementById('aiBtnAll');
    const btnSerp   = document.getElementById('aiBtnSerp');
    const focusKeywordInput = document.getElementById('aiMetaFocusKeyword');
    if (!btnMeta) return;

    const loader       = document.getElementById('aiTabLoader');
    const loaderText   = document.getElementById('aiTabLoaderText');
    const errorEl      = document.getElementById('aiTabError');
    const metaResult   = document.getElementById('aiTabMetaResult');
    const serpResult   = document.getElementById('aiTabSerpResult');
    const intentResult = document.getElementById('aiTabIntentResult');
    const spamResult   = document.getElementById('aiTabSpamResult');

    // Restore previous results for this page
    loadAiCache((cache) => applyAiCache(cache, { metaResult, serpResult, intentResult, spamResult, focusKeywordInput }));

    const setLoading = (on, text = 'Обработка запроса...') => {
        loader.style.display = on ? 'flex' : 'none';
        loaderText.textContent = text;
        [btnReview, btnMeta, btnIntent, btnSpam, btnAll, btnSerp].forEach(b => { if (b) b.disabled = on; });
    };

    const showError = (msg) => {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    };

    const runAction = (actionType) => new Promise((resolve) => {
        const focusKeyword = actionType === 'generateMetaTags'
            ? (focusKeywordInput?.value || '').trim()
            : '';
        loadAiCache((cache) => {
            runAiActionRequest(actionType, { focusKeyword, serpData: cache.serp || null }).then(resolve);
        });
    });

    const renderMetaResult = (title, description, shouldSave = false) => {
        document.getElementById('aiTabTitle').textContent = title || '';
        document.getElementById('aiTabDescription').textContent = description || '';
        document.getElementById('aiTabTitleChars').textContent = title ? `${title.length} симв.` : '';
        document.getElementById('aiTabDescChars').textContent = description ? `${description.length} симв.` : '';
        metaResult.style.display = 'flex';
        if (shouldSave) {
            saveAiCache({
                meta: { title: title || '', description: description || '' },
                keyword: focusKeywordInput?.value || ''
            });
        }
    };

    const renderIntentResult = (text, shouldSave = false) => {
        const cleanText = stripMarkdown(text || '');
        document.getElementById('aiTabIntentContent').textContent = cleanText;
        intentResult.style.display = 'flex';
        if (shouldSave) {
            saveAiCache({ intent: { text: cleanText } });
        }
        return cleanText;
    };

    const renderSpamResult = (text, shouldSave = false) => {
        const cleanText = stripMarkdown(text || '');
        document.getElementById('aiTabSpamContent').textContent = cleanText;
        spamResult.style.display = 'flex';
        if (shouldSave) {
            saveAiCache({ spam: { text: cleanText } });
        }
        return cleanText;
    };

    const handleSingle = async (actionType) => {
        errorEl.style.display = 'none';
        setLoading(true);
        const resp = await runAction(actionType);
        setLoading(false);
        if (!resp?.success) { showError(resp?.error || 'Ошибка API'); return; }

        if (actionType === 'generateMetaTags') {
            renderMetaResult(resp.title || '', resp.description || '', true);
        } else if (actionType === 'analyzeIntent') {
            renderIntentResult(resp.text || '', true);
        } else {
            renderSpamResult(resp.text || '', true);
        }
    };

    const handleAll = async () => {
        errorEl.style.display = 'none';
        metaResult.style.display   = 'none';
        // serpResult intentionally not cleared — SERP is a separate action
        intentResult.style.display = 'none';
        spamResult.style.display   = 'none';

        setLoading(true, 'Оцениваю страницу, интент и переспам (1/2)...');
        const overviewResp = await runOverviewAiReview({ showOwnLoader: false });
        let intentOk = false;
        let spamOk = false;
        if (overviewResp?.success) {
            renderIntentResult(overviewResp.intentText || '', true);
            renderSpamResult(overviewResp.spamText || '', true);
            intentOk = true;
            spamOk = true;
        }

        setLoading(true, 'Генерирую мета-теги (2/2)...');
        const metaResp = await runAction('generateMetaTags');
        if (metaResp?.success) {
            renderMetaResult(metaResp.title || '', metaResp.description || '', true);
        }

        setLoading(false);
        if (!metaResp?.success && !intentOk && !spamOk) {
            showError('Все запросы завершились с ошибкой. Проверьте консоль.');
        }
    };

    const handleSerp = async () => {
        const query = (focusKeywordInput?.value || '').trim();
        if (!query) {
            showError('Введите основной ключ, чтобы собрать SERP для сравнения.');
            return;
        }

        errorEl.style.display = 'none';
        setLoading(true, 'Собираю top title в Google и Яндексе...');

        const [googleResponse, yandexResponse] = await Promise.all([
            sendRuntimeMessageAsync({
                action: 'fetchSerpTitles',
                query,
                engine: 'google'
            }),
            sendRuntimeMessageAsync({
                action: 'fetchSerpTitles',
                query,
                engine: 'yandex'
            })
        ]);

        setLoading(false);

        if (!googleResponse?.success && !yandexResponse?.success) {
            showError(googleResponse?.error || yandexResponse?.error || 'Не удалось получить данные SERP.');
            return;
        }

        const serpData = {
            query,
            googleItems: googleResponse?.success ? (googleResponse.items || []) : [],
            yandexItems: yandexResponse?.success ? (yandexResponse.items || []) : [],
            googleError: googleResponse?.success ? '' : (googleResponse?.error || ''),
            yandexError: yandexResponse?.success ? '' : (yandexResponse?.error || '')
        };
        renderSerpComparison(serpData);
        serpResult.style.display = 'flex';
        saveAiCache({ serp: serpData, keyword: query });
    };

    if (btnReview) btnReview.addEventListener('click', () => runOverviewAiReview());
    btnMeta.addEventListener('click',   () => handleSingle('generateMetaTags'));
    btnIntent.addEventListener('click', () => handleSingle('analyzeIntent'));
    btnSpam.addEventListener('click',   () => handleSingle('analyzeSpam'));
    btnAll.addEventListener('click',    () => handleAll());
    if (btnSerp) btnSerp.addEventListener('click', () => handleSerp());

    // Save keyword as user types
    if (focusKeywordInput) {
        let kTimer;
        focusKeywordInput.addEventListener('input', () => {
            clearTimeout(kTimer);
            kTimer = setTimeout(() => saveAiCache({ keyword: focusKeywordInput.value }), 600);
        });
    }

    const useTitleBtn = document.getElementById('aiUseTitleAsKey');
    if (useTitleBtn) {
        useTitleBtn.addEventListener('click', () => {
            const title = document.getElementById('aiTabTitle')?.textContent?.trim();
            if (!title || !focusKeywordInput) return;
            focusKeywordInput.value = title;
            focusKeywordInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            focusKeywordInput.focus();
            useTitleBtn.textContent = '✓ Ключ установлен — нажми «Посмотреть SERP»';
            useTitleBtn.style.background = '#16a34a';
            setTimeout(() => {
                useTitleBtn.textContent = '🔍 Использовать как ключ для SERP';
                useTitleBtn.style.background = '';
            }, 3000);
        });
    }
}

function renderSerpComparison({ query, googleItems, yandexItems, googleError, yandexError }) {
    const summaryEl = document.getElementById('aiSerpSummary');
    const ownTitleEl = document.getElementById('aiSerpOwnTitle');
    const googleMetaEl = document.getElementById('aiSerpGoogleMeta');
    const yandexMetaEl = document.getElementById('aiSerpYandexMeta');
    const googleListEl = document.getElementById('aiSerpGoogleTitles');
    const yandexListEl = document.getElementById('aiSerpYandexTitles');
    const serpResult = document.getElementById('aiTabSerpResult');
    if (!summaryEl || !ownTitleEl || !googleMetaEl || !yandexMetaEl || !googleListEl || !yandexListEl || !serpResult) return;

    const ownTitle = (document.getElementById('aiTabTitle')?.textContent || '').trim()
        || (document.getElementById('title')?.querySelector('.result-text')?.textContent || '').trim();
    const normalizedQuery = query.trim().toLowerCase();
    const allItems = [...googleItems, ...yandexItems];
    const avgLength = allItems.length
        ? Math.round(allItems.reduce((acc, item) => acc + (item.title || '').length, 0) / allItems.length)
        : 0;
    const keywordLeaders = allItems.filter((item) => (item.title || '').toLowerCase().includes(normalizedQuery)).length;

    summaryEl.textContent = allItems.length
        ? `По запросу «${query}» собрано ${allItems.length} title из двух поисковиков. Средняя длина по выборке: ${avgLength} симв. Ключ встречается у ${keywordLeaders} из ${allItems.length} результатов.`
        : `По запросу «${query}» не удалось распознать title в выдаче.`;
    ownTitleEl.textContent = ownTitle
        ? `Ваш title: ${ownTitle} (${ownTitle.length} симв.)`
        : 'Ваш title пока не сгенерирован — можно сначала подготовить мета-теги, а потом сравнить их с SERP.';

    const renderColumn = (items, listEl, metaEl, errorText) => {
        listEl.replaceChildren();
        if (!items.length) {
            const empty = document.createElement('div');
            empty.className = 'ai-serp-item';
            empty.textContent = errorText || 'Не удалось получить данные из выдачи.';
            listEl.appendChild(empty);
            metaEl.textContent = 'нет данных';
            return;
        }

        const avg = Math.round(items.reduce((acc, item) => acc + (item.title || '').length, 0) / items.length);
        metaEl.textContent = `${items.length} title • ~${avg} симв.`;

        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'ai-serp-item';

            const top = document.createElement('div');
            top.className = 'ai-serp-item__top';

            const position = document.createElement('div');
            position.className = 'ai-serp-item__position';
            position.textContent = `#${item.position}`;

            const length = document.createElement('div');
            length.className = 'ai-serp-item__length';
            length.textContent = `${(item.title || '').length} симв.`;

            const title = document.createElement('div');
            title.className = 'ai-serp-item__title';
            title.textContent = item.title || '—';
            title.title = item.title || '';

            const url = document.createElement('div');
            url.className = 'ai-serp-item__url';
            const link = document.createElement('a');
            // Show only hostname + first path segment
            let shortUrl = item.url || '';
            try {
                const u = new URL(shortUrl);
                const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
                shortUrl = u.hostname + (parts.length ? '/' + parts[0] + (parts.length > 1 ? '/…' : '') : '');
            } catch {}
            setExternalLink(link, item.url || '', shortUrl);
            url.appendChild(link);

            top.appendChild(position);
            top.appendChild(length);
            row.appendChild(top);
            row.appendChild(title);
            row.appendChild(url);
            listEl.appendChild(row);
        });
    };

    renderColumn(googleItems, googleListEl, googleMetaEl, googleError);
    renderColumn(yandexItems, yandexListEl, yandexMetaEl, yandexError);

    serpResult.style.display = 'flex';
}
