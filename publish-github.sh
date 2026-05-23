#!/bin/bash
# 首次发布到 GitHub（需先安装并登录 gh: https://cli.github.com）
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if ! command -v gh >/dev/null 2>&1; then
  echo "请先安装 GitHub CLI: https://cli.github.com"
  echo "安装后运行: gh auth login"
  exit 1
fi

gh auth status >/dev/null 2>&1 || {
  echo "请先登录: gh auth login"
  exit 1
}

REPO_NAME="${1:-claude-desktop-zh-1p}"
VIS="${2:-public}"

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
  echo "已推送到 $(git remote get-url origin)"
else
  gh repo create "$REPO_NAME" --"$VIS" --source=. --remote=origin --push
  echo "已创建并推送: https://github.com/$(gh api user -q .login)/$REPO_NAME"
fi
