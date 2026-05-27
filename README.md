# Claude Desktop 官方 Pro 账号 · 简体中文 (macOS)

[![GitHub stars](https://img.shields.io/github/stars/YqqLikeGit/claude-desktop-zh-1p?style=social)](https://github.com/YqqLikeGit/claude-desktop-zh-1p/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![macOS](https://img.shields.io/badge/platform-macOS-lightgrey)](https://github.com/YqqLikeGit/claude-desktop-zh-1p)
[![Claude Desktop](https://img.shields.io/badge/Claude-Desktop%201p-orange)](https://claude.ai)

**给用官方 claude.ai 订阅登录 Claude Desktop 的 Mac 用户** — Language 菜单没有中文、界面全英文？这个项目专门解决 **1p 官方账号** 的中文界面问题。

> 如果你用的是 API 网关 / 3p 本地 UI，请优先用 [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn)（900+ ⭐，支持 Win/Mac）。

**Author:** RUDY YU · [GitHub](https://github.com/YqqLikeGit/claude-desktop-zh-1p)

---

## 30 秒安装

```bash
git clone https://github.com/YqqLikeGit/claude-desktop-zh-1p.git
cd claude-desktop-zh-1p
open install-mac.command
```

1. **完全退出 Claude**（`Cmd+Q`，不是关窗口）
2. 双击 `install-mac.command`，输入 Mac 密码
3. 重新打开 Claude，等 10–15 秒

**成功标志：** 首页出现「晚上好」「今天我能帮你什么？」等中文文案。

---

## 和 javaht/claude-desktop-zh-cn 有什么不同？

| 场景 | [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn) | **本项目** |
|------|----------------------------|--------|
| 官方 Pro 账号登录 claude.ai | ❌ Language 无中文 | ✅ 界面中文 |
| API 网关 / 3p 本地 UI | ✅ | 可兼用 |
| 改远程 CDN 语言包 | — | ✅ 安全方案 |
| 拦截远程 JS（易黑屏） | — | ❌ 已禁用 |

**一句话：** javaht 改本地；**我们改 1p 远程加载路径** — 两个场景，两个工具。

---

## 原理（v12 安全模式）

1. 合并 `en-US.json` 与社区中文包 → 本地 `zh-CN.json`（14000+ 条）
2. 主进程钩子注入（**不修改、不重定向 JS/CSS**）
3. 本机 `127.0.0.1:47123` 响应 `claude.ai/i18n/*.json` 请求
4. 页面 `fetch` 兜底，确保语言包走中文

Language 菜单可能仍显示 **English** — **不影响界面已是中文**。

---

## 要求

- macOS 12+
- Claude Desktop **1.8555.x** 附近（其他版本 Issue 反馈）
- **官方 Claude 订阅**（claude.ai 登录，非纯 API Key 网关）

---

## 恢复英文原版

```bash
open restore-mac.command
# 或
python3 scripts/restore.py
```

---

## 日志与自检

```bash
tail -20 ~/Library/Application\ Support/Claude/zh-cn-hook.log
```

正常应包含：

```
i18n server 47123
hook ready v12
redirect i18n
http serve zh-CN.json
```

---

## FAQ

<details>
<summary><strong>安装后还是英文？</strong></summary>

1. 确认已 `Cmd+Q` 完全退出再重装
2. 看日志是否有 `http serve zh-CN.json`
3. 确认是 **官方 Pro 账号**，不是纯 3p 网关
4. 到 [Issues](https://github.com/YqqLikeGit/claude-desktop-zh-1p/issues) 附上 Claude 版本 + 日志

</details>

<details>
<summary><strong>Language 菜单没有「简体中文」？</strong></summary>

正常。1p 官方账号的语言白名单在线上，本项目通过语言包重定向实现界面中文，**菜单显示 English 不影响使用**。

</details>

<details>
<summary><strong>和 javaht 项目冲突吗？</strong></summary>

建议二选一。本项目的 restore 会恢复 app.asar 备份。翻译资源致谢 javaht，见 [ATTRIBUTION.md](ATTRIBUTION.md)。

</details>

<details>
<summary><strong>GitHub 打不开怎么办？</strong></summary>

可让朋友 fork，或用 `git clone` 的 zip 下载。Release 页也提供源码包。

</details>

<details>
<summary><strong>安全吗？</strong></summary>

开源 MIT，可审 `scripts/hook.js` 与 `scripts/install.py`。仅在本机 127.0.0.1 起 HTTP 服务，不上传数据。安装前自动备份 `app.asar`。

</details>

---

## 文件结构

```
claude-desktop-zh-1p/
├── install-mac.command       # 一键安装
├── restore-mac.command       # 一键恢复
├── scripts/
│   ├── install.py
│   ├── restore.py
│   └── hook.js
├── resources/                # 中文翻译
└── docs/v2ex-post.md         # 分享帖模板
```

---

## 致谢

- 中文翻译：[javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn)
- 仅供个人学习研究，与 Anthropic 官方无关

## License

MIT · Copyright (c) 2026 RUDY YU
