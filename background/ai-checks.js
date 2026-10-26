import { isValidUrl } from './network-client.js';

export class AiChecks {
    constructor(ai) {
        this.ai = ai;
    }
    handle(request, sendResponse) {
        const fetchAiProxy = (payload, timeout) => this.ai.request(payload, timeout);
        if (request.action === 'generateMetaTags') {
            const { text, url, focusKeyword } = request;

            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                sendResponse({ success: false, error: 'Текст не может быть пустым' });
                return true;
            }

            if (!url || !isValidUrl(url)) {
                sendResponse({ success: false, error: 'Некорректный URL страницы' });
                return true;
            }

            fetchAiProxy({ action: 'generateMetaTags', text, url, focusKeyword }, 30000)
                .then((data) => {
                    if (!data.success) {
                        sendResponse({
                            success: false,
                            error: data.error || 'AI proxy returned an error'
                        });
                        return;
                    }

                    sendResponse({
                        success: true,
                        title: data.title || '',
                        description: data.description || ''
                    });
                })
                .catch((err) => {
                    if (err.name === 'AbortError') {
                        sendResponse({
                            success: false,
                            error: 'Превышено время ожидания ответа от AI (30 сек)'
                        });
                    } else {
                        sendResponse({ success: false, error: err.message });
                    }
                });

            return true;
        }

        if (request.action === 'analyzeIntent' || request.action === 'analyzeSpam') {
            const { text, url, title } = request;

            if (!text || text.trim().length === 0) {
                sendResponse({ success: false, error: 'Текст не может быть пустым' });
                return true;
            }

            fetchAiProxy({ action: request.action, text, url, title }, 35000)
                .then((data) => {
                    if (!data.success || !data.text) {
                        sendResponse({
                            success: false,
                            error: data?.error || 'AI proxy returned an empty response'
                        });
                        return;
                    }

                    sendResponse({ success: true, text: data.text.trim() });
                })
                .catch((err) => {
                    if (err.name === 'AbortError') {
                        sendResponse({
                            success: false,
                            error: 'Превышено время ожидания ответа от AI'
                        });
                    } else {
                        sendResponse({ success: false, error: err.message });
                    }
                });

            return true;
        }
        return false;
    }
}
