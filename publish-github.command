#!/bin/bash
# 登录 GitHub 并创建公开仓库 claude-desktop-zh-1p
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

find_gh() {
  if command -v gh >/dev/null 2>&1; then
    command -v gh
    return
  fi
  for p in /tmp/gh-extract/gh_*/bin/gh /opt/homebrew/bin/gh /usr/local/bin/gh; do
    if [ -x "$p" ]; then
      echo "$p"
      return
    fi
  done
  echo ""
}

GH="$(find_gh)"
if [ -z "$GH" ]; then
  echo "未找到 gh。请先安装: https://cli.github.com"
  echo "或在本机终端运行:"
  echo "  brew install gh"
  exit 1
fi

echo "使用: $GH"
"$GH" auth status >/dev/null 2>&1 || {
  echo ""
  echo "请在浏览器中完成 GitHub 登录（设备码方式）。"
  echo "GitHub 已不再支持用账号密码直接推送代码。"
  "$GH" auth login -h github.com -p https -w
}

REPO_NAME="${1:-claude-desktop-zh-1p}"
if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
  echo "已推送: $(git remote get-url origin)"
else
  "$GH" repo create "$REPO_NAME" --public --source=. --remote=origin --push \
    --description "Simplified Chinese for Claude Desktop official Pro accounts (claude.ai 1p) on macOS. Author: RUDY YU"
  LOGIN="$("$GH" api user -q .login)"
  echo ""
  echo "发布成功: https://github.com/${LOGIN}/${REPO_NAME}"
fi
