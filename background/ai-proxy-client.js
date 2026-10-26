/** Transport for a server-side AI proxy. Provider credentials stay on that server. */
export class AiProxyClient {
    constructor(endpoint, fetcher = globalThis.fetch) {
        this.endpoint = endpoint;
        this.fetcher = fetcher;
    }

    async request(payload, timeoutMs) {
        if (!this.endpoint) {
            throw new Error(
                'AI-прокси не настроен. Укажите PRIVATESEO_AI_PROXY_URL при сборке расширения.'
            );
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await this.fetcher(this.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || `AI proxy error: ${response.status}`);
            return data || {};
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
