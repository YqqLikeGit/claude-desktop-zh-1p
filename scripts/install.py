#!/usr/bin/env python3
"""Claude Desktop official-account (1p) Simplified Chinese installer."""
from __future__ import annotations

import hashlib
import json
import plistlib
import re
import shutil
import os
import struct
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path


def user_home() -> Path:
    if os.geteuid() == 0:
        sudo_user = os.environ.get("SUDO_USER") or os.environ.get("USER")
        if sudo_user and sudo_user != "root":
            return Path(f"/Users/{sudo_user}")
    return Path.home()


APP = Path("/Applications/Claude.app")
PROJECT = Path(__file__).resolve().parents[1]
RESOURCES = PROJECT / "resources"
USER_DATA = user_home() / "Library/Application Support/Claude"
PATCH_DIR = USER_DATA / "zh-cn-patches"
CONFIG = USER_DATA / "config.json"
ASAR = APP / "Contents/Resources/app.asar"
INFO = APP / "Contents/Info.plist"
REMOTE_INDEX_URL = "https://assets-proxy.anthropic.com/claude-ai/v2/assets/v1/index-CYu_8WXE.js"
REMOTE_INDEX = "index-CYu_8WXE.js"
EN_US_URL = "https://claude.ai/i18n/en-US.json"
LANG_LIST_RE = re.compile(
    r'\["en-US","de-DE","fr-FR","ko-KR","ja-JP","es-419","es-ES","it-IT","hi-IN","pt-BR","id-ID"\]'
)
LANG_LIST_ZH = '["en-US","de-DE","fr-FR","ko-KR","ja-JP","es-419","es-ES","it-IT","hi-IN","pt-BR","id-ID","zh-CN"]'
HTTP_PORT = 47123
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
HOOK_PATH = Path(__file__).resolve().parent / "hook.js"


def load_hook() -> str:
    return HOOK_PATH.read_text("utf-8").strip()


def run(cmd: list[str], check: bool = True, **kw) -> subprocess.CompletedProcess:
    print("+", " ".join(cmd))
    return subprocess.run(cmd, check=check, **kw)


def fetch(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def merge_i18n(en_us: dict, zh_pack: dict) -> dict:
    merged = {}
    for key, value in en_us.items():
        merged[key] = zh_pack.get(key, value)
    return merged


def prepare_patches() -> None:
    PATCH_DIR.mkdir(parents=True, exist_ok=True)
    raw = PATCH_DIR / f"{REMOTE_INDEX}.raw"
    if not raw.exists() or raw.stat().st_size < 1000:
        print("Downloading remote index bundle...")
        fetch(REMOTE_INDEX_URL, raw)
    index_text = raw.read_text("utf-8")
    if LANG_LIST_RE.search(index_text):
        index_text = LANG_LIST_RE.sub(LANG_LIST_ZH, index_text)
    elif ',"zh-CN"' not in index_text:
        raise SystemExit("Remote index format changed; update LANG_LIST_RE in install.py")
    (PATCH_DIR / REMOTE_INDEX).write_text(index_text, "utf-8")
    print("Patched language whitelist in remote index")

    zh_pack = json.loads((RESOURCES / "frontend-zh-CN.json").read_text("utf-8"))
    en_path = PATCH_DIR / "en-US.json"
    local_en = APP / "Contents/Resources/ion-dist/i18n/en-US.json"
    en_us = None
    if local_en.exists():
        print(f"Using local baseline: {local_en}")
        en_us = json.loads(local_en.read_text("utf-8"))
    else:
        try:
            print("Downloading en-US baseline from claude.ai...")
            fetch(EN_US_URL, en_path)
            en_us = json.loads(en_path.read_text("utf-8"))
        except Exception as exc:
            print(f"Warning: could not fetch en-US.json ({exc}); using zh pack only")
    if en_us is None:
        en_us = zh_pack
    merged = merge_i18n(en_us, zh_pack)
    (PATCH_DIR / "zh-CN.json").write_text(json.dumps(merged, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    shutil.copy2(RESOURCES / "statsig-zh-CN.json", PATCH_DIR / "statsig-zh-CN.json")
    manifest = {"remote_index": REMOTE_INDEX, "remote_url": REMOTE_INDEX_URL, "version": 4}
    (PATCH_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", "utf-8")
    print(f"Prepared patches in {PATCH_DIR}")


def read_asar_file(asar_path: Path, inner_path: str) -> bytes:
    data = asar_path.read_bytes()
    header_size = struct.unpack_from("<I", data, 4)[0]
    header_pickle = data[8 : 8 + header_size]
    header_string_size = struct.unpack_from("<i", header_pickle, 4)[0]
    header_string = header_pickle[8 : 8 + header_string_size].decode("utf-8")
    header = json.loads(header_string)
    node = header
    for part in inner_path.split("/"):
        node = node["files"][part]
    offset = int(node["offset"])
    size = int(node["size"])
    return data[8 + header_size + offset : 8 + header_size + offset + size]


def update_asar_integrity(asar_path: Path, app_path: Path) -> None:
    data = asar_path.read_bytes()
    header_size = struct.unpack_from("<I", data, 4)[0]
    header_pickle = data[8 : 8 + header_size]
    header_string_size = struct.unpack_from("<i", header_pickle, 4)[0]
    header_string = header_pickle[8 : 8 + header_string_size].decode("utf-8")
    new_hash = hashlib.sha256(header_string.encode("utf-8")).hexdigest()
    with (app_path / "Contents/Info.plist").open("rb") as f:
        info = plistlib.load(f)
    info["ElectronAsarIntegrity"]["Resources/app.asar"]["hash"] = new_hash
    with (app_path / "Contents/Info.plist").open("wb") as f:
        plistlib.dump(info, f, fmt=plistlib.FMT_XML)
    print("Updated ElectronAsarIntegrity hash")


def inject_hook() -> None:
    if not ASAR.exists():
        raise SystemExit(f"Claude.app not found: {ASAR}")
    backup = ASAR.with_suffix(".asar.bak-zh-1p")
    if not backup.exists():
        shutil.copy2(ASAR, backup)
        print(f"Backed up app.asar -> {backup.name}")

    content = read_asar_file(ASAR, ".vite/build/index.js").decode("utf-8", errors="replace")
    marker = '"use strict";'
    if content.lstrip().startswith("(function(){try{const{app,session"):
        content = content[content.find(marker) :]
    new_content = load_hook() + "\n" + content.lstrip("\n")

    work = Path("/tmp/claude-zh-1p-asar-work")
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True, exist_ok=True)
    app_dir = work / "app"
    env = os.environ.copy()
    env["HOME"] = str(user_home())
    npx = shutil.which("npx") or "/usr/local/bin/npx"
    run([npx, "--yes", "asar", "extract", str(ASAR), str(app_dir)], cwd="/tmp", env=env)
    (app_dir / ".vite/build/index.js").write_text(new_content, "utf-8")
    run([npx, "--yes", "asar", "pack", str(app_dir), str(ASAR)], cwd="/tmp", env=env)
    shutil.rmtree(work, ignore_errors=True)
    update_asar_integrity(ASAR, APP)
    run(["codesign", "--force", "--deep", "--sign", "-", str(APP / "Contents/MacOS/Claude")], check=False)
    print("Injected startup hook into app.asar")


def install_shell_locales() -> None:
    ion_i18n = APP / "Contents/Resources/ion-dist/i18n"
    ion_i18n.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PATCH_DIR / "zh-CN.json", ion_i18n / "zh-CN.json")
    statsig_dir = ion_i18n / "statsig"
    statsig_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PATCH_DIR / "statsig-zh-CN.json", statsig_dir / "zh-CN.json")
    desktop = APP / "Contents/Resources"
    shutil.copy2(RESOURCES / "desktop-zh-CN.json", desktop / "zh-CN.json")
    lproj = desktop / "zh-CN.lproj"
    lproj.mkdir(exist_ok=True)
    shutil.copy2(RESOURCES / "Localizable-zh-CN.strings", lproj / "Localizable.strings")
    print("Installed shell locale files")


def set_locale() -> None:
    cfg = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    cfg["locale"] = "zh-CN"
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    CONFIG.write_text(json.dumps(cfg, indent=2) + "\n")
    (USER_DATA / "zh-cn-hook.log").write_text("")
    print("Set config locale to zh-CN")


def quit_claude() -> None:
    subprocess.run(["osascript", "-e", 'tell application "Claude" to quit'], check=False)
    import time
    time.sleep(2)


def main() -> int:
    if not APP.exists():
        raise SystemExit(f"Install Claude Desktop first: {APP}")
    if not RESOURCES.exists():
        raise SystemExit(f"Missing resources dir: {RESOURCES}")
    print("Claude Desktop 官方账号简体中文安装器 v6")
    quit_claude()
    prepare_patches()
    inject_hook()
    install_shell_locales()
    set_locale()
    print("\n完成。请重新打开 Claude：")
    print("  1. 完全退出 Claude (Cmd+Q)")
    print("  2. 重新打开 Claude")
    print("  3. 左下角头像 -> Language -> 简体中文")
    print(f"\n日志: {USER_DATA / 'zh-cn-hook.log'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
