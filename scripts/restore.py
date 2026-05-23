#!/usr/bin/env python3
"""Restore Claude Desktop app.asar from backup (emergency undo)."""
from __future__ import annotations

import hashlib
import json
import os
import plistlib
import shutil
import struct
import subprocess
from pathlib import Path


def user_home() -> Path:
    if os.geteuid() == 0:
        sudo_user = os.environ.get("SUDO_USER") or os.environ.get("USER")
        if sudo_user and sudo_user != "root":
            return Path(f"/Users/{sudo_user}")
    return Path.home()


APP = Path("/Applications/Claude.app")
ASAR = APP / "Contents/Resources/app.asar"
BACKUP = ASAR.with_suffix(".asar.bak-zh-1p")
CONFIG = user_home() / "Library/Application Support/Claude/config.json"


def update_integrity(asar_path: Path, app_path: Path) -> None:
    data = asar_path.read_bytes()
    header_size = struct.unpack_from("<I", data, 4)[0]
    header_pickle = data[8 : 8 + header_size]
    header_string_size = struct.unpack_from("<i", header_pickle, 4)[0]
    header_string = header_pickle[8 : 8 + header_string_size].decode("utf-8")
    new_hash = hashlib.sha256(header_string.encode("utf-8")).hexdigest()
    info_plist = app_path / "Contents/Info.plist"
    with info_plist.open("rb") as f:
        info = plistlib.load(f)
    info["ElectronAsarIntegrity"]["Resources/app.asar"]["hash"] = new_hash
    with info_plist.open("wb") as f:
        plistlib.dump(info, f, fmt=plistlib.FMT_XML)


def main() -> int:
    subprocess.run(["osascript", "-e", 'tell application "Claude" to quit'], check=False)
    if not BACKUP.exists():
        alt = Path("/Applications/Claude.backup-before-zh-CN-20260523-211938.app/Contents/Resources/app.asar")
        if not alt.exists():
            raise SystemExit(f"No backup found: {BACKUP}")
        shutil.copy2(alt, ASAR)
        print(f"Restored from {alt}")
    else:
        shutil.copy2(BACKUP, ASAR)
        print(f"Restored from {BACKUP}")
    update_integrity(ASAR, APP)
    subprocess.run(["codesign", "--force", "--deep", "--sign", "-", str(APP / "Contents/MacOS/Claude")], check=False)
    if CONFIG.exists():
        cfg = json.loads(CONFIG.read_text())
        cfg["locale"] = "en-US"
        CONFIG.write_text(json.dumps(cfg, indent=2) + "\n")
    print("Claude restored to English. Re-open Claude with Cmd+Q first.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
