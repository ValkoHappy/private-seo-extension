function fillToolsTab(urlObj) {
    const host = urlObj.hostname;
    const fullUrl = globalUrl;

    const toolLinks = {
        '#openWebarchive a':              `https://web.archive.org/web/*/${fullUrl}`,
        '#checkSSL a':                    `https://www.sslshopper.com/ssl-checker.html#hostname=${host}`,
        '#checkWhoisInfoRegRU a':         `https://www.webnames.ru/whois?domname=${host}`,
        '#cms a':                         `https://be1.ru/cms/?url=${encodeURIComponent(fullUrl)}`,
        '#checkBertal a':                 `https://bertal.ru/?d=${host}`,
        '#checkDoublesBe1 a':             `https://be1.ru/antiplagiat/?url=${encodeURIComponent(fullUrl)}`,
        '#checkCheckTrust a':             `https://checktrust.ru/app.php?r=host/main/summary/full&c=1&s=${host}`,
        '#checkCSSValidator a':           `https://jigsaw.w3.org/css-validator/validator?uri=${encodeURIComponent(fullUrl)}`,
        '#checkHTMLValidator a':          `https://validator.w3.org/nu/?doc=${encodeURIComponent(fullUrl)}`,
        '#checkSpelling a':               `https://www.websiteplanet.com/ru/webtools/spell-checker/?url=${encodeURIComponent(fullUrl)}`
    };

    Object.entries(toolLinks).forEach(([selector, href]) => setLink(selector, href));
    setupToolsToggles(globalTab.id, urlObj);
}

// ================================================================
// TOOLS — Toggle buttons (highlight headings, alt, noindex, etc.)
// ================================================================
function setupToolsToggles(tabId, urlObj) {
    // Init all toggle buttons to OFF state
    ['showHeaderLighting', 'showImageAtl', 'showNoindex', 'showExternalLinks', 'disableJS', 'togglesCSS']
        .forEach(id => { const b = document.getElementById(id); if (b) setToggleBtn(b, false); });

    // Apply auto options
    setTimeout(() => {
        chrome.storage.sync.get(DEFAULT_OPTIONS, (opts) => {
            if (opts.highlightNoindexNofollow) {
                const btn = document.getElementById('showNoindex');
                if (btn && !btn.classList.contains('active')) btn.click();
            }
            if (opts.highlightExternalLinks) {
                const btn = document.getElementById('showExternalLinks');
                if (btn && !btn.classList.contains('active')) btn.click();
            }
        });
    }, 100);

    // в”Ђв”Ђ H1-H6 Highlight в”Ђв”Ђ
    setupJsToggle('showHeaderLighting', tabId,
        function() { // ON
            // 1. Inject CSS
            var styleId = '__seo_headings';
            var s = document.getElementById(styleId);
            if (!s) {
                s = document.createElement('style');
                s.id = styleId;
                s.textContent = [
                    'h1{outline:3px solid #ef4444!important}',
                    'h1::before{content:"H1";background:#ef4444;color:#fff;font:bold 10px Arial,sans-serif;padding:1px 5px;margin-right:5px;border-radius:3px;display:inline-block}',
                    'h2{outline:3px solid #f59e0b!important}',
                    'h2::before{content:"H2";background:#f59e0b;color:#fff;font:bold 10px Arial,sans-serif;padding:1px 5px;margin-right:5px;border-radius:3px;display:inline-block}',
                    'h3{outline:3px solid #3b82f6!important}',
                    'h3::before{content:"H3";background:#3b82f6;color:#fff;font:bold 10px Arial,sans-serif;padding:1px 5px;margin-right:5px;border-radius:3px;display:inline-block}',
                    'h4{outline:3px solid #8b5cf6!important}',
                    'h4::before{content:"H4";background:#8b5cf6;color:#fff;font:bold 10px Arial,sans-serif;padding:1px 5px;margin-right:5px;border-radius:3px;display:inline-block}',
                    'h5{outline:3px solid #22c55e!important}',
                    'h5::before{content:"H5";background:#22c55e;color:#fff;font:bold 10px Arial,sans-serif;padding:1px 5px;margin-right:5px;border-radius:3px;display:inline-block}',
                    'h6{outline:3px solid #94a3b8!important}',
                    'h6::before{content:"H6";background:#94a3b8;color:#fff;font:bold 10px Arial,sans-serif;padding:1px 5px;margin-right:5px;border-radius:3px;display:inline-block}'
                ].join('');
                document.head.appendChild(s);
            }
            // 2. Inject Tree Widget
            var treeId = '__seo_tree';
            var tree = document.getElementById(treeId);
            if (!tree) {
                tree = document.createElement('div');
                tree.id = treeId;
                tree.style.cssText = 'position:fixed;top:20px;right:20px;width:320px;max-height:85vh;overflow-y:auto;background:#fff;border:1px solid #ccc;box-shadow:0 10px 30px rgba(0,0,0,0.2);z-index:2147483647;padding:15px;font-family:Arial,sans-serif;border-radius:8px;color:#333;text-align:left;';

                var title = document.createElement('div');
                title.textContent = 'Оглавление (H1-H6)';
                title.style.cssText = 'font-weight:bold;margin-bottom:10px;font-size:14px;border-bottom:1px solid #eee;padding-bottom:8px;display:flex;justify-content:space-between;align-items:center;';

                var closeBtn = document.createElement('span');
                closeBtn.innerHTML = '&times;';
                closeBtn.style.cssText = 'cursor:pointer;font-size:20px;color:#999;font-weight:normal;line-height:1;margin-top:-2px;';
                closeBtn.onclick = function() { tree.remove(); if(s) s.remove(); };
                title.appendChild(closeBtn);
                tree.appendChild(title);

                var ul = document.createElement('ul');
                ul.style.cssText = 'list-style:none;padding:0;margin:0;font-size:13px;line-height:1.4;';

                var headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6');
                if (headings.length === 0) {
                    var li = document.createElement('li');
                    li.textContent = 'Заголовки не найдены';
                    li.style.color = '#999';
                    ul.appendChild(li);
                } else {
                    Array.from(headings).forEach(function(h) {
                        var lvl = parseInt(h.tagName.substring(1));
                        var li = document.createElement('li');
                        li.style.cssText = 'margin-left:' + ((lvl - 1) * 12) + 'px;margin-bottom:6px;';

                        var a = document.createElement('a');
                        a.textContent = h.textContent.trim() || '<пустой>';
                        a.style.cssText = 'color:#0366d6;text-decoration:none;cursor:pointer;display:inline;';
                        a.onmouseover = function(){ a.style.textDecoration='underline'; };
                        a.onmouseout = function(){ a.style.textDecoration='none'; };
                        a.onclick = function(e){
                            e.preventDefault();
                            h.scrollIntoView({behavior:'smooth', block:'center'});
                            var oldOutline = h.style.outline;
                            h.style.setProperty('outline', '4px solid #000', 'important');
                            setTimeout(function(){ h.style.outline = oldOutline; }, 1500);
                        };

                        var badge = document.createElement('span');
                        badge.textContent = h.tagName;
                        badge.style.cssText = 'font-size:9px;background:#eee;color:#555;padding:2px 4px;border-radius:3px;margin-right:6px;display:inline-block;vertical-align:middle;';

                        li.appendChild(badge);
                        li.appendChild(a);
                        ul.appendChild(li);
                    });
                }
                tree.appendChild(ul);
                document.body.appendChild(tree);
            }
            return true;
        },
        function() { // OFF
            var s = document.getElementById('__seo_headings');
            if (s) s.remove();
            var tree = document.getElementById('__seo_tree');
            if (tree) tree.remove();
            return false;
        }
    );

    // в”Ђв”Ђ noindex / nofollow в”Ђв”Ђ
    setupCssToggle('showNoindex', tabId, '__seo_noindex', [
        'a[rel*="nofollow"],a[rel*="noindex"]{outline:2px solid #ef4444!important;background-color:rgba(239,68,68,0.08)!important}',
        'a[rel*="nofollow"]::after{content:"nofollow";background:#ef4444;color:#fff;font:bold 9px Arial,sans-serif;padding:1px 5px;margin-left:4px;border-radius:3px;vertical-align:middle}',
        'a[rel*="noindex"]::after{content:"noindex";background:#ef4444;color:#fff;font:bold 9px Arial,sans-serif;padding:1px 5px;margin-left:4px;border-radius:3px;vertical-align:middle}'
    ].join(''));

    // в”Ђв”Ђ Alt tags (JS toggle) в”Ђв”Ђ
    setupJsToggle('showImageAtl', tabId,
        function() { // ON
            if (document.querySelector('img[data-seo-alt]')) return false;
            document.querySelectorAll('img').forEach(function(img) {
                img.dataset.seoAlt = img.title || '';
                var alt = img.getAttribute('alt');
                if (alt === null) {
                    img.title = '⚠ ALT отсутствует';
                    img.style.setProperty('outline', '3px solid #ef4444', 'important');
                } else if (alt === '') {
                    img.title = '⚠ ALT пустой';
                    img.style.setProperty('outline', '3px solid #f59e0b', 'important');
                } else {
                    img.title = 'вњ“ ' + alt;
                    img.style.setProperty('outline', '3px solid #22c55e', 'important');
                }
            });
            return true;
        },
        function() { // OFF
            document.querySelectorAll('img[data-seo-alt]').forEach(function(img) {
                img.title = img.dataset.seoAlt;
                delete img.dataset.seoAlt;
                img.style.removeProperty('outline');
            });
            return false;
        }
    );

    // в”Ђв”Ђ External links (JS toggle) в”Ђв”Ђ
    setupJsToggle('showExternalLinks', tabId,
        function() { // ON
            if (document.querySelector('a.__seo_ext')) return false;
            var host = location.hostname;
            document.querySelectorAll('a[href]').forEach(function(a) {
                try {
                    var u = new URL(a.href);
                    if (u.hostname && u.hostname !== host) {
                        a.style.setProperty('outline', '2px solid #f59e0b', 'important');
                        a.style.setProperty('background-color', 'rgba(245,158,11,0.1)', 'important');
                        a.classList.add('__seo_ext');
                    }
                } catch(e) {}
            });
            return !!document.querySelector('a.__seo_ext');
        },
        function() { // OFF
            document.querySelectorAll('a.__seo_ext').forEach(function(a) {
                a.style.removeProperty('outline');
                a.style.removeProperty('background-color');
                a.classList.remove('__seo_ext');
            });
            return false;
        }
    );

    // в”Ђв”Ђ Disable / Enable CSS в”Ђв”Ђ
    setupJsToggle('togglesCSS', tabId,
        function() { // ON — disable CSS
            document.querySelectorAll('link[rel="stylesheet"],style').forEach(function(s) {
                if (!s.disabled) { s.disabled = true; s.dataset.seoDisabled = '1'; }
            });
            return true;
        },
        function() { // OFF — re-enable CSS
            document.querySelectorAll('[data-seo-disabled]').forEach(function(s) {
                s.disabled = false; delete s.dataset.seoDisabled;
            });
            return false;
        }
    );

    // в”Ђв”Ђ Disable / Enable JS (via contentSettings + reload) в”Ђв”Ђ
    const jsBtn = document.getElementById('disableJS');
    if (jsBtn) {
        const origin = urlObj.origin;
        // Detect current state
        chrome.runtime.sendMessage({ action: 'getJsSetting', origin }, (res) => {
            const jsDisabled = res?.setting === 'block';
            setToggleBtn(jsBtn, jsDisabled);
        });
        jsBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'getJsSetting', origin }, (res) => {
                const currentlyBlocked = res?.setting === 'block';
                chrome.runtime.sendMessage({
                    action: 'setJsSetting', origin, enabled: currentlyBlocked
                }, () => {
                    setToggleBtn(jsBtn, !currentlyBlocked);
                    chrome.tabs.reload(tabId);
                });
            });
        });
    }
}

function setToggleBtn(btn, isOn) {
    const icon = btn.querySelector('i');
    if (!icon) return;
    icon.className = isOn ? 'fa fa-toggle-on' : 'fa fa-toggle-off';
    btn.style.background = isOn ? 'var(--success)' : '';
}

function setupCssToggle(btnId, tabId, styleId, css) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    // Проверяем, что обработчик ещё не навешен
    if (btn.dataset.toggleInitialized) return;
    btn.dataset.toggleInitialized = 'true';
    btn.addEventListener('click', () => {
        chrome.scripting.executeScript({
            target: { tabId },
            func: (styleId, css) => {
                const existing = document.getElementById(styleId);
                if (existing) { existing.remove(); return false; }
                const s = document.createElement('style');
                s.id = styleId; s.textContent = css;
                document.head.appendChild(s);
                return true;
            },
            args: [styleId, css]
        }, (results) => setToggleBtn(btn, results?.[0]?.result ?? false));
    });
}

function setupJsToggle(btnId, tabId, onFn, offFn) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    // Проверяем, что обработчик ещё не навешен
    if (btn.dataset.toggleInitialized) return;
    btn.dataset.toggleInitialized = 'true';
    let isOn = false;
    btn.addEventListener('click', () => {
        chrome.scripting.executeScript({
            target: { tabId },
            func: isOn ? offFn : onFn
        }, (results) => {
            isOn = results?.[0]?.result ?? !isOn;
            setToggleBtn(btn, isOn);
        });
    });
}

function fillTrackers(trackers) {
    const list = document.getElementById('trackersList');
    if (!list) return;
    list.innerHTML = '';

    const TRACKER_NAMES = {
        yandexMetrika:  { label: 'Яндекс.Метрика', icon: 'fab fa-yandex' },
        googleAnalytics:{ label: 'Google Analytics', icon: 'fab fa-google' },
        googleTagManager:{ label: 'Google Tag Manager', icon: 'fab fa-google' },
        vkPixel:        { label: 'VK Пиксель', icon: 'fab fa-vk' },
        facebookPixel:  { label: 'Facebook Pixel', icon: 'fab fa-facebook' }
    };

    let found = false;
    Object.entries(TRACKER_NAMES).forEach(([key, { label, icon }]) => {
        if (!trackers[key]) return;
        found = true;
        const div = document.createElement('div');
        div.className = 'tracker-item';
        div.innerHTML = `<i class="${icon} tracker-icon"></i><span class="tracker-label">${label}</span><i class="fa fa-circle-check ball__success tracker-check"></i>`;
        list.appendChild(div);
    });

    if (!found) {
        list.innerHTML = '<div class="dropdown__item"><span class="empty-value">Трекеры не обнаружены</span></div>';
    }
}
