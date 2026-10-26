import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { unzipSync } from 'fflate';

test('the installation archive includes background modules and excludes local project data', async () => {
    execFileSync(process.execPath, ['scripts/build-chrome.mjs'], {
        env: { ...process.env, PRIVATESEO_AI_PROXY_URL: '' }
    });
    execFileSync(process.execPath, ['scripts/zip-chrome.mjs']);
    const manifest = JSON.parse(await readFile('dist/chrome/manifest.json', 'utf8'));
    assert.equal(manifest.background.type, 'module');
    await access(`dist/chrome/${manifest.background.service_worker}`);
    const entries = unzipSync(
        new Uint8Array(await readFile(`release/privateseo-chrome-${manifest.version}.zip`))
    );
    for (const required of [
        'manifest.json',
        'background.js',
        'background/ai-proxy-client.js',
        'background/config.js',
        'popup/domain/seo-audit.js',
        'report.html'
    ])
        assert.ok(entries[required], required);
    assert.match(new TextDecoder().decode(entries['background/config.js']), /AI_PROXY_URL = ""/);
    assert.ok(
        !Object.keys(entries).some((name) =>
            /node_modules|\.env|\.claude|\.qoder|\.serena/.test(name)
        )
    );
});
