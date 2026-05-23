// Runs before claude.ai page scripts (Electron preload).
(function () {
  try {
    const ZH = "claude-zh://i18n/zh-CN.json";
    const ST = "claude-zh://i18n/statsig/zh-CN.json";
    const map = (s) => {
      if (!s) return s;
      s = String(s);
      if (s.includes("/i18n/statsig/") && s.includes("en-US")) return ST;
      if (s.includes("/i18n/en-US.json")) return ZH;
      if (s.includes("/i18n/zh-CN.json") && !s.includes("statsig")) return ZH;
      if (s.includes("/i18n/statsig/zh-CN.json")) return ST;
      return s;
    };
    const _fetch = fetch;
    window.fetch = function (u, ...a) {
      return _fetch.call(this, map(u), ...a);
    };
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u, ...r) {
      return _open.call(this, m, map(u), ...r);
    };
    try {
      localStorage.setItem("locale", "zh-CN");
    } catch (e) {}
  } catch (e) {}
})();
