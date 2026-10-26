# Privacy Policy

`PrivateSEO` is a browser extension for on-page SEO diagnostics.

## What the extension reads

The extension analyzes the currently opened page and can read:
- page URL
- page text
- title, meta tags, headings, canonical, hreflang, lang
- links, images, Open Graph, JSON-LD
- page-level performance signals available in the browser

This data is used locally inside the extension to render the audit results.

## External requests

The extension can make external requests in these cases:
- page status, `robots.txt`, `sitemap.xml`, link status, image size checks
- DNS/IP lookup for the current host on popup open
- Yandex IKS image on popup open
- image previews in the Images tab on popup open
- `og:image` preview in the Microdata tab on popup open
- AI analysis when the user explicitly starts an AI action

## AI analysis

AI features send the current page text through the following chain:

`Page -> content.js -> popup -> background/ai-checks.js -> configured HTTPS proxy -> AI provider`

Important details:
- the API key is not stored in the extension
- provider credentials are managed by the operator of the separate proxy server
- public builds leave the proxy address empty; no AI requests can be made until an endpoint is configured
- AI actions are initiated manually by the user
- for `file://`, `localhost`, and internal/private hosts, the extension asks for explicit confirmation before sending page text

## Report data

When the user generates a report, the extension temporarily stores report data in `chrome.storage.local` so that `report.html` can open in a new tab and render the document.

That temporary report payload is removed after the report page has been rendered.

## What is not collected automatically

The extension does not automatically:
- send page text to AI on popup open

## Contact / publication note

If you publish this extension in the Chrome Web Store, use this document as the baseline for the store privacy disclosure and adapt the contact details and legal entity information before publication.
