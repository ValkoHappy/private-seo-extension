import { isValidUrl, fetchStatusWithFallback } from './network-client.js';

export class NetworkChecks {
    handle(request, sendResponse) {
        if (request.action === 'fetchRobotsTxt') {
            const url = new URL(request.url);
            const robotsUrl = `${url.origin}/robots.txt`;

            fetch(robotsUrl)
                .then((res) => res.text())
                .then((text) => sendResponse({ success: true, text }))
                .catch((err) => sendResponse({ success: false, error: err.toString() }));

            return true;
        }

        if (request.action === 'fetchServerData') {
            if (!request.url || !isValidUrl(request.url)) {
                sendResponse({ status: 0, robotsTxt: '', xRobots: '' });
                return true;
            }

            let urlObj;
            try {
                urlObj = new URL(request.url);
            } catch {
                sendResponse({ status: 0, robotsTxt: '', xRobots: '' });
                return true;
            }

            const robotsUrl = `${urlObj.origin}/robots.txt`;

            Promise.all([
                fetchStatusWithFallback(request.url).catch(() => ({
                    statusCode: 0,
                    xRobotsTag: ''
                })),
                fetch(robotsUrl)
                    .then((r) => r.text())
                    .catch(() => '')
            ]).then(([statusResult, robotsTxt]) => {
                sendResponse({
                    status: statusResult.statusCode || 0,
                    robotsTxt,
                    xRobots: statusResult.xRobotsTag || ''
                });
            });

            return true;
        }

        if (request.action === 'getIpInfo') {
            const hostname = request.hostname;

            fetch(`https://dns.google/resolve?name=${hostname}&type=A`)
                .then((r) => r.json())
                .then((dns) => {
                    const ip = (dns.Answer || []).find((a) => a.type === 1)?.data || '';
                    if (!ip) {
                        sendResponse({ ip: '', country: '', city: '', org: '' });
                        return;
                    }

                    return fetch(`https://ipinfo.io/${ip}/json`)
                        .then((r) => r.json())
                        .then((data) =>
                            sendResponse({
                                ip: data.ip || ip,
                                country: data.country || '',
                                city: data.city || '',
                                org: data.org || ''
                            })
                        );
                })
                .catch(() => sendResponse({ ip: '', country: '', city: '', org: '' }));

            return true;
        }

        if (request.action === 'checkLinkStatus') {
            const url = request.url;
            if (!url || !isValidUrl(url)) {
                sendResponse({ statusCode: 0, redirectTo: '' });
                return true;
            }

            fetchStatusWithFallback(url)
                .then((result) => sendResponse(result))
                .catch(() => sendResponse({ statusCode: 0, redirectTo: '' }));

            return true;
        }

        if (request.action === 'fetchImageSize') {
            const url = request.url;
            if (!url || !isValidUrl(url)) {
                sendResponse({ size: 0 });
                return true;
            }

            fetch(url, { method: 'HEAD' })
                .then((r) => {
                    const size = r.headers.get('content-length');
                    sendResponse({ size: size ? parseInt(size, 10) : 0 });
                })
                .catch(() => sendResponse({ size: 0 }));

            return true;
        }

        if (request.action === 'checkSitemap') {
            const origin = request.origin;
            const robotsUrl = `${origin}/robots.txt`;
            const defaultSitemap = `${origin}/sitemap.xml`;

            fetch(robotsUrl)
                .then((r) => r.text())
                .catch(() => '')
                .then(async (robotsTxt) => {
                    const sitemaps = [];

                    try {
                        robotsTxt.split('\n').forEach((line) => {
                            const match = line.match(/^Sitemap:\s*(.+)/i);
                            if (!match) return;

                            const sitemap = match[1].trim();
                            if (sitemap && !sitemaps.includes(sitemap)) {
                                sitemaps.push(sitemap);
                            }
                        });

                        if (!sitemaps.includes(defaultSitemap)) {
                            try {
                                const response = await fetch(defaultSitemap, {
                                    method: 'HEAD'
                                });
                                if (response.ok) sitemaps.push(defaultSitemap);
                            } catch {}
                        }

                        sendResponse({ sitemaps });
                    } catch {
                        sendResponse({ sitemaps: [] });
                    }
                })
                .catch(() => sendResponse({ sitemaps: [] }));

            return true;
        }
        return false;
    }
}
