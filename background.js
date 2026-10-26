import { AiProxyClient } from './background/ai-proxy-client.js';
import { NetworkChecks } from './background/network-checks.js';
import { AiChecks } from './background/ai-checks.js';
import { SearchChecks } from './background/search-checks.js';
import { SettingsChecks } from './background/settings-checks.js';
import { AI_PROXY_URL } from './background/config.js';

const handlers = [
    new NetworkChecks(),
    new AiChecks(new AiProxyClient(AI_PROXY_URL)),
    new SearchChecks(chrome),
    new SettingsChecks(chrome)
];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !request || typeof request.action !== 'string')
        return false;
    for (const handler of handlers) {
        try {
            if (handler.handle(request, sendResponse)) return true;
        } catch (error) {
            sendResponse({ success: false, error: error.message });
            return false;
        }
    }
    return false;
});
