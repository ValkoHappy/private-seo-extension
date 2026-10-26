export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export async function requestStatus(url, method) {
    try {
        const response = await fetch(url, { method, redirect: 'manual' });
        const redirectTo = response.headers.get('location');
        const xRobotsTag = response.headers.get('x-robots-tag') || '';

        return {
            statusCode: response.status || 0,
            redirectTo: redirectTo ? new URL(redirectTo, url).href : '',
            xRobotsTag: xRobotsTag.trim()
        };
    } catch {
        return { statusCode: 0, redirectTo: '', xRobotsTag: '' };
    }
}

export async function fetchStatusWithFallback(url) {
    const headResult = await requestStatus(url, 'HEAD');
    if (headResult.statusCode && ![405, 501].includes(headResult.statusCode)) {
        return headResult;
    }
    return requestStatus(url, 'GET');
}
