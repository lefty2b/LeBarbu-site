# Website language checks

Run `node tests/languages.cjs` with Playwright installed. Set
`PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome instead of Playwright's
bundled Chromium. `NODE_PATH` can point to an existing shared package directory.

The test starts and stops its own loopback HTTP server. It checks all ten
languages on all three pages at 320, 390 and 1440 pixels, translation coverage,
text overflow, image loading, crown spacing, language persistence, navigation,
URL overrides, browser detection, unavailable storage and the no-JavaScript
French fallback. Three mobile screenshots are written to the system `/tmp`
directory for visual review.

Website copy lives in `translations.js`; the privacy policy translations live
in `privacy-translations.js`. Each locale must have the same keys as French.
Policy strings with `{link}` retain their original HTML link rather than
injecting markup. Keep legal translations aligned with the French source when
the app's privacy behavior changes.

The language precedence is `?lang=`, saved preference, browser languages, then
French. App locale aliases `zhHans` and `ptBR` are accepted; URLs use standard
`zh-Hans` and `pt-BR` tags. Example: `oh-hell.html?lang=co`.
