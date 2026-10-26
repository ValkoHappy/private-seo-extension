import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NetworkChecks } from '../background/network-checks.js';

test('network checks preserve the port of a local audited site', async (t) => {
    const urls = [];
    t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
        urls.push([String(url), options.method || 'GET']);
        return { status: 200, headers: new Headers(), text: async () => 'User-agent: *' };
    });
    const checks = new NetworkChecks();
    const result = await new Promise((resolve) =>
        checks.handle({ action: 'fetchServerData', url: 'http://localhost:8123/page' }, resolve)
    );
    assert.equal(result.status, 200);
    assert.ok(urls.some(([url]) => url === 'http://localhost:8123/robots.txt'));
});

test('service worker rejects unrelated senders and reports an unconfigured AI endpoint', async (t) => {
    let listener;
    t.mock.method(globalThis, 'fetch', () => {
        throw new Error('Unexpected network request');
    });
    globalThis.chrome = {
        runtime: {
            id: 'test-extension',
            onMessage: {
                addListener(callback) {
                    listener = callback;
                }
            }
        }
    };
    try {
        await import('../background.js');
        assert.equal(
            listener({ action: 'generateMetaTags' }, { id: 'other' }, () => {}),
            false
        );
        assert.equal(
            listener({ action: 'unknown' }, { id: 'test-extension' }, () => {}),
            false
        );
        const result = await new Promise((resolve) =>
            listener(
                { action: 'generateMetaTags', text: 'Demo', url: 'https://example.test' },
                { id: 'test-extension' },
                resolve
            )
        );
        assert.equal(result.success, false);
        assert.match(result.error, /не настроен/);
    } finally {
        delete globalThis.chrome;
    }
});
