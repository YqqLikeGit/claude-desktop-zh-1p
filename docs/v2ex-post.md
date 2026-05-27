# V2EX 发帖草稿（复制到 https://v2ex.com/go/claudecode 或「分享创造」）

**标题：** macOS 官方 Claude Pro 账号终于能用中文界面了（1p 专用，不是改本地 ion-dist）

**正文：**

用 **官方 claude.ai 订阅** 登录 Claude Desktop 的朋友应该都有同感：Language 菜单里根本没有中文，界面全是英文。

GitHub 上 [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn) 很强（900+ star），但它主要解决 **3p / API 网关** 模式——改本地 `ion-dist` 就行。

**官方 Pro 账号** 的 UI 是从 **远程 CDN** 拉的，社区补丁直接改本地文件 **不生效**。我这边做了一个专门给 **1p 官方账号** 用的方案：

👉 https://github.com/YqqLikeGit/claude-desktop-zh-1p

**原理（简单说）：**
- 本地起 HTTP 服务，把 `claude.ai/i18n/*.json` 重定向到中文语言包
- 主进程钩子 + 页面 fetch 兜底，**不拦截 JS/CSS**（避免黑屏）
- 双击 `install-mac.command` 一键安装，有 `restore-mac.command` 可恢复英文

**适合谁：**
- macOS + Claude Desktop 官方 Pro 订阅
- 试过 javaht 但 Language 仍无中文的

**不适合谁：**
- 只想改 Windows（目前仅 macOS）
- 期望 Language 菜单里出现「简体中文」字样（界面已是中文，菜单可能仍显示 English，不影响使用）

欢迎 Star / Issue 反馈版本兼容问题。MIT 开源，翻译资源致谢 javaht。

---

发帖后把链接贴到 `GitHub-GROWTH.md` 周报表。
