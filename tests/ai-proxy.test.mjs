import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AiProxyClient } from '../background/ai-proxy-client.js';
import { AiChecks } from '../background/ai-checks.js';

test('an unconfigured proxy rejects locally without sending page data', async () => {
    let requests = 0;
    const proxy = new AiProxyClient('', () => {
        requests++;
    });
    await assert.rejects(proxy.request({ text: 'private content' }, 100), /не настроен/);
    assert.equal(requests, 0);
});

test('proxy sends only the requested payload and propagates server errors', async () => {
    let sent;
    const proxy = new AiProxyClient('https://proxy.example.test', async (url, options) => {
        sent = { url, options };
        return {
            ok: true,
            json: async () => ({ success: true, title: 'Example' })
        };
    });
    assert.equal(
        (await proxy.request({ action: 'generateMetaTags', text: 'Example' }, 1000)).title,
        'Example'
    );
    assert.equal(JSON.parse(sent.options.body).text, 'Example');
    assert.equal(sent.options.headers.Authorization, undefined);
    const failed = new AiProxyClient('https://proxy.example.test', async () => ({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Unavailable' })
    }));
    await assert.rejects(failed.request({}, 1000), /Unavailable/);
});

test('AI handler validates input before calling its injected client', async () => {
    let calls = 0;
    const handler = new AiChecks({
        request: async () => {
            calls++;
            return { success: true, title: 'Example' };
        }
    });
    let invalid;
    assert.equal(
        handler.handle({ action: 'generateMetaTags', text: '' }, (value) => {
            invalid = value;
        }),
        true
    );
    assert.equal(invalid.success, false);
    assert.equal(calls, 0);
    const result = await new Promise((resolve) =>
        handler.handle(
            { action: 'generateMetaTags', text: 'Page', url: 'https://example.test' },
            resolve
        )
    );
    assert.equal(result.title, 'Example');
    assert.equal(
        handler.handle({ action: 'unknown' }, () => {}),
        false
    );
});
