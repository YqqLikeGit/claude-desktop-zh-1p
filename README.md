# Claude Desktop 官方账号简体中文 (macOS)

**Author: RUDY YU** · yqq502503@gmail.com  
**Repository:** https://github.com/YqqLikeGit/claude-desktop-zh-1p

为 **Claude Desktop 官方订阅账号（1p / claude.ai 在线界面）** 提供可用的简体中文界面。

---

## 和现有汉化项目有什么不同？

GitHub 上已有 [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn) 等优秀项目，但它们主要面向 **本地/API 网关（3p）模式**——界面从本机 `ion-dist` 加载，改本地文件即可。

**官方 Pro 账号** 的界面从 **远程 CDN**（`claude.ai` + `assets-proxy.anthropic.com`）加载，语言白名单和语言包都在线上，社区补丁 **无法直接生效**。

| 场景 | javaht/claude-desktop-zh-cn | 本项目 |
|------|----------------------------|--------|
| 官方 Pro 账号登录 claude.ai | ❌ 语言列表无中文 | ✅ 界面中文 |
| API 网关 / 3p 本地 UI | ✅ | ✅（可兼用） |
| 拦截远程 JS（改语言菜单） | — | ❌ 易黑屏，已禁用 |
| 拦截语言包 JSON | — | ✅ 安全方案 |

**本项目解决的核心问题：**

> 官方订阅用户无法在 Language 菜单选择中文，界面始终英文——通过主进程钩子 + 本地语言包 HTTP 服务 + 页面注入，在 **不破坏 Claude 登录与稳定性** 的前提下，自动加载简体中文翻译。

---

## 原理（v12 安全模式）

1. 合并 `en-US.json` 与社区中文包，生成本地 `zh-CN.json`（约 14000+ 条）
2. 启动时注入主进程钩子（**不修改、不重定向任何 JS/CSS**，避免黑屏）
3. 将 `claude.ai/i18n/*.json` 请求重定向到本机 `127.0.0.1:47123`，返回中文语言包
4. 页面注入兜底：在 React 加载前劫持 `fetch`，确保语言包走中文

Language 菜单可能仍显示 English——**不影响界面中文**。

---

## 安装

```bash
# 双击（推荐，会请求管理员权限）
open install-mac.command

# 或命令行
python3 scripts/install.py
```

1. **完全退出 Claude**（`Cmd+Q`）
2. 运行安装器
3. 重新打开 Claude，等待 10–15 秒

界面应显示中文（如「晚上好」「今天我能帮你什么？」）。

---

## 要求

- macOS
- Claude Desktop 1.8555.x（其他版本可能需重新安装）
- **官方 Claude 订阅账号**（非纯 API 网关）

---

## 恢复原版

```bash
open restore-mac.command
# 或
python3 scripts/restore.py
```

---

## 日志

```
~/Library/Application Support/Claude/zh-cn-hook.log
```

正常示例：

```
i18n server 47123
hook ready v12
redirect i18n
http serve zh-CN.json
```

---

## 文件结构

```
claude-desktop-zh-1p/
├── install-mac.command       # 一键安装
├── restore-mac.command       # 一键恢复英文原版
├── scripts/
│   ├── install.py            # 安装脚本
│   ├── restore.py            # 恢复脚本
│   └── hook.js               # 主进程钩子（安装时写入 app.asar）
└── resources/                # 中文翻译资源
    ├── frontend-zh-CN.json
    ├── desktop-zh-CN.json
    ├── statsig-zh-CN.json
    └── Localizable-zh-CN.strings
```

---

## 致谢

- 中文翻译资源基于 [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn)
- 仅供个人学习研究，与 Anthropic 官方无关

## License

MIT · Copyright (c) 2026 RUDY YU
