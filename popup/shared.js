// ============================================================
// PrivateSEO — Popup Controller
// Full logic for all 8 tabs
// ============================================================

let globalSeoData = null;
let globalUrl = null;
let globalTab = null;
let allLinksData = [];     // {href, hrefFull, innerText, rel, isExternal, statusCode, protocol}
let allImagesData = [];    // {src, alt, title, width, height}
let checkLinksAbortController = null; // AbortController для отмены проверки ссылок
let deferredAuditSignalsPromise = Promise.resolve();
let deferredAuditSignalsReady = false;
let sensitiveAiConsentGranted = false;
let auditContext = {
    ready: false,
    url: '',
    title: '',
    description: '',
    robots: '',
    xRobots: '',
    canonical: '',
    lang: '',
    hreflangs: [],
    headings: [],
    aTags: [],
    imgTags: [],
    metaTags: {},
    webVitals: null,
    statusCode: null,
    robotsTxtBlocked: false,
    sitemapCount: null
};
let globalAuditIssues = [];

// ================================================================
// Глобальные константы и magic strings
// ================================================================
const CONFIG = {
    MESSAGE_TIMEOUT: 5000,
    COPY_FLASH_DURATION: 2000,
    COPY_TOAST_DURATION: 1200,
    COPY_TOOLTIP_DURATION: 1500,
    CHECK_LINKS_DELAY_DEFAULT: 200,
    CHECK_LINKS_DELAY_MIN: 50,
    MAX_URL_DISPLAY_LENGTH: 60,
    MAX_URL_SHORT_LENGTH: 57,
    MAX_IMAGE_SRC_LENGTH: 55,
    MAX_IMAGE_SRC_SHORT_LENGTH: 52,
    YANDEX_ICS_URL: 'https://webmaster.yandex.ru/sqicounter?theme=light&host=',
    SEO_WEIGHTS: { title: 25, h1: 20, description: 20, https: 10, robots: 10, canonical: 5, lang: 5, sitemap: 5 }
};

// ================================================================
// Утилиты для работы с сообщениями и таймаутами
// ================================================================

/**
 * Отправляет сообщение в content script с таймаутом
 * @param {number} tabId - ID вкладки
 * @param {object} message - сообщение для отправки
 * @param {number} timeout - таймаут в мс (по умолчанию 5000)
 * @returns {Promise<any>} -  Отправляет сообщение в content script
 */
function sendMessageWithTimeout(tabId, message, timeout = CONFIG.MESSAGE_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Таймаут ожидания ответа от страницы'));
        }, timeout);
        chrome.tabs.sendMessage(tabId, message, (response) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

function sendRuntimeMessageAsync(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(response);
        });
    });
}

async function waitForDeferredAuditSignals(timeout = 4000) {
    if (deferredAuditSignalsReady) return;

    let timeoutId = null;
    await Promise.race([
        deferredAuditSignalsPromise.catch(() => {}),
        new Promise((resolve) => {
            timeoutId = setTimeout(resolve, timeout);
        })
    ]);
    if (timeoutId) clearTimeout(timeoutId);
}

/**
 * Проверяет загружен ли content script, если нет — инжектирует его
 * @param {number} tabId - ID вкладки
 * @returns {Promise<void>}
 */
async function ensureContentScriptLoaded(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
            if (!chrome.runtime.lastError && response && response.pong) {
                resolve(); // Content script СѓР¶Рµ Р·Р°РіСЂСѓР¶РµРЅ
                return;
            }
            chrome.scripting.executeScript(
                { target: { tabId }, files: ['content.js'] },
                () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Не удалось загрузить content script'));
                    } else {
                        setTimeout(() => resolve(), 100); // Даём время на инициализацию
                    }
                }
            );
        });
    });
}

// Отменяем проверку ссылок при закрытии popup
window.addEventListener('unload', () => {
    checkLinksAbortController?.abort();
});

// ================================================================
// INIT
// ================================================================
function hardenBlankTargetLinks(root = document) {
    root.querySelectorAll('a[target="_blank"]').forEach((link) => {
        link.rel = 'noopener noreferrer';
    });
}

// ================================================================
// TABS
// ================================================================
