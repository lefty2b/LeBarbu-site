// Run with Node and Playwright available (NODE_PATH may point to a shared install).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const vm = require("node:vm");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {} });
for (const file of ["translations.js", "privacy-translations.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
}
for (const dictionaries of Object.values(context.window)) {
  assert.equal(Object.keys(dictionaries).length, 10);
  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(dictionaries.fr).sort(), locale);
    for (const [key, value] of Object.entries(dictionary)) {
      assert.equal(typeof value, "string");
      assert.ok(value.trim(), `${locale}.${key}`);
      assert.equal((value.match(/\{link\}/g) || []).length,
        (dictionaries.fr[key].match(/\{link\}/g) || []).length, `${locale}.${key} link`);
    }
  }
}

const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader("Content-Type", `${mime[path.extname(file)] || "application/octet-stream"}; charset=utf-8`);
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
    const tab = await browser.newPage();
    const errors = [];
    tab.on("pageerror", error => errors.push(error.message));
    const locales = Object.keys(context.window.SITE_TRANSLATIONS);
    let count = 0;
    for (const width of [320, 390, 1440]) {
      await tab.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      for (const locale of locales) {
        for (const file of ["index.html", "oh-hell.html", "privacy.html"]) {
          await tab.goto(`${base}/${file}?lang=${locale}`);
          assert.equal(await tab.locator("html").getAttribute("lang"), locale);
          assert.equal(await tab.locator("#site-language").inputValue(), locale);
          const result = await tab.evaluate(() => {
            const locale = document.documentElement.lang;
            const copy = { ...window.SITE_TRANSLATIONS[locale], ...window.PRIVACY_TRANSLATIONS?.[locale] };
            const failures = [];
            for (const element of document.querySelectorAll("[data-i18n]")) {
              const key = element.dataset.i18n;
              if (!copy[key]) failures.push(`Missing: ${key}`);
              if (!copy[key]?.includes("{link}") && element.textContent !== copy[key]) failures.push(`Wrong: ${key}`);
              const range = document.createRange();
              range.selectNodeContents(element);
              const parent = element.getBoundingClientRect();
              for (const rect of range.getClientRects()) {
                if (rect.width && (rect.left < parent.left - 2 || rect.right > parent.right + 2)) {
                  failures.push(`Text overflow: ${key}`);
                  break;
                }
              }
            }
            for (const a of document.querySelectorAll('a[href^="./"]')) {
              if (new URL(a.href).searchParams.get("lang") !== locale) failures.push("Lost language link");
            }
            if ([...document.images].some(img => !img.complete || !img.naturalWidth)) failures.push("Missing image");
            const header = document.querySelector(".site-header").getBoundingClientRect();
            const emblem = document.querySelector(".hero__emblem")?.getBoundingClientRect();
            if (emblem && header.bottom > emblem.top) failures.push("Crown overlaps header");
            if (document.body.scrollWidth > innerWidth) failures.push("Page overflow");
            return failures;
          });
          assert.deepEqual(result, [], `${file} ${locale} ${width}: ${result.join(", ")}`);
          if (width === 390 && ((file === "index.html" && locale === "fr") || (file === "oh-hell.html" && locale === "co") || (file === "privacy.html" && locale === "de"))) {
            await tab.screenshot({ path: `/tmp/site-${file}-${locale}.png`, fullPage: true });
          }
          count++;
        }
      }
    }
    await tab.goto(`${base}/index.html?lang=co`);
    await tab.selectOption("#site-language", "ja");
    await tab.locator('.app-tab[href*="oh-hell"]').click();
    assert.equal(await tab.locator("html").getAttribute("lang"), "ja");
    await tab.goto(`${base}/privacy.html`);
    assert.equal(await tab.locator("html").getAttribute("lang"), "ja");
    await tab.goto(`${base}/privacy.html?lang=de#oh-hell`);
    assert.equal(await tab.locator("html").getAttribute("lang"), "de");
    assert.ok(tab.url().endsWith("#oh-hell"));
    for (const locale of locales) {
      await tab.selectOption("#site-language", locale);
      assert.equal(await tab.locator('[data-i18n="adsRights"] a').count(), 1);
      assert.equal(await tab.locator('[data-i18n="adsRights"] a').getAttribute("href"), "https://unity.com/legal/privacy-policy");
    }
    for (const [navigatorLanguage, expected] of [["it-IT", "it"], ["pt-PT", "pt-BR"], ["zh-CN", "zh-Hans"], ["nl-NL", "fr"]]) {
      const isolated = await browser.newContext({ locale: navigatorLanguage });
      await isolated.addInitScript(() => {
        Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
      });
      const page = await isolated.newPage();
      await page.goto(`${base}/index.html?lang=__proto__`);
      assert.equal(await page.locator("html").getAttribute("lang"), expected);
      await page.selectOption("#site-language", "en");
      assert.equal(await page.locator("html").getAttribute("lang"), "en");
      await isolated.close();
    }
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noJs.newPage();
    await fallback.goto(`${base}/privacy.html`);
    assert.ok((await fallback.locator("h1").textContent()).includes("confidentialité"));
    assert.equal(await fallback.locator('a[href="https://unity.com/legal/privacy-policy"]').count(), 1);
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log(`PASS: ${count} page/language/viewport combinations; dictionaries, links, persistence, URL priority, browser detection, blocked storage, no-JS fallback.`);
  } finally {
    await browser?.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
