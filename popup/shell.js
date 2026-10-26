// ================================================================
// Shell UI: tabs, gear button, options panel
// ================================================================

let bottomSheetCleanupTimer = null;
const BOTTOM_SHEET_ANIMATION_MS = 260;

function setupTabs() {
    const tabItems = document.querySelectorAll('.tabs-item');
    const contents = document.querySelectorAll('.tabs-content > div');
    const statsBar = document.getElementById('overviewStatsBar');
    const bsEl = document.getElementById('bottomSheet');
    const tabById = {
        links: document.querySelector('.tabs-item[data-tab="links"]'),
        images: document.querySelector('.tabs-item[data-tab="images"]')
    };

    function updateStatsBar(activeTabId) {
        if (statsBar) {
            statsBar.classList.toggle('active', activeTabId === 'overview');
        }
    }

    function activateTab(tabId) {
        tabItems.forEach((tab) => tab.classList.remove('active'));
        contents.forEach((content) => content.classList.remove('active'));

        const tab = document.querySelector(`.tabs-item[data-tab="${tabId}"]`);
        const target = document.getElementById(tabId);
        if (tab) tab.classList.add('active');
        if (target) target.classList.add('active');
        updateStatsBar(tabId);
    }

    updateStatsBar('overview');

    tabItems.forEach((tab) => {
        tab.addEventListener('click', () => {
            closeBottomSheet();
            activateTab(tab.dataset.tab);
        });
    });

    document.querySelectorAll('.btn.btn_arrow .fa-chevron-down, .btn.btn_arrow .fa-chevron-up').forEach((icon) => {
        const btn = icon.closest('button');
        if (!btn || btn.id) return;

        btn.addEventListener('click', () => {
            const row = btn.closest('.tabs-content__row_dropdown');
            if (!row) return;
            const dd = row.querySelector('.dropdown');
            if (!dd) return;
            dd.classList.toggle('active');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        });
    });

    const allHEls = document.querySelectorAll('.overview-info__el');
    allHEls.forEach((el) => {
        const tabEl = el.querySelector('.overview-info__tab');
        if (!tabEl) return;

        tabEl.addEventListener('click', () => {
            const counter = el.querySelector('.counter');
            if (!counter || counter.textContent.trim() === '0') return;

            const navTarget = el.dataset.bsNav;
            if (navTarget) {
                closeBottomSheet({ immediate: true });
                activateTab(navTarget);
                return;
            }

            const label = el.dataset.bsLabel || '';
            const sc = el.querySelector('.dropdown__scroll_container');
            if (!sc) return;

            const items = sc.querySelectorAll('p, span.dropdown__title');
            const sourceId = el.id || label;
            if (bsEl?.classList.contains('open') && bsEl.dataset.sourceId === sourceId) {
                closeBottomSheet();
                return;
            }

            openBottomSheet(label, [...items].map(n => ({
                tag: (n.className.match(/heading-(H\d)/) || [])[1] || '',
                text: n.textContent
            })), sourceId);
        });
    });

    const bsClose = document.getElementById('bottomSheetClose');
    const bsBack  = document.getElementById('bottomSheetBackdrop');
    if (bsClose) bsClose.addEventListener('click', closeBottomSheet);
    if (bsBack)  bsBack.addEventListener('click', closeBottomSheet);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeBottomSheet();
    });
}

function openBottomSheet(title, items, sourceId = '') {
    const bsEl    = document.getElementById('bottomSheet');
    const bsTitle = document.getElementById('bottomSheetTitle');
    const bsCount = document.getElementById('bottomSheetCount');
    const bsBody  = document.getElementById('bottomSheetBody');
    if (!bsEl || !bsTitle || !bsBody) return;

    if (bottomSheetCleanupTimer) {
        clearTimeout(bottomSheetCleanupTimer);
        bottomSheetCleanupTimer = null;
    }

    bsTitle.textContent = title;
    if (bsCount) bsCount.textContent = items.length ? `${items.length}` : '';
    bsBody.replaceChildren();

    if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'bs-empty';
        empty.textContent = 'Заголовки не найдены';
        bsBody.appendChild(empty);
    } else {
        items.forEach(({ tag, text }, i) => {
            const row = document.createElement('div');
            row.className = `bs-item${tag ? ` bs-item--${tag}` : ''}`;

            const num = document.createElement('span');
            num.className = 'bs-num';
            num.textContent = i + 1;

            const textEl = document.createElement('span');
            textEl.className = 'bs-text';
            textEl.textContent = text.trim();

            row.appendChild(num);
            if (tag) {
                const tagEl = document.createElement('span');
                tagEl.className = `bs-tag heading-${tag}`;
                tagEl.textContent = tag;
                row.appendChild(tagEl);
            }
            row.appendChild(textEl);
            bsBody.appendChild(row);
        });
    }

    bsEl.dataset.sourceId = sourceId;
    const wrapper = document.querySelector('.wrapper');
    const statsBar = document.getElementById('overviewStatsBar');
    if (!wrapper || !statsBar) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const statsRect = statsBar.getBoundingClientRect();
    const panelGap = 0;
    const bottomOffset = Math.max(Math.round(wrapperRect.bottom - statsRect.top + panelGap), 92);

    bsEl.style.setProperty('--bottom-sheet-offset-bottom', `${bottomOffset}px`);
    bsEl.style.setProperty('--bottom-sheet-max-height', `calc(100% - ${bottomOffset + 64}px)`);
    bsEl.classList.add('open');
}

function closeBottomSheet(options = {}) {
    const bsEl = document.getElementById('bottomSheet');
    if (!bsEl) return;

    if (bottomSheetCleanupTimer) {
        clearTimeout(bottomSheetCleanupTimer);
        bottomSheetCleanupTimer = null;
    }

    if (options.immediate) {
        bsEl.classList.remove('open');
        bsEl.dataset.sourceId = '';
        bsEl.style.removeProperty('--bottom-sheet-offset-bottom');
        bsEl.style.removeProperty('--bottom-sheet-max-height');
        return;
    }

    if (options.animateToBottom) {
        bsEl.style.setProperty('--bottom-sheet-offset-bottom', '0px');
        bsEl.style.setProperty('--bottom-sheet-max-height', '72%');
    }

    bsEl.classList.remove('open');

    bottomSheetCleanupTimer = setTimeout(() => {
        bsEl.dataset.sourceId = '';
        bsEl.style.removeProperty('--bottom-sheet-offset-bottom');
        bsEl.style.removeProperty('--bottom-sheet-max-height');
        bottomSheetCleanupTimer = null;
    }, BOTTOM_SHEET_ANIMATION_MS);
}

function setupGearButton() {
    const btn = document.getElementById('openOptionsBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const tabItems = document.querySelectorAll('.tabs-item');
        const contents = document.querySelectorAll('.tabs-content > div');
        const optionsPanel = document.getElementById('options');
        const statsBar = document.getElementById('overviewStatsBar');
        const isOpen = optionsPanel?.classList.contains('active');

        tabItems.forEach((tab) => tab.classList.remove('active'));
        contents.forEach((content) => content.classList.remove('active'));
        btn.classList.remove('active');
        if (statsBar) statsBar.classList.remove('active');

        if (!isOpen && optionsPanel) {
            optionsPanel.classList.add('active');
            btn.classList.add('active');
            return;
        }

        const overviewTab = document.querySelector('.tabs-item[data-tab="overview"]');
        const overviewPanel = document.getElementById('overview');
        if (overviewTab) overviewTab.classList.add('active');
        if (overviewPanel) overviewPanel.classList.add('active');
        if (statsBar) statsBar.classList.add('active');
    });

    document.querySelectorAll('.tabs-item').forEach((tab) => {
        tab.addEventListener('click', () => {
            btn.classList.remove('active');
        });
    });
}

const DEFAULT_OPTIONS = {
    numericalSearchYandex: true,
    highlightExternalLinks: false,
    highlightNoindexNofollow: false,
    metaTagsTemplate: 'Title: {title}\nH1: {h1}\nDescription: {description}\nURL: {url}'
};

function setupOptionsPanel() {
    const gearBtn = document.getElementById('openOptionsBtn');
    if (gearBtn) {
        gearBtn.addEventListener('click', () => {
            loadOptionsToForm();
        });
    }

    const saveBtn = document.getElementById('saveOptions');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const opts = {
                numericalSearchYandex: document.getElementById('optNumericalYandex')?.checked ?? true,
                highlightExternalLinks: document.getElementById('optHighlightExternal')?.checked ?? false,
                highlightNoindexNofollow: document.getElementById('optHighlightNoindex')?.checked ?? false,
                metaTagsTemplate: document.getElementById('metaTagsTemplate')?.value || DEFAULT_OPTIONS.metaTagsTemplate
            };

            chrome.storage.sync.set(opts, () => {
                saveBtn.textContent = 'Сохранено ✓';
                setTimeout(() => {
                    saveBtn.textContent = 'Сохранить';
                }, CONFIG.COPY_FLASH_DURATION);
            });
        });
    }

    const resetBtn = document.getElementById('resetOptions');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            chrome.storage.sync.set(DEFAULT_OPTIONS, () => {
                loadOptionsToForm();
                resetBtn.textContent = 'Сброшено ✓';
                setTimeout(() => {
                    resetBtn.textContent = 'Сбросить';
                }, CONFIG.COPY_FLASH_DURATION);
            });
        });
    }
}

function loadOptionsToForm() {
    chrome.storage.sync.get(DEFAULT_OPTIONS, (opts) => {
        const yandex = document.getElementById('optNumericalYandex');
        const external = document.getElementById('optHighlightExternal');
        const noindex = document.getElementById('optHighlightNoindex');
        const template = document.getElementById('metaTagsTemplate');

        if (yandex) yandex.checked = !!opts.numericalSearchYandex;
        if (external) external.checked = !!opts.highlightExternalLinks;
        if (noindex) noindex.checked = !!opts.highlightNoindexNofollow;
        if (template) template.value = opts.metaTagsTemplate || DEFAULT_OPTIONS.metaTagsTemplate;
    });
}
