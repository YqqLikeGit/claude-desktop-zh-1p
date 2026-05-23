(function () {
  try {
    const { app, session, protocol, net } = require("electron");
    const path = require("path");
    const fs = require("fs");
    const http = require("http");
    const { pathToFileURL } = require("url");

    const PORT = 47123;

    const ud = () => {
      try {
        return app.getPath("userData");
      } catch (e) {
        return path.join(require("os").homedir(), "Library/Application Support/Claude");
      }
    };

    const log = (m) => {
      try {
        fs.appendFileSync(path.join(ud(), "zh-cn-hook.log"), new Date().toISOString() + " " + m + "\n");
      } catch (e) {}
    };

    const pd = path.join(ud(), "zh-cn-patches");
    const zh = path.join(pd, "zh-CN.json");
    const st = path.join(pd, "statsig-zh-CN.json");

    const forceLocale = () => {
      try {
        const cfgPath = path.join(ud(), "config.json");
        const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
        if (cfg.locale !== "zh-CN") {
          cfg.locale = "zh-CN";
          fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
          log("config locale -> zh-CN");
        }
      } catch (e) {
        log("config err " + e);
      }
    };
    forceLocale();

    let port = 0;
    const server = http.createServer((req, res) => {
      try {
        const p = (req.url || "/").split("?")[0];
        const file = p.endsWith("statsig-zh-CN.json") || p.includes("statsig")
          ? st
          : p.includes("zh-CN") || p.includes("en-US")
            ? zh
            : null;
        if (!file || !fs.existsSync(file)) {
          res.writeHead(404);
          return res.end("missing");
        }
        log("http serve " + path.basename(file));
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        });
        fs.createReadStream(file).pipe(res);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    server.listen(PORT, "127.0.0.1", () => {
      port = server.address().port;
      log("i18n server " + port);
    });

    const local = (p) => "http://127.0.0.1:" + port + p;

    const inj = `(()=>{try{
if(window.__zh1pDone)return;window.__zh1pDone=1;
const B="http://127.0.0.1:${PORT}";
const map=(s)=>{if(!s)return s;s=String(s);
if(s.includes("/i18n/statsig/")&&(s.includes("en-US")||s.includes("zh-CN")))return B+"/i18n/statsig/zh-CN.json";
if(s.includes("/i18n/")&&(s.includes("en-US.json")||s.includes("zh-CN.json")))return B+"/i18n/zh-CN.json";
return s;};
const _fetch=fetch;window.fetch=function(u,...a){return _fetch.call(this,map(u),...a)};
const _open=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u,...r){return _open.call(this,m,map(u),...r)};
try{localStorage.setItem("locale","zh-CN")}catch(e){}
}catch(e){}})();`;

    const attach = (ses) => {
      if (!ses || ses.__zh1p) return;
      ses.__zh1p = 1;

      ses.webRequest.onHeadersReceived({ urls: ["*://claude.ai/*"] }, (d, cb) => {
        try {
          const headers = { ...d.responseHeaders };
          const key = Object.keys(headers).find((k) => k.toLowerCase() === "content-security-policy");
          if (key) {
            const val = Array.isArray(headers[key]) ? headers[key][0] : headers[key];
            if (val && !val.includes("127.0.0.1:" + port)) {
              headers[key] = [val + " http://127.0.0.1:" + port];
            }
          }
          return cb({ responseHeaders: headers });
        } catch (e) {}
        cb({});
      });

      ses.webRequest.onBeforeRequest({ urls: ["*://claude.ai/i18n/*"] }, (d, cb) => {
        try {
          if (!port) return cb({});
          const u = d.url;
          if (u.includes("/i18n/statsig/")) {
            log("redirect statsig");
            return cb({ redirectURL: local("/i18n/statsig/zh-CN.json") });
          }
          if (u.includes("/i18n/")) {
            log("redirect i18n");
            return cb({ redirectURL: local("/i18n/zh-CN.json") });
          }
        } catch (e) {
          log("route err " + e);
        }
        cb({});
      });
    };

    const hookWc = (wc) => {
      if (!wc || wc.__zhInj) return;
      wc.__zhInj = 1;
      const run = () => wc.executeJavaScript(inj, true).catch(() => {});
      wc.on("did-start-navigation", (_, url) => {
        if (String(url).includes("claude.ai")) run();
      });
      wc.on("did-finish-load", run);
    };

    app.on("web-contents-created", (_, wc) => hookWc(wc));

    app.whenReady().then(async () => {
      for (const d of ["Cache", "Code Cache", "GPUCache"]) {
        try {
          fs.rmSync(path.join(ud(), d), { recursive: true, force: true });
        } catch (e) {}
      }
      try {
        await session.defaultSession.clearCache();
        log("cache cleared");
      } catch (e) {
        log("clearCache " + e);
      }
      attach(session.defaultSession);
      app.on("session-created", attach);
      log("hook ready v12");
    }).catch((e) => log("whenReady " + e));
  } catch (e) {
    try {
      require("fs").appendFileSync("/tmp/claude-zh-1p-fatal.log", String(e) + "\n");
    } catch (_) {}
  }
})();
