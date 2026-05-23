# Claude Desktop 官方账号简体中文

为 **Claude Desktop 官方订阅账号（1p / claude.ai 在线界面）** 提供可用的简体中文支持。

社区版 [claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn) 主要面向本地/API 网关模式；本项目专门解决 **官方 Pro 账号** 界面从远程 CDN 加载、语言列表不含中文的问题。

## 原理

1. 下载并 patch 远程前端 bundle，把 `zh-CN` 加入语言白名单
2. 合并 `en-US.json` 与中文翻译包，生成完整 `zh-CN.json`
3. 在 Claude 主进程注入启动钩子：
   - 每次启动清除 CDN 磁盘缓存（避免加载未 patch 的旧 bundle）
   - 本地 HTTP 服务 + `webRequest` 拦截，把远程资源替换为 patch 版本
   - 页面注入兜底：自动把 `en-US` 语言包请求切到 `zh-CN`

## 安装

```bash
# 双击运行（推荐）
open install-mac.command

# 或命令行
python3 scripts/install.py
```

安装前请先 **完全退出 Claude（Cmd+Q）**。安装完成后重新打开 Claude，进入：

**左下角头像 → Language → 简体中文**

## 要求

- macOS
- Claude Desktop（当前测试版本 1.8555.x）
- 官方 Claude 账号（非纯 API 网关模式）

## 更新 Claude 后

Claude 更新可能更换远程 bundle 文件名。若中文消失，重新运行安装器即可。

## 文件结构

```
claude-desktop-zh-1p/
├── install-mac.command      # 一键安装
├── scripts/install.py       # 安装脚本
└── resources/               # 中文翻译资源
    ├── frontend-zh-CN.json
    ├── desktop-zh-CN.json
    ├── statsig-zh-CN.json
    └── Localizable-zh-CN.strings
```

## 日志与排查

安装后日志位于：

```
~/Library/Application Support/Claude/zh-cn-hook.log
```

正常启动应看到类似：

```
startup cache wiped
local server 47123
memory cache cleared
hook ready
hit index
```

## 恢复原版

```bash
cp "/Applications/Claude.app/Contents/Resources/app.asar.bak-zh-1p" \
   "/Applications/Claude.app/Contents/Resources/app.asar"
```

然后重新安装 Claude 或从 Time Machine 恢复。

## 致谢

- 中文翻译资源基于 [javaht/claude-desktop-zh-cn](https://github.com/javaht/claude-desktop-zh-cn) 社区项目
- 仅供个人学习研究，与 Anthropic 官方无关

## License

MIT
