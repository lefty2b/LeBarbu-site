(() => {
  "use strict";

  const translations = window.SITE_TRANSLATIONS;
  if (!translations) return;
  const languages = {
    fr: "Français", co: "Corsu", en: "English", "zh-Hans": "简体中文",
    de: "Deutsch", es: "Español", it: "Italiano", "pt-BR": "Português (Brasil)",
    ko: "한국어", ja: "日本語"
  };
  const storageKey = "lefty2b.site.language";
  const page = document.body.dataset.page;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function normalize(value) {
    const tag = String(value || "").trim().replaceAll("_", "-").toLowerCase();
    if (tag === "zhhans" || tag === "zh" || tag.startsWith("zh-")) return "zh-Hans";
    if (tag === "ptbr" || tag === "pt" || tag.startsWith("pt-")) return "pt-BR";
    const base = tag.split("-")[0];
    return own(languages, base) ? base : null;
  }

  function initialLanguage() {
    const requested = normalize(new URL(location.href).searchParams.get("lang"));
    if (requested) return requested;
    try {
      const saved = normalize(localStorage.getItem(storageKey));
      if (saved) return saved;
    } catch { /* Private browsing can disable storage. */ }
    for (const locale of navigator.languages || [navigator.language]) {
      const supported = normalize(locale);
      if (supported) return supported;
    }
    return "fr";
  }

  const header = document.createElement("header");
  header.className = "site-header";
  const tabs = document.querySelector(".app-tabs");
  if (tabs) header.append(tabs);
  const label = document.createElement("label");
  label.className = "language-control";
  const caption = document.createElement("span");
  caption.dataset.i18n = "language";
  const select = document.createElement("select");
  select.id = "site-language";
  select.name = "language";
  for (const [code, name] of Object.entries(languages)) {
    const option = new Option(name, code);
    option.lang = code;
    select.add(option);
  }
  label.append(caption, select);
  header.append(label);
  document.querySelector("main").prepend(header);
  document.body.classList.add("localized");

  // Keep the real link nodes, never inject HTML from a translation.
  const nodes = [...document.querySelectorAll("[data-i18n]")].map(node => ({
    node, key: node.dataset.i18n, link: node.querySelector("a")
  }));

  function fitLegalTitle() {
    const title = document.querySelector(".legal-card h1");
    if (!title) return;
    title.style.fontSize = "";
    const style = getComputedStyle(title);
    const canvas = document.createElement("canvas").getContext("2d");
    if (!canvas) return;
    canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const text = style.textTransform === "uppercase" ? title.textContent.toUpperCase() : title.textContent;
    const longest = Math.max(...text.split(/\s+/).map(word => canvas.measureText(word).width));
    if (longest > title.clientWidth) {
      title.style.fontSize = `${Math.max(18, Math.floor(parseFloat(style.fontSize) * title.clientWidth / longest))}px`;
    }
  }

  function render(language, remember = false) {
    const copy = { ...translations[language], ...window.PRIVACY_TRANSLATIONS?.[language] };
    document.documentElement.lang = language;
    select.value = language;
    for (const { node, key, link } of nodes) {
      const value = copy[key];
      if (typeof value !== "string") continue;
      if (link && value.includes("{link}")) {
        const [before, after] = value.split("{link}");
        node.replaceChildren(document.createTextNode(before), link, document.createTextNode(after));
      } else {
        node.textContent = value;
      }
    }
    for (const node of document.querySelectorAll("[data-i18n-aria]")) {
      node.setAttribute("aria-label", copy[node.dataset.i18nAria]);
    }
    const emblem = document.querySelector(".hero__emblem");
    if (emblem) emblem.alt = copy.emblem;
    const stores = document.querySelector(".hero__stores");
    if (stores) {
      stores.setAttribute("aria-label", copy.downloads);
      [...stores.querySelectorAll("a")].forEach((link, index) => {
        const text = copy[index === 0 ? "apple" : "google"];
        link.setAttribute("aria-label", text);
        link.querySelector("img").alt = text;
      });
    }
    const scopeLink = document.querySelector('[data-i18n="scopeText"] a');
    if (scopeLink) scopeLink.textContent = copy.ohhellTitle;
    document.title = page === "privacy"
      ? `${copy.privacy} - Le Barbu & OH HELL!` : copy[`${page}Title`];
    document.querySelector('meta[name="description"]').content = copy[`${page}Description`];
    fitLegalTitle();

    for (const link of document.querySelectorAll("a[href]")) {
      const url = new URL(link.getAttribute("href"), location.href);
      if (url.origin === location.origin && /\/(?:index|oh-hell|privacy)\.html$/.test(url.pathname)) {
        url.searchParams.set("lang", language);
        // Relative links also work when the static site is opened from disk.
        link.setAttribute("href", `./${url.pathname.split("/").pop()}${url.search}${url.hash}`);
      }
    }
    const url = new URL(location.href);
    url.searchParams.set("lang", language);
    try { history.replaceState(null, "", url); } catch { /* Some file viewers forbid this. */ }
    if (remember) {
      try { localStorage.setItem(storageKey, language); } catch { /* Navigation still carries the choice. */ }
    }
  }
  select.addEventListener("change", () => render(select.value, true));
  window.addEventListener("popstate", () => render(initialLanguage()));
  window.addEventListener("resize", fitLegalTitle);
  document.fonts?.ready.then(fitLegalTitle);
  render(initialLanguage(), Boolean(normalize(new URL(location.href).searchParams.get("lang"))));
})();
