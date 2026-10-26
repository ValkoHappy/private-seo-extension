import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({ URL });
vm.runInContext(
    (await readFile(new URL('../popup/domain/seo-audit.js', import.meta.url), 'utf8')) +
        '\nthis.policy = new SeoAuditPolicy();',
    context
);
const policy = context.policy;

test('robots rules use the longest matching path and preserve explicit allow exceptions', () => {
    const rules = 'User-agent: *\nDisallow: /private/\nAllow: /private/public/';
    assert.equal(
        policy.evaluateRobots(rules, new URL('https://example.test/private/a')).isBlocked,
        true
    );
    assert.equal(
        policy.evaluateRobots(rules, new URL('https://example.test/private/public/a')).isBlocked,
        false
    );
});

test('audit rules identify indexing problems without DOM access', () => {
    const issues = policy.analyze({
        ready: true,
        url: 'https://example.test/page',
        title: '',
        description: '',
        robots: 'noindex',
        headings: [],
        imgTags: [],
        metaTags: {},
        statusCode: 200
    });
    assert.ok(issues.some((issue) => issue.severity === 'critical'));
    assert.ok(issues.some((issue) => /noindex/i.test(issue.details + issue.title)));
});

test('relative canonical URLs are resolved against the audited page', () => {
    const issues = policy.analyze({
        ready: true,
        url: 'https://example.test/page',
        canonical: '/page',
        title: 'Title',
        description: 'Description',
        headings: [{ nodeName: 'H1', innerText: 'Heading' }],
        imgTags: [],
        metaTags: {}
    });
    assert.ok(!issues.some((issue) => issue.title === 'Canonical указывает на другой URL'));
});
