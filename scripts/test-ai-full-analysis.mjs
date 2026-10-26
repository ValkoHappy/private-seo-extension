import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const sourcePath = path.resolve('popup/tabs/ai.js');
const source = await fs.readFile(sourcePath, 'utf8');

class MockElement {
  constructor(id) {
    this.id = id;
    this.style = { display: '' };
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  async trigger(type) {
    const handlers = this.listeners.get(type) || [];
    for (const handler of handlers) {
      await handler({ type, target: this });
    }
  }

  scrollIntoView() {}
  focus() {}
}

const ids = [
  'aiBtnReview',
  'aiBtnMeta',
  'aiBtnIntent',
  'aiBtnSpam',
  'aiBtnAll',
  'aiBtnSerp',
  'aiMetaFocusKeyword',
  'aiTabLoader',
  'aiTabLoaderText',
  'aiTabError',
  'aiTabMetaResult',
  'aiTabSerpResult',
  'aiTabIntentResult',
  'aiTabSpamResult',
  'aiTabTitle',
  'aiTabDescription',
  'aiTabTitleChars',
  'aiTabDescChars',
  'aiTabIntentContent',
  'aiTabSpamContent',
  'aiUseTitleAsKey'
];

const elements = Object.fromEntries(ids.map((id) => [id, new MockElement(id)]));
elements.aiMetaFocusKeyword.value = 'настенные сплит системы';

const storage = {};
const actionCalls = [];

const chrome = {
  storage: {
    session: {
      get(key, cb) {
        cb({ [key]: storage[key] });
      },
      set(patch) {
        Object.assign(storage, patch);
      }
    }
  }
};

const context = {
  console,
  chrome,
  globalUrl: 'https://example.com/catalog',
  document: {
    getElementById(id) {
      return elements[id] || null;
    }
  },
  setTimeout,
  clearTimeout,
  Promise,
  renderSerpComparison() {},
  runAiActionRequest(action) {
    actionCalls.push(action);
    if (action === 'generateMetaTags') {
      return Promise.resolve({
        success: true,
        title: 'Готовый title',
        description: 'Готовый description'
      });
    }
    if (action === 'analyzeIntent') {
      return Promise.resolve({ success: true, text: 'Intent text' });
    }
    if (action === 'analyzeSpam') {
      return Promise.resolve({ success: true, text: 'Spam text' });
    }
    return Promise.resolve({ success: false, error: `Unknown action: ${action}` });
  },
  async runOverviewAiReview() {
    await context.runAiActionRequest('analyzeIntent');
    await context.runAiActionRequest('analyzeSpam');
    return {
      success: true,
      intentText: 'Intent text',
      spamText: 'Spam text'
    };
  }
};

vm.createContext(context);
vm.runInContext(source, context, { filename: sourcePath });

context.setupAiTab();
await elements.aiBtnAll.trigger('click');

const cacheKey = `aiCache_${context.globalUrl}`;
const cache = storage[cacheKey] || {};
const analyzeIntentCalls = actionCalls.filter((action) => action === 'analyzeIntent').length;
const analyzeSpamCalls = actionCalls.filter((action) => action === 'analyzeSpam').length;
const generateMetaCalls = actionCalls.filter((action) => action === 'generateMetaTags').length;

const failures = [];

if (generateMetaCalls !== 1 || analyzeIntentCalls !== 1 || analyzeSpamCalls !== 1) {
  failures.push(
    `Expected full analysis to call AI once per action, got generateMetaTags=${generateMetaCalls}, analyzeIntent=${analyzeIntentCalls}, analyzeSpam=${analyzeSpamCalls}`
  );
}

if (!cache.meta || !cache.intent || !cache.spam) {
  failures.push(`Expected full analysis to persist meta/intent/spam cache, got ${JSON.stringify(cache)}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('AI full-analysis regression test passed');
