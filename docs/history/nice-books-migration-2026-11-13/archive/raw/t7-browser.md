# T7 real browser acceptance

Date: 2026-11-13 (UTC). Target supplied by the lead: blog `main` SHA `b76d657544238bb0fa0b47dc7ff6853c82d4e260`, Pages run `43411464223`, deployment `7763262102`. The browser run began at `2026-11-13T10:53:49Z` and ended at `2026-11-13T10:54:47Z`. This records browser behavior only; the lead's artifact comparison remains the authority for matching the deployed output to that SHA.

## Result

- Headless Chromium 151.0.7922.34. All navigation used the real `https://caiyan12.github.io` origin. No host mapping, request routing, resource blocking, or response replacement was used.
- 18/18 browser journeys passed: desktop and mobile menu entry; independent home → archive → detail; same shelf detail navigation and browser back; return to the blog; direct open and refresh of `/nice-books/`, `/nice-books/archive/`, `/nice-books/01/`; three legacy `/books/` redirects; and the invalid-book 404 with both return links.
- Same shelf navigation started only after `window.swup.hooks.on` was available. `/01/` → `/02/` → browser back preserved `documentId` and `performance.timeOrigin`; each direction had document-response delta 0 and a successful 200 Swup fetch. `visit:start`, `content:replace`, `page:view`, and `visit:end` were recorded for both visits.
- Desktop and mobile menu links landed on `/nice-books/` with HTTP 200. The mobile viewport was 390×844; document and body widths were both 390px.
- Direct open and refresh returned HTTP 200 for home, archive, and `/01/`. Legacy `/books/`, `/books/archive/`, and `/books/01/` each returned 200 before redirect and landed on the corresponding `/nice-books/` route with final document status 200. Exact encoded Chinese query strings and hashes were preserved.
- `/nice-books/99/` returned a real HTTP 404 with the Nice Books title, “页面没有找到”, `noindex,follow`, and both expected links. Both links were clicked; home and archive returned HTTP 200 through Swup.
- Final run: 0 unexpected same-origin HTTP errors, 0 failed same-origin requests, 0 `pageerror`s, and 0 third-party HTTP/request failures. The three console 404 messages all point to the exact invalid `/nice-books/99/` URL and match its two expected document 404 responses and one expected Swup fetch 404. No other console errors were recorded.
- Navigations waited for `domcontentloaded` and the needed page content, not `load`. External music and font requests were left untouched; the final run recorded no failed third-party requests.

## Probe corrections

1. Attempt 1 read the archive's `#nb-books-main h1` as if a detail page had loaded; both templates use that selector, while the archive heading is “书库”. The wait now requires a non-archive heading before reading the related shelf. This was a probe timing/selector defect, not a product failure.
2. Attempt 2 passed all 18 journeys but marked the expected `/nice-books/99/` Swup fetch 404 unexpected. The earlier independent-site T5 acceptance explicitly records this exact fetch 404 as expected for the invalid route. The final classification allows only status 404 on the exact `/nice-books/99/` URL for `document` or `fetch`; all other same-origin failures remain blocking.

## Independent-site acceptance before blog switch

The separate Nice Books T5 record states that issue #158 passed and was closed against SHA `10f6a4edf7a482647d116834cfb8185f02b5b7a4`, with its corresponding Pages run and artifact checks. Source record: `D:\pages\nice-books\docs\t5-acceptance.md`. This is the acceptance that preceded the blog switch; the T7 browser run above verifies the joint live routes after the switch.

## Cache observations

`before-http-snapshot.json` was captured at `2026-11-13T10:46:54Z`, nine seconds after the deployment success time later supplied by the lead. It is an early post-deployment HTTP snapshot, not a pre-deployment baseline. Blog HTML responses showed `Last-Modified: Fri, 13 Nov 2026 10:46:34 GMT` and `Cache-Control: max-age=600`; the old paths already served the new redirect HTML. This timestamp is eleven seconds earlier than deployment completion and is not used as a deployment identity check. The browser run used fresh contexts; no stale-page conclusion is inferred here. See the lead's run-artifact SHA/content comparison for deployment identity.

## Evidence files

- `online-journey.mjs`: repeatable real-origin browser journey.
- `online-journey.json`: final detailed report, including document/fetch statuses, headers, request counts, failures, errors, and Swup events.
- `desktop-home.png`, `mobile-home.png`: final full-page screenshots at 1440×900 and 390×844 viewports.
- `before-http-snapshot.json`: early post-deployment HTTP and cache-header evidence, with the timing caveat above.
- `online-journey-attempt-01.json`, `online-journey-attempt-02.json`: preserved raw probe attempts and findings before final classification.
