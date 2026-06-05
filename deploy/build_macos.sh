#!/usr/bin/env bash
# macOS 데스크탑 빌드 → dist/SortSimulation.app
# 사용:  ./deploy/build_macos.sh   (프로젝트 루트 또는 어디서나)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[1/4] 프론트엔드 빌드 (Pyodide 용 py 동기화 포함)"
( cd frontend && npm install && npm run build )

echo "[2/4] Python 가상환경 준비"
PY="${PYTHON:-python3}"
if [ ! -x "backend/.venv/bin/python" ]; then
  "$PY" -m venv backend/.venv
fi
VENV_PY="backend/.venv/bin/python"
"$VENV_PY" -m pip install --upgrade pip >/dev/null
"$VENV_PY" -m pip install -r backend/requirements.txt pyinstaller

echo "[3/4] PyInstaller 패키징"
rm -rf build dist
"$VENV_PY" -m PyInstaller --clean --noconfirm deploy/SortSimulation.spec

echo "[4/4] 완료"
echo "  → $ROOT/dist/SortSimulation.app"
echo "  실행: open dist/SortSimulation.app"
