import {
    buildSerpUrl,
    waitForTabLoadComplete,
    sleep,
    extractSerpTitles,
    SERP_RESULT_LIMIT
} from './search-client.js';

export class SearchChecks {
    constructor(browser) {
        this.browser = browser;
    }
    handle(request, sendResponse) {
        const chrome = this.browser;
        if (request.action === 'fetchSerpTitles') {
            const query = String(request.query || '').trim();
            const engine = request.engine === 'yandex' ? 'yandex' : 'google';

            if (!query) {
                sendResponse({ success: false, error: 'Пустой поисковый запрос.' });
                return true;
            }

            let serpTabId = null;

            (async () => {
                try {
                    const tab = await chrome.tabs.create({
                        url: buildSerpUrl(query, engine),
                        active: false
                    });
                    serpTabId = tab.id;

                    await waitForTabLoadComplete(chrome, serpTabId);
                    await sleep(1200);

                    const [result] = await chrome.scripting.executeScript({
                        target: { tabId: serpTabId },
                        func: extractSerpTitles,
                        args: [engine, SERP_RESULT_LIMIT]
                    });

                    const items = Array.isArray(result?.result) ? result.result : [];
                    if (!items.length) {
                        sendResponse({
                            success: false,
                            error: 'Не удалось распознать organic title в выдаче. Возможно, поисковик показал капчу или изменил вёрстку.'
                        });
                        return;
                    }

                    sendResponse({ success: true, items });
                } catch (error) {
                    sendResponse({
                        success: false,
                        error: error?.message || 'Ошибка при сборе SERP.'
                    });
                } finally {
                    if (serpTabId) {
                        chrome.tabs.remove(serpTabId).catch(() => {});
                    }
                }
            })();

            return true;
        }
        return false;
    }
}
