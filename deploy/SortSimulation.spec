# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec — Sort Simulation 데스크탑 빌드.

빌드된 frontend/dist 를 번들 안 "webui/" 로 싣고, backend/app.py 를 진입점으로 묶는다.
  - macOS  : SortSimulation.app (윈도우 없는 GUI 번들)
  - Windows: SortSimulation.exe (단일 실행파일)

사용:  pyinstaller deploy/SortSimulation.spec   (프로젝트 루트에서 실행)
전제:  먼저 frontend 에서  npm run build  로 dist 를 만들어 둘 것.
"""

import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules

# SPECPATH = 이 spec 이 있는 deploy/ 폴더. 그 부모가 프로젝트 루트.
ROOT = Path(SPECPATH).resolve().parent
APP_ENTRY = str(ROOT / "backend" / "app.py")
FRONTEND_DIST = ROOT / "frontend" / "dist"

if not (FRONTEND_DIST / "index.html").exists():
    raise SystemExit(
        f"[spec] frontend 빌드 결과가 없습니다: {FRONTEND_DIST}\n"
        f"       먼저  cd frontend && npm run build  를 실행하세요."
    )

# pywebview 는 플랫폼별 백엔드(cocoa/edgechromium/winforms)를 지연 import 하므로
# collect 로 서브모듈·데이터·바이너리를 모두 끌어온다.
webview_datas, webview_binaries, webview_hidden = collect_all("webview")
hiddenimports = webview_hidden + collect_submodules("webview")

# 플랫폼별 추가 hidden import (PyInstaller 가 놓치기 쉬운 GUI 백엔드 의존성).
if sys.platform == "darwin":
    hiddenimports += ["webview.platforms.cocoa", "objc", "Foundation", "AppKit", "WebKit", "Quartz"]
elif sys.platform.startswith("win"):
    hiddenimports += [
        "webview.platforms.edgechromium",
        "webview.platforms.winforms",
        "clr",
        "System",
        "System.Windows.Forms",
    ]

datas = webview_datas + [(str(FRONTEND_DIST), "webui")]

a = Analysis(
    [APP_ENTRY],
    pathex=[str(ROOT / "backend")],
    binaries=webview_binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=["tkinter"],
    noarchive=False,
)
pyz = PYZ(a.pure)

if sys.platform == "darwin":
    # onedir + .app 번들 (macOS GUI 표준)
    exe = EXE(
        pyz,
        a.scripts,
        [],
        exclude_binaries=True,
        name="SortSimulation",
        console=False,
        argv_emulation=True,
    )
    coll = COLLECT(
        exe,
        a.binaries,
        a.datas,
        strip=False,
        upx=False,
        name="SortSimulation",
    )
    app = BUNDLE(
        coll,
        name="SortSimulation.app",
        bundle_identifier="kr.ksa.ds.sortsim",
        info_plist={
            "CFBundleName": "Sort Simulation",
            "CFBundleDisplayName": "Sort Simulation",
            "CFBundleShortVersionString": "1.0.0",
            "NSHighResolutionCapable": True,
        },
    )
else:
    # Windows/Linux: 단일 실행파일(onefile)
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.datas,
        [],
        name="SortSimulation",
        console=False,
        strip=False,
        upx=False,
    )
