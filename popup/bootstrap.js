document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupTabs();
    setupGearButton();
    setupOptionsPanel();
    hardenBlankTargetLinks();
    setupGlobalCopyOnClick();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    globalTab = tab;
    globalUrl = tab.url;

    setupAiTab();

    if (
        !globalUrl ||
        globalUrl.startsWith('chrome://') ||
        globalUrl.startsWith('edge://') ||
        globalUrl.startsWith('chrome-extension://') ||
        globalUrl.startsWith('about:')
    ) {
        showError('Расширение не работает на системных страницах');
        return;
    }

    let urlObj;
    try {
        urlObj = new URL(globalUrl);
    } catch {
        showError('Невозможно разобрать URL страницы');
        return;
    }

    setLoadingState();
    deferredAuditSignalsReady = false;

    function applyPageData(response) {
        globalSeoData = response;
        fillOverviewTab(response, urlObj);
        fillSearchTab(urlObj, response);
        fillLinksTab(response);
        fillImagesTab(response);
        fillMicrodataTab(response, globalUrl);
        fillToolsTab(urlObj);
        fillPageTab(urlObj);
        if (response.trackers) fillTrackers(response.trackers);
    }

    ensureContentScriptLoaded(tab.id)
        .then(() => sendMessageWithTimeout(tab.id, { action: 'getSeoData' }, CONFIG.MESSAGE_TIMEOUT))
        .then((response) => {
            applyPageData(response);
        })
        .catch((err) => {
            showError(`Не удалось загрузить данные страницы: ${err.message}`);
        });

    const serverDataPromise = sendRuntimeMessageAsync({ action: 'fetchServerData', url: globalUrl })
        .then((res) => {
            if (!res) return;
            fillStatusCode(res.status);
            fillRobotsTxt(res.robotsTxt);
            fillXRobotsTag(res.xRobots || '');
        })
        .catch(() => {});

    const sitemapPromise = sendRuntimeMessageAsync({ action: 'checkSitemap', origin: urlObj.origin })
        .then((res) => {
            fillSitemap(res ? res.sitemaps : []);
        })
        .catch(() => {
            fillSitemap([]);
        });

    deferredAuditSignalsPromise = Promise.allSettled([serverDataPromise, sitemapPromise]).finally(() => {
        deferredAuditSignalsReady = true;
    });
}
