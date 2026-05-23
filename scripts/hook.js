(function () {
  try {
    const { app, session } = require("electron");
    const path = require("path");
    const fs = require("fs");
    const http = require("http");
    const https = require("https");

    const PORT = 47123;
    const ASSET_PREFIX = "/claude-ai/v2/assets/v1/";
    const CDN = "assets-proxy.anthropic.com";

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

    for (const d of ["Cache", "Code Cache", "GPUCache"]) {
      try {
        fs.rmSync(path.join(ud(), d), { recursive: true, force: true });
      } catch (e) {}
    }
    log("startup cache wiped");

    const pd = path.join(ud(), "zh-cn-patches");
    let remoteIndex = "index-CYu_8WXE.js";
    try {
      remoteIndex = JSON.parse(fs.readFileSync(path.join(pd, "manifest.json"), "utf8")).remote_index || remoteIndex;
    } catch (e) {}

    const idx = path.join(pd, remoteIndex);
    const zh = path.join(pd, "zh-CN.json");
    const st = path.join(pd, "statsig-zh-CN.json");
    let port = 0;
    let ready = false;

    const sendFile = (res, file, type) => {
      res.writeHead(200, {
        "Content-Type": type,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(file).pipe(res);
    };

    const proxyCdn = (req, res, targetPath, query) => {
      const opts = {
        hostname: CDN,
        path: targetPath + (query || ""),
        method: req.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "*/*",
        },
      };
      const upstream = https.request(opts, (up) => {
        res.writeHead(up.statusCode || 502, {
          ...up.headers,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        });
        up.pipe(res);
      });
      upstream.on("error", (e) => {
        log("proxy err " + e);
        res.writeHead(502);
        res.end("proxy error");
      });
      upstream.end();
    };

    const server = http.createServer((req, res) => {
      try {
        const raw = req.url || "/";
        const q = raw.indexOf("?");
        const urlPath = q >= 0 ? raw.slice(0, q) : raw;
        const query = q >= 0 ? raw.slice(q) : "";

        if (urlPath === ASSET_PREFIX + remoteIndex && fs.existsSync(idx)) {
          log("serve patched index");
          return sendFile(res, idx, "application/javascript");
        }
        if (urlPath === "/i18n/zh-CN.json" && fs.existsSync(zh)) {
          log("serve zh-CN i18n");
          return sendFile(res, zh, "application/json");
        }
        if (urlPath === "/i18n/statsig/zh-CN.json" && fs.existsSync(st)) {
          log("serve statsig zh-CN");
          return sendFile(res, st, "application/json");
        }
        if (urlPath.startsWith(ASSET_PREFIX)) {
          return proxyCdn(req, res, urlPath, query);
        }

        res.writeHead(404);
        res.end("missing");
      } catch (e) {
        log("server err " + e);
        res.writeHead(500);
        res.end(String(e));
      }
    });

    server.on("error", (e) => log("server listen err " + e));
    server.listen(PORT, "127.0.0.1", () => {
      port = server.address().port;
      ready = true;
      log("proxy ready " + port);
    });

    const local = (p) => "http://127.0.0.1:" + port + p;

    const attach = (ses) => {
      if (!ses || ses.__zh1p) return;
      ses.__zh1p = 1;

      ses.webRequest.onBeforeSendHeaders({ urls: ["*://assets-proxy.anthropic.com/*", "*://claude.ai/i18n/*"] }, (d, cb) => {
        try {
          return cb({
            requestHeaders: {
              ...d.requestHeaders,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });
        } catch (e) {}
        cb({});
      });

      ses.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (d, cb) => {
        try {
          if (!ready) return cb({});
          const u = d.url;
          const assetIdx = "/claude-ai/v2/assets/v1/" + remoteIndex;

          if (u.includes(CDN + assetIdx)) {
            log("redirect index");
            return cb({ redirectURL: local(assetIdx) });
          }
          if (u.includes(CDN + ASSET_PREFIX) && u.includes(ASSET_PREFIX)) {
            const p = u.slice(u.indexOf(ASSET_PREFIX));
            const pathOnly = p.split("?")[0];
            if (pathOnly !== assetIdx) {
              return cb({ redirectURL: local(pathOnly) });
            }
          }
          if ((u.includes("claude.ai/i18n/zh-CN.json") || u.endsWith("/i18n/zh-CN.json")) && !u.includes("statsig")) {
            log("redirect i18n");
            return cb({ redirectURL: local("/i18n/zh-CN.json") });
          }
          if (u.includes("/i18n/statsig/zh-CN.json")) {
            log("redirect statsig");
            return cb({ redirectURL: local("/i18n/statsig/zh-CN.json") });
          }
          if (u.includes("/i18n/en-US.json")) {
            log("redirect en-US to zh-CN");
            return cb({ redirectURL: local("/i18n/zh-CN.json") });
          }
        } catch (e) {
          log("req err " + e);
        }
        cb({});
      });
    };

    const inj = `(()=>{try{
const _fetch=fetch;
window.fetch=function(u,...a){try{const s=String(u);
if(s.includes("/i18n/en-US.json"))u=s.replace("/i18n/en-US.json","/i18n/zh-CN.json");
else if(s.includes("/i18n/")&&s.includes("en-US.json"))u=s.replace("en-US.json","zh-CN.json");
}catch(e){}return _fetch.call(this,u,...a)};
const _open=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u,...r){try{const s=String(u);
if(s.includes("/i18n/en-US.json"))u=s.replace("/i18n/en-US.json","/i18n/zh-CN.json");
}catch(e){}return _open.call(this,m,u,...r)};
const D=Intl.DisplayNames;
Intl.DisplayNames=function(l,o){const x=new D(l,o),g=x.of.bind(x);
x.of=function(c){return String(c).toLowerCase()==="zh-cn"?"简体中文 (中国)":g(c)};return x};
try{localStorage.setItem("locale","zh-CN")}catch(e){}
try{document.documentElement.lang="zh-CN"}catch(e){}
}catch(e){}})();`;

    const hookWc = (wc) => {
      if (!wc || wc.__zh1pInj) return;
      wc.__zh1pInj = 1;
      const run = () => wc.executeJavaScript(inj, true).catch(() => {});
      wc.on("did-start-navigation", (_, url) => {
        if (String(url).includes("claude.ai")) run();
      });
      wc.on("did-finish-load", run);
    };

    app.on("web-contents-created", (_, wc) => hookWc(wc));

    app.whenReady().then(async () => {
      try {
        await session.defaultSession.clearCache();
        log("memory cache cleared");
      } catch (e) {
        log("clearCache " + e);
      }
      try {
        attach(session.defaultSession);
        if (typeof session.getAllSessions === "function") {
          for (const s of session.getAllSessions()) attach(s);
        }
        app.on("session-created", attach);
        log("hook ready v6");
      } catch (e) {
        log("attach failed " + e);
      }
    }).catch((e) => log("whenReady " + e));
  } catch (e) {
    try {
      require("fs").appendFileSync("/tmp/claude-zh-1p-fatal.log", String(e) + "\n");
    } catch (_) {}
  }
})();
