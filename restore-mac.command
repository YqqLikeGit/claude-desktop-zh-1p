#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
osascript -e 'tell application "Claude" to quit' 2>/dev/null || true
sleep 1
osascript -e "do shell script \"/usr/bin/python3 '$DIR/scripts/restore.py'\" with administrator privileges"
echo "已恢复原版 Claude（英文）。按回车关闭..."
read -r _
