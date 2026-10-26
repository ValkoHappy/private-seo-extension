function fillMicrodataTab(data, fullUrl) {
    const { metaTags, jsonLd } = data;

    // JSON-LD
    const jsonLdContainer = document.querySelector('#microdata-jsonld .dropdown');
    if (jsonLdContainer) {
        jsonLdContainer.innerHTML = '';
        if (jsonLd && jsonLd.length) {
            jsonLd.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'dropdown__item alst-column';
                div.style.alignItems = 'flex-start';

                const title = document.createElement('div');
                title.className = 'tabs-content__row_name';
                title.textContent = `Блок #${index + 1}`;
                const typeText = item.data ? (item.data['@type'] || '') : '';
                if (typeText) {
                    const hint = document.createElement('span');
                    hint.className = 'hint';
                    hint.textContent = String(typeText);
                    title.appendChild(document.createTextNode(' '));
                    title.appendChild(hint);
                }

                const pre = document.createElement('pre');
                pre.style.cssText = 'background:var(--bg-hover);padding:10px;border-radius:var(--radius-sm);overflow-x:auto;width:100%;font-size:11px;margin-top:5px;border:1px solid var(--border);white-space:pre-wrap;word-break:break-all';

                if (item.success) {
                    pre.textContent = JSON.stringify(item.data, null, 2);
                } else {
                    pre.textContent = 'Ошибка парсинга:\n' + item.raw;
                    pre.style.borderColor = 'var(--error)';
                }

                div.appendChild(title);
                div.appendChild(pre);
                jsonLdContainer.appendChild(div);
            });
            jsonLdContainer.classList.add('active');
        } else {
            jsonLdContainer.innerHTML = '<div class="dropdown__item"><span class="empty-value">JSON-LD скрипты не найдены</span></div>';
        }
    }

    // External validators
    setLink('#openGoogleRichResultMobileTest a', `https://search.google.com/test/rich-results?url=${encodeURIComponent(fullUrl)}`);
    setLink('#openSchemaOrgMicrodataValidator a', `https://validator.schema.org/#url=${encodeURIComponent(fullUrl)}`);

    // Open Graph
    const ogContainer = document.querySelector('#microdata-og .dropdown');
    if (ogContainer) {
        const ogKeys = Object.keys(metaTags).filter(k => k.startsWith('og:'));
        ogContainer.innerHTML = '';
        if (ogKeys.length) {
            ogKeys.forEach(key => {
                const val = (metaTags[key][0] || {}).content || '';
                const div = document.createElement('div');
                div.className = 'dropdown__item';
                div.innerHTML = `<div class="dropdown__item_name">${escHtml(key)}</div>
                    <div class="dropdown__item_result">${escHtml(val) || '<span class="empty-value">—</span>'}</div>`;
                ogContainer.appendChild(div);
            });
            ogContainer.classList.add('active');
        } else {
            ogContainer.innerHTML = '<div class="dropdown__item"><span class="empty-value">Open Graph теги не найдены</span></div>';
        }
    }

    // Twitter Card
    const twContainer = document.querySelector('#microdata-twitter .dropdown');
    if (twContainer) {
        const twKeys = Object.keys(metaTags).filter(k => k.startsWith('twitter:'));
        twContainer.innerHTML = '';
        if (twKeys.length) {
            twKeys.forEach(key => {
                const val = (metaTags[key][0] || {}).content || '';
                const div = document.createElement('div');
                div.className = 'dropdown__item';
                div.innerHTML = `<div class="dropdown__item_name">${escHtml(key)}</div>
                    <div class="dropdown__item_result">${escHtml(val) || '<span class="empty-value">—</span>'}</div>`;
                twContainer.appendChild(div);
            });
            twContainer.classList.add('active');
        } else {
            twContainer.innerHTML = '<div class="dropdown__item"><span class="empty-value">Twitter Card теги не найдены</span></div>';
        }
    }

    // Configure Social Preview
    const spContainer = document.getElementById('socialPreviewContainer');
    const spImage     = document.getElementById('spImage');
    const spNoImage   = document.getElementById('spNoImage');
    const spDomain    = document.getElementById('spDomain');
    const spTitle     = document.getElementById('spTitle');
    const spDesc      = document.getElementById('spDesc');

    if (spContainer) {
        const ogTitle = (metaTags['og:title'] || [{}])[0].content || (data.titles[0] || {}).innerText || '';
        const ogDesc  = (metaTags['og:description'] || [{}])[0].content || (metaTags['description'] || [{}])[0].content || '';
        const ogImage = (metaTags['og:image'] || [{}])[0].content || (metaTags['twitter:image'] || [{}])[0].content || '';
        const twTitle = (metaTags['twitter:title'] || [{}])[0].content || '';

        if (Object.keys(metaTags).some(k => k.startsWith('og:') || k.startsWith('twitter:'))) {
            spContainer.style.display = 'flex';

            try { spDomain.textContent = new URL(fullUrl).hostname; } catch(e) {}
            spTitle.textContent = ogTitle || twTitle || 'Заголовок страницы';
            spDesc.textContent = ogDesc || 'Описание страницы не задано...';

            spImage.removeAttribute('src');
            spImage.style.display = 'none';
            spNoImage.style.display = 'flex';
            spNoImage.replaceChildren();

            const previewText = document.createElement('span');
            previewText.textContent = ogImage ? 'Изображение не загружено' : 'Нет изображения';
            spNoImage.appendChild(previewText);

            if (ogImage) {
                const loadBtn = document.createElement('button');
                loadBtn.type = 'button';
                loadBtn.className = 'sp-load-btn';
                loadBtn.textContent = 'Загрузить изображение';
                const doLoad = () => {
                    const imgUrl = ogImage.startsWith('http') || ogImage.startsWith('//')
                        ? ogImage
                        : new URL(ogImage, fullUrl).href;
                    spImage.referrerPolicy = 'no-referrer';
                    spImage.src = imgUrl;
                    spImage.style.display = 'block';
                    spNoImage.style.display = 'none';
                };
                loadBtn.addEventListener('click', doLoad, { once: true });
                spNoImage.appendChild(loadBtn);
                doLoad();
            }
        }
    }
}

// ================================================================
// TAB 7: TOOLS
// ================================================================
