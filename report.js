document.addEventListener('DOMContentLoaded', () => {
    const printBtn = document.getElementById('printReportBtn');
    if (printBtn) {
        printBtn.addEventListener('click', downloadPdfReport);
    }

    chrome.storage.local.get(['seoReportData'], (result) => {
        const data = result.seoReportData;
        if (!data) {
            renderNoDataMessage();
            return;
        }

        setTextOrDash('reportDate', data.date);
        setTextOrDash('reportUrl', data.url);

        const scoreEl = document.getElementById('reportScore');
        if (scoreEl) {
            scoreEl.textContent = data.score || '--/100';
            const scoreVal = parseInt((data.score || '').split('/')[0], 10) || 0;
            if (scoreVal >= 80) scoreEl.style.color = '#22c55e';
            else if (scoreVal >= 50) scoreEl.style.color = '#f59e0b';
            else scoreEl.style.color = '#ef4444';
        }

        renderIssuesSection(data.auditIssues || []);
        setTextOrDash('reportTitle', data.title);
        setTextOrDash('reportDesc', data.description);
        setTextOrDash('reportH1', data.h1);
        setTextOrDash('reportCanonical', data.canonical);
        setTextOrDash('reportRobots', data.robots);

        setTextOrDash('reportLcp', data.lcp ? `${data.lcp} мс` : '');
        setTextOrDash('reportCls', data.cls);
        setTextOrDash('reportTtfb', data.ttfb ? `${data.ttfb} мс` : '');

        setTextOrDash('reportWords', data.wordCount);
        setTextOrDash('reportLinksTotal', data.linksTotal);
        setTextOrDash('reportLinksInternal', data.linksInternal);
        setTextOrDash('reportLinksExternal', data.linksExternal);
        setTextOrDash('reportLinksNofollow', data.linksNofollow);
        setTextOrDash('reportImagesTotal', data.imagesTotal);
        setTextOrDash('reportImagesNoAlt', data.imagesNoAlt);
        setTextOrDash('reportOgTitle', data.ogTitle);

        renderOgImage(data.ogImage);
        renderHeadingsConfig(data.headingsConfig);
        renderAiSection(data);
        chrome.storage.local.remove('seoReportData');
    });
});

async function downloadPdfReport() {
    const printBtn = document.getElementById('printReportBtn');
    const reportWrapper = document.getElementById('reportWrapper');

    if (!reportWrapper) return;

    if (typeof window.html2pdf !== 'function') {
        window.print();
        return;
    }

    const originalLabel = printBtn ? printBtn.textContent : '';
    if (printBtn) {
        printBtn.disabled = true;
        printBtn.textContent = 'Подготовка PDF...';
        printBtn.style.opacity = '0.7';
        printBtn.style.cursor = 'wait';
    }

    const exportHost = document.createElement('div');
    exportHost.style.position = 'fixed';
    exportHost.style.left = '-100000px';
    exportHost.style.top = '0';
    exportHost.style.width = '900px';
    exportHost.style.background = '#ffffff';
    exportHost.style.zIndex = '-1';

    const exportNode = reportWrapper.cloneNode(true);
    exportNode.querySelectorAll('img').forEach((img) => img.remove());
    exportHost.appendChild(exportNode);
    document.body.appendChild(exportHost);

    try {
        const filename = buildPdfFileName();
        await window.html2pdf().set({
            margin: [10, 10, 10, 10],
            filename,
            image: { type: 'jpeg', quality: 0.96 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: {
                mode: ['css', 'legacy'],
                avoid: ['header', 'h1', '.url-highlight', '.score-block', '.section', '.data-item', '#aiReportSection']
            }
        }).from(exportNode).save();
    } catch (error) {
        console.error('PDF export failed', error);
        alert('Не удалось скачать PDF. Откройте консоль и проверьте ошибку.');
    } finally {
        exportHost.remove();
        if (printBtn) {
            printBtn.disabled = false;
            printBtn.textContent = originalLabel;
            printBtn.style.opacity = '';
            printBtn.style.cursor = '';
        }
    }
}

function buildPdfFileName() {
    const urlText = document.getElementById('reportUrl')?.textContent || 'report';
    let host = 'report';

    try {
        host = new URL(urlText).hostname.replace(/^www\./, '') || host;
    } catch {}

    const date = new Date().toISOString().slice(0, 10);
    return `${host}-seo-report-${date}.pdf`;
}

function renderNoDataMessage() {
    document.body.replaceChildren();
    const title = document.createElement('h2');
    title.style.padding = '40px';
    title.style.textAlign = 'center';
    title.textContent = 'Нет данных для отчета. Пожалуйста, сгенерируйте отчет из расширения.';
    document.body.appendChild(title);
}

function setTextOrDash(id, text) {
    const el = document.getElementById(id);
    if (!el) return;

    el.replaceChildren();
    if (text === undefined || text === null || text === '') {
        const dash = document.createElement('span');
        dash.className = 'warning-text';
        dash.textContent = '—';
        el.appendChild(dash);
        return;
    }

    el.textContent = String(text);
}

function isSafeHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function renderOgImage(url) {
    const container = document.getElementById('reportOgImage');
    if (!container) return;

    container.replaceChildren();
    if (!url || !isSafeHttpUrl(url)) {
        const dash = document.createElement('span');
        dash.className = 'warning-text';
        dash.textContent = '—';
        container.appendChild(dash);
        return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.color = '#4f46e5';
    link.textContent = url;

    const image = document.createElement('img');
    image.alt = 'Open Graph image preview';
    image.style.maxWidth = '200px';
    image.style.marginTop = '10px';
    image.style.borderRadius = '4px';
    image.style.border = '1px solid #eee';

    container.appendChild(link);
    container.appendChild(document.createElement('br'));

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'preview-load-btn';
    loadBtn.textContent = 'Загрузить превью';
    loadBtn.addEventListener('click', () => {
        image.referrerPolicy = 'no-referrer';
        image.src = url;
        container.appendChild(image);
        loadBtn.remove();
    }, { once: true });

    container.appendChild(loadBtn);
}

function renderHeadingsConfig(headingsConfig) {
    const container = document.getElementById('reportHeadingsConfig');
    if (!container) return;

    container.replaceChildren();

    if (!headingsConfig) {
        const empty = document.createElement('span');
        empty.className = 'warning-text';
        empty.textContent = 'Заголовки отсутствуют';
        container.appendChild(empty);
        return;
    }

    let hasAny = false;
    for (let i = 1; i <= 6; i++) {
        const num = headingsConfig[`h${i}`] || 0;
        if (num > 0 || i === 1) {
            hasAny = true;
            const badge = document.createElement('div');
            badge.className = `h-badge${i === 1 && num !== 1 ? ' error-text' : ''}`;
            badge.textContent = `H${i}: ${num}`;
            container.appendChild(badge);
        }
    }

    if (!hasAny) {
        const empty = document.createElement('span');
        empty.className = 'warning-text';
        empty.textContent = 'Заголовки отсутствуют';
        container.appendChild(empty);
    }
}

function appendReportRow(container, label, value) {
    const row = document.createElement('div');
    row.className = 'report-row';

    const labelEl = document.createElement('div');
    labelEl.className = 'report-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = 'report-value';
    valueEl.style.whiteSpace = 'pre-wrap';
    valueEl.textContent = value || '—';

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    container.appendChild(row);
}

function renderAiSection(data) {
    const aiSection = document.getElementById('aiReportSection');
    if (!aiSection || !data.aiMeta) return;

    aiSection.style.display = 'block';
    aiSection.replaceChildren();

    const title = document.createElement('div');
    title.className = 'report-section-title';
    title.style.color = '#4f46e5';
    title.style.marginBottom = '12px';
    title.textContent = 'AI SEO-анализ';
    aiSection.appendChild(title);

    if (data.aiMeta?.title) {
        appendReportRow(aiSection, 'AI Title', data.aiMeta.title);
        appendReportRow(aiSection, 'AI Description', data.aiMeta.description);
    }
    if (data.aiIntent) {
        appendReportRow(aiSection, 'Интент & LSI', data.aiIntent);
    }
    if (data.aiSpam) {
        appendReportRow(aiSection, 'Переспам', data.aiSpam);
    }
}

function renderIssuesSection(issues) {
    const summaryEl = document.getElementById('reportIssuesSummary');
    const listEl = document.getElementById('reportIssuesList');
    if (!summaryEl || !listEl) return;

    summaryEl.replaceChildren();
    listEl.replaceChildren();

    const counts = issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
    }, { critical: 0, warning: 0, info: 0 });

    [
        ['critical', `${counts.critical || 0} Critical`],
        ['warning', `${counts.warning || 0} Warning`],
        ['info', `${counts.info || 0} Info`]
    ].forEach(([severity, label]) => {
        const pill = document.createElement('span');
        pill.className = `issue-pill issue-pill--${severity}`;
        pill.textContent = label;
        summaryEl.appendChild(pill);
    });

    if (!issues.length) {
        const pill = document.createElement('span');
        pill.className = 'issue-pill issue-pill--success';
        pill.textContent = 'OK';
        summaryEl.appendChild(pill);

        const empty = document.createElement('div');
        empty.className = 'issue-card';
        const text = document.createElement('div');
        text.className = 'issue-card__text';
        text.textContent = 'Критичных и предупреждающих SEO-проблем по базовым правилам не найдено.';
        empty.appendChild(text);
        listEl.appendChild(empty);
        return;
    }

    issues.forEach((issue) => {
        const card = document.createElement('div');
        card.className = `issue-card issue-card--${issue.severity}`;

        const header = document.createElement('div');
        header.className = 'issue-card__header';

        const title = document.createElement('div');
        title.className = 'issue-card__title';
        title.textContent = issue.title;

        const pill = document.createElement('span');
        pill.className = `issue-pill issue-pill--${issue.severity}`;
        pill.textContent = issue.severity === 'critical' ? 'Critical' : issue.severity === 'warning' ? 'Warning' : 'Info';

        const details = document.createElement('div');
        details.className = 'issue-card__text';
        details.textContent = issue.details;

        const recommendation = document.createElement('div');
        recommendation.className = 'issue-card__text';
        recommendation.style.marginTop = '8px';
        recommendation.textContent = `Что делать: ${issue.recommendation}`;

        header.appendChild(title);
        header.appendChild(pill);
        card.appendChild(header);
        card.appendChild(details);
        card.appendChild(recommendation);
        listEl.appendChild(card);
    });
}
