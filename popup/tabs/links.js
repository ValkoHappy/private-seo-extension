function fillLinksTab(data) {
    const aTags = data.aTags || [];

    allLinksData = aTags.map((a, i) => {
        let protocol = 'other';
        try {
            const u = new URL(a.hrefFull || a.href);
            protocol = u.protocol === 'https:' ? 'https' : u.protocol === 'http:' ? 'http' : 'other';
        } catch (e) {}
        return {
            id: i,
            href: a.href,
            hrefFull: a.hrefFull || a.href,
            innerText: a.innerText || '',
            rel: a.rel || '',
            isExternal: a.isExternal,
            protocol,
            statusCode: null,
            statusCategory: null
        };
    });

    const internal = allLinksData.filter(l => !l.isExternal).length;
    const external = allLinksData.filter(l => l.isExternal).length;
    const https = allLinksData.filter(l => l.protocol === 'https').length;
    const http = allLinksData.filter(l => l.protocol === 'http').length;
    const protoOther = allLinksData.filter(l => l.protocol === 'other').length;
    const follow = allLinksData.filter(l => !l.rel || (!l.rel.includes('nofollow') && !l.rel.includes('ugc') && !l.rel.includes('sponsored'))).length;
    const nofollow = allLinksData.filter(l => l.rel && (l.rel.includes('nofollow') || l.rel.includes('ugc') || l.rel.includes('sponsored'))).length;
    const relOther = allLinksData.filter(l => l.rel && !l.rel.includes('nofollow') && !l.rel.includes('ugc') && !l.rel.includes('sponsored')).length;

    setLabel('links-href-radio-all', `Все ссылки (${allLinksData.length})`);
    setLabel('links-href-radio-internal', `Внутренние (${internal})`);
    setLabel('links-href-radio-external', `Внешние (${external})`);
    setLabel('links-protocol-radio-https', `https (${https})`);
    setLabel('links-protocol-radio-http', `http (${http})`);
    setLabel('links-protocol-radio-other', `Другой (${protoOther})`);
    setLabel('links-rel-radio-follow', `follow (${follow})`);
    setLabel('links-rel-radio-nofollow', `nofollow (${nofollow})`);
    setLabel('links-rel-radio-other', `Другой (${relOther})`);
    renderLinksList(allLinksData);

    document.querySelectorAll('[name="links-href-radio"], [name="links-protocol-radio"], [name="links-rel-radio"], [name="links-rel-status-code"]').forEach(radio => {
        radio.addEventListener('change', () => renderLinksList(getFilteredLinks()));
    });

    const checkBtn = document.getElementById('links-start-check');
    if (checkBtn) {
        checkBtn.addEventListener('click', () => checkAllLinks(checkBtn));
    }

    const exportBtn = document.getElementById('links-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportLinks);
    }

    const copyBtn = document.getElementById('links-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const text = getFilteredLinks().map(l =>
                `${l.hrefFull}\t${l.innerText}\t${l.rel || 'follow'}\t${l.statusCode || ''}`
            ).join('\n');
            copyToClipboard(text);
        });
    }
}

function getFilteredLinks() {
    const typeVal = document.querySelector('[name="links-href-radio"]:checked')?.value || 'all';
    const protoVal = document.querySelector('[name="links-protocol-radio"]:checked')?.value || 'all';
    const relVal = document.querySelector('[name="links-rel-radio"]:checked')?.value || 'all';
    const statusVal = document.querySelector('[name="links-rel-status-code"]:checked')?.value || 'all';

    return allLinksData.filter(l => {
        if (typeVal === 'internal' && l.isExternal) return false;
        if (typeVal === 'external' && !l.isExternal) return false;
        if (protoVal !== 'all' && l.protocol !== protoVal) return false;
        const isNofollow = l.rel && (l.rel.includes('nofollow') || l.rel.includes('ugc') || l.rel.includes('sponsored'));
        const hasOtherRel = l.rel && !l.rel.includes('nofollow') && !l.rel.includes('ugc') && !l.rel.includes('sponsored');
        if (relVal === 'follow' && isNofollow) return false;
        if (relVal === 'nofollow' && !isNofollow) return false;
        if (relVal === 'other' && !hasOtherRel) return false;
        if (statusVal !== 'all' && l.statusCode !== null) {
            if (!l.statusCategory || l.statusCategory !== statusVal) return false;
        }
        return true;
    });
}

function renderLinksList(links) {
    const dd = document.querySelector('#links .dropdown.active, #links .dropdown');
    if (!dd) return;
    dd.innerHTML = '';
    if (!links.length) {
        dd.innerHTML = '<div class="dropdown__item"><span class="empty-value">Нет ссылок</span></div>';
        return;
    }
    links.forEach(link => {
        const div = document.createElement('div');
        div.className = 'link-card';
        div.dataset.linkId = link.id;
        const relBadge = link.rel
            ? `<span class="link-rel-badge">${escHtml(link.rel)}</span>`
            : `<span class="link-rel-badge link-rel-follow">follow</span>`;
        const statusBadge = link.statusCode !== null
            ? `<span class="status-badge status-${link.statusCategory}">${link.statusCode}</span>`
            : '';
        const anchor = escHtml(link.innerText) || '<span class="empty-value">(пусто)</span>';
        const hrefFull = link.hrefFull || link.href || '';
        const hrefShort = hrefFull.length > CONFIG.MAX_URL_DISPLAY_LENGTH
            ? hrefFull.slice(0, CONFIG.MAX_URL_SHORT_LENGTH) + '…'
            : hrefFull;
        div.innerHTML = `
            <div class="link-card__top">
                <span class="link-card__anchor">${anchor}</span>
                <div class="link-card__badges">${relBadge}${statusBadge}</div>
            </div>
            <a class="link-card__href"></a>`;
        setExternalLink(div.querySelector('.link-card__href'), hrefFull, hrefShort, hrefFull);
        dd.appendChild(div);
    });
    dd.classList.add('active');
}

async function checkAllLinks(btn) {
    const timeoutInput = document.querySelector('input[name="links-fetch-timeout"]');
    const delay = parseInt(timeoutInput?.value || '200', 10);

    if (checkLinksAbortController) {
        checkLinksAbortController.abort();
    }
    checkLinksAbortController = new AbortController();
    const signal = checkLinksAbortController.signal;

    btn.disabled = true;
    btn.textContent = 'Проверяем...';

    const statusFilter = document.querySelector('[data-status-filter]');
    if (statusFilter) statusFilter.style.display = '';

    const statusCounts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 };

    try {
        for (const link of allLinksData) {
            if (signal.aborted) break;

            await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'checkLinkStatus', url: link.hrefFull || link.href }, (res) => {
                    const code = res ? res.statusCode : 0;
                    link.statusCode = code;
                    if (code >= 200 && code < 300) { link.statusCategory = '2xx'; statusCounts['2xx']++; }
                    else if (code >= 300 && code < 400) { link.statusCategory = '3xx'; statusCounts['3xx']++; }
                    else if (code >= 400 && code < 500) { link.statusCategory = '4xx'; statusCounts['4xx']++; }
                    else if (code >= 500 && code < 600) { link.statusCategory = '5xx'; statusCounts['5xx']++; }
                    else { link.statusCategory = 'other'; statusCounts.other++; }
                    resolve();
                });
            });
            if (delay > 0 && !signal.aborted) await sleep(delay);
        }

        ['2xx', '3xx', '4xx', '5xx', 'other'].forEach(cat => {
            const spans = document.querySelectorAll(`#links-rel-status-code-${cat} + label [data-count]`);
            spans.forEach(s => { s.textContent = statusCounts[cat]; });
        });

        renderLinksList(getFilteredLinks());
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Ошибка при проверке ссылок:', err);
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Проверить';
        checkLinksAbortController = null;
    }
}

function exportLinks() {
    const links = getFilteredLinks();
    const csvRows = ['Href\tАнкор\tRel\tСтатус', ...links.map(l =>
        `${l.hrefFull}\t${l.innerText}\t${l.rel || 'follow'}\t${l.statusCode || ''}`)];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'links.csv';
    a.click();
    URL.revokeObjectURL(url);
}
