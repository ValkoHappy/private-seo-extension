import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const sourcePath = path.resolve('popup/shell.js');
const source = await fs.readFile(sourcePath, 'utf8');

class MockElement {
  constructor(id) {
    this.id = id;
    this.checked = false;
    this.value = '';
    this.textContent = '';
    this.listeners = new Map();
    this.classList = {
      add() {},
      remove() {},
      contains() { return false; }
    };
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  dispatch(type) {
    const handlers = this.listeners.get(type) || [];
    handlers.forEach((handler) => handler({ type, target: this }));
  }
}

const ids = [
  'openOptionsBtn',
  'saveOptions',
  'resetOptions',
  'optNumericalYandex',
  'optHighlightExternal',
  'optHighlightNoindex',
  'metaTagsTemplate'
];

const elements = Object.fromEntries(ids.map((id) => [id, new MockElement(id)]));

const storage = {};

const chrome = {
  storage: {
    sync: {
      get(defaults, cb) {
        cb({ ...defaults, ...storage });
      },
      set(patch, cb) {
        Object.assign(storage, patch);
        if (cb) cb();
      }
    }
  }
};

const context = {
  console,
  chrome,
  CONFIG: { COPY_FLASH_DURATION: 0 },
  document: {
    getElementById(id) {
      return elements[id] || null;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  },
  setTimeout(fn) {
    fn();
    return 0;
  },
  clearTimeout() {}
};

vm.createContext(context);
vm.runInContext(source, context, { filename: sourcePath });

context.setupOptionsPanel();

elements.optNumericalYandex.checked = false;
elements.optHighlightExternal.checked = true;
elements.optHighlightNoindex.checked = true;
elements.metaTagsTemplate.value = 'Title: {title}';
elements.saveOptions.dispatch('click');

const saveFailures = [];
if (storage.numericalSearchYandex !== false) saveFailures.push('numericalSearchYandex was not saved');
if (storage.highlightExternalLinks !== true) saveFailures.push('highlightExternalLinks was not saved');
if (storage.highlightNoindexNofollow !== true) saveFailures.push('highlightNoindexNofollow was not saved');
if (storage.metaTagsTemplate !== 'Title: {title}') saveFailures.push('metaTagsTemplate was not saved');

storage.numericalSearchYandex = true;
storage.highlightExternalLinks = false;
storage.highlightNoindexNofollow = false;
storage.metaTagsTemplate = 'URL: {url}';

context.loadOptionsToForm();

if (elements.optNumericalYandex.checked !== true) saveFailures.push('numericalSearchYandex was not loaded');
if (elements.optHighlightExternal.checked !== false) saveFailures.push('highlightExternalLinks was not loaded');
if (elements.optHighlightNoindex.checked !== false) saveFailures.push('highlightNoindexNofollow was not loaded');
if (elements.metaTagsTemplate.value !== 'URL: {url}') saveFailures.push('metaTagsTemplate was not loaded');

if (saveFailures.length) {
  console.error(saveFailures.join('\n'));
  process.exit(1);
}

console.log('Settings persistence regression test passed');
