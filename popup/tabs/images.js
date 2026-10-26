function fillImagesTab(data) {
    const imgs = data.imgTags || [];
    allImagesData = imgs;

    const counts = {
        all: imgs.length,
        emptyAlt: imgs.filter(i => i.alt !== null && i.alt === '').length,
        noAlt: imgs.filter(i => i.alt === null).length,
        hasAlt: imgs.filter(i => i.alt !== null && i.alt !== '').length
    };

    setLabel('images-alt-radio-all', `Все изображения (${counts.all})`);
    setLabel('images-alt-radio-empty', `Пустой alt (${counts.emptyAlt})`);
    setLabel('images-alt-radio-without', `Отсутствует alt (${counts.noAlt})`);
    setLabel('images-alt-radio-exists', `Заполнен alt (${counts.hasAlt})`);

    // Ensure images-list container exists
    const imagesDropdown = document.querySelector('#images .dropdown');
    if (imagesDropdown && !imagesDropdown.querySelector('.images-list')) {
        const list = document.createElement('div');
        list.className = 'images-list';
        imagesDropdown.innerHTML = '';
        imagesDropdown.appendChild(list);
    }

    renderImagesList(imgs);

    document.querySelectorAll('[name="images-alt-radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const val = radio.value;
            let filtered = imgs;
            if (val === 'empty') filtered = imgs.filter(i => i.alt !== null && i.alt === '');
            else if (val === 'without') filtered = imgs.filter(i => i.alt === null);
            else if (val === 'exists') filtered = imgs.filter(i => i.alt !== null && i.alt !== '');
            renderImagesList(filtered);
        });
    });

    // Check image sizes
    const btnCheckSize = document.getElementById('images-check-size');
    if (btnCheckSize) {
        // Remove old listeners to avoid duplicates if tab is refilled
        const clonedBtn = btnCheckSize.cloneNode(true);
        btnCheckSize.parentNode.replaceChild(clonedBtn, btnCheckSize);

        clonedBtn.addEventListener('click', async () => {
            if (clonedBtn.disabled) return;
            clonedBtn.disabled = true;
            clonedBtn.textContent = 'Проверяю (0%)...';

            const imageItems = document.querySelectorAll('.images-list .image-item');
            const total = imageItems.length;
            let current = 0;

            for (const imgItem of imageItems) {
                current++;
                clonedBtn.textContent = `Проверяю (${Math.round((current/total)*100)}%)...`;

                const srcEl = imgItem.querySelector('.image-item__src a');
                if (!srcEl) continue;

                // Construct absolute URL
                let fullUrl = '';
                try {
                    fullUrl = new URL(srcEl.getAttribute('href'), globalUrl).href;
                } catch (e) {
                    continue;
                }

                try {
                    const response = await new Promise(resolve => {
                        chrome.runtime.sendMessage({ action: 'fetchImageSize', url: fullUrl }, resolve);
                    });

                    if (response && response.size > 0) {
                        const kb = Math.round(response.size / 1024);
                        let sizeDiv = imgItem.querySelector('.image-item__weight');
                        if (!sizeDiv) {
                            sizeDiv = document.createElement('div');
                            sizeDiv.className = 'image-item__weight';
                            sizeDiv.style.marginTop = '4px';
                            sizeDiv.style.fontSize = '12px';
                            sizeDiv.style.fontWeight = 'bold';
                            imgItem.querySelector('.image-item__info').appendChild(sizeDiv);
                        }
                        sizeDiv.textContent = `Вес: ${kb} КБ`;
                        if (kb > 300) {
                            sizeDiv.style.color = 'var(--error)';
                        } else {
                            sizeDiv.style.color = 'var(--success)';
                        }
                    }
                } catch (e) {}
            }
            clonedBtn.textContent = 'Проверено ✓';
        });
    }
}

function renderImagesList(imgs) {
    // Ensure container exists
    let container = document.querySelector('#images .images-list');
    if (!container) {
        const dd = document.querySelector('#images .dropdown');
        if (!dd) return;
        container = document.createElement('div');
        container.className = 'images-list';
        dd.innerHTML = '';
        dd.appendChild(container);
    }
    if (!container) return;
    container.innerHTML = '';
    if (!imgs.length) {
        container.innerHTML = '<div class="empty-value" style="padding:8px">Нет данных для отображения</div>';
        return;
    }
    imgs.forEach(img => {
        const div = document.createElement('div');
        div.className = 'image-item';
        const altDisplay = img.alt === null ? '<span class="status-badge status-4xx">Нет alt</span>' :
            img.alt === '' ? '<span class="status-badge status-3xx">Пустой alt</span>' :
                `<span class="status-badge status-2xx">${escHtml(img.alt)}</span>`;
        const srcShort = img.src && img.src.length > CONFIG.MAX_IMAGE_SRC_LENGTH ? img.src.slice(0, CONFIG.MAX_IMAGE_SRC_SHORT_LENGTH) + '…' : (img.src || '');
        const rawSrc = String(img.src || '').trim();
        let resolvedSrc = '';
        try {
            resolvedSrc = rawSrc ? new URL(rawSrc, globalUrl).href : '';
        } catch {
            resolvedSrc = rawSrc;
        }
        div.innerHTML = `
            <img class="image-item__thumb" alt="" loading="lazy">
            <div class="image-item__info">
                <div class="image-item__src"><a></a></div>
                <div class="image-item__alt">Alt: ${altDisplay}</div>
                ${img.width || img.height ? `<div class="image-item__size">${img.width}Г—${img.height}</div>` : ''}
            </div>`;
        setExternalLink(div.querySelector('.image-item__src a'), img.src, srcShort, img.src);
        const previewImg = div.querySelector('.image-item__thumb');
        if (previewImg) {
            previewImg.referrerPolicy = 'no-referrer';
            previewImg.onerror = () => { previewImg.style.opacity = '0.2'; };
            if (resolvedSrc) {
                previewImg.src = resolvedSrc;
            }
        }
        container.appendChild(div);
    });
}

// ================================================================
// TAB 6: MICRODATA
// ================================================================
