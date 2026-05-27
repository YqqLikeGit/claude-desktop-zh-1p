#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="/usr/bin/python3"

echo "========================================"
echo " Claude Desktop 官方账号简体中文 v1.0"
echo "========================================"
echo ""
echo "即将安装到 /Applications/Claude.app"
echo "需要管理员权限。"
echo ""

if [[ ! -d "/Applications/Claude.app" ]]; then
  echo "错误：未找到 /Applications/Claude.app"
  exit 1
fi

osascript -e 'tell application "Claude" to quit' 2>/dev/null || true
sleep 1

TMPDIR="$(mktemp -d /tmp/claude-zh-1p.XXXXXX)"
trap 'rm -rf "$TMPDIR"' EXIT
ditto "$DIR" "$TMPDIR/project"

osascript <<APPLESCRIPT
do shell script "$PYTHON $TMPDIR/project/scripts/install.py" with administrator privileges
APPLESCRIPT

echo ""
echo "安装完成。请重新打开 Claude，并在 Language 中选择 简体中文。"
read -r -p "按回车键关闭..." _
