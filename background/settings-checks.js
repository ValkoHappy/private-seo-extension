export class SettingsChecks {
    constructor(browser) {
        this.browser = browser;
    }
    handle(request, sendResponse) {
        const chrome = this.browser;
        if (request.action === 'getJsSetting') {
            chrome.contentSettings.javascript.get({ primaryUrl: `${request.origin}/` }, (details) =>
                sendResponse({ setting: details.setting })
            );
            return true;
        }

        if (request.action === 'setJsSetting') {
            chrome.contentSettings.javascript.set(
                {
                    primaryPattern: `${request.origin}/*`,
                    setting: request.enabled ? 'allow' : 'block'
                },
                () => sendResponse({ ok: true })
            );
            return true;
        }
        return false;
    }
}
