#!/usr/bin/env bash
# Sort Simulation 실행 스크립트.
#   ./run.sh         → 빌드된 프론트엔드(dist)를 pywebview 창으로 실행 (배포 모드)
#   ./run.sh dev     → Vite dev server + pywebview (HMR, 개발 모드)
#   ./run.sh build   → 프론트엔드만 빌드
set -e
cd "$(dirname "$0")"

PY=backend/.venv/bin/python

case "${1:-run}" in
  build)
    cd frontend && npm run build
    ;;
  dev)
    # Vite dev server 를 백그라운드로 띄우고 pywebview 를 dev 모드로 실행
    ( cd frontend && npm run dev ) &
    VITE_PID=$!
    trap "kill $VITE_PID 2>/dev/null" EXIT
    sleep 2
    cd backend && ../$PY app.py --dev
    ;;
  run|*)
    # dist 가 없으면 먼저 빌드
    if [ ! -f frontend/dist/index.html ]; then
      echo "[run] dist 없음 → 빌드 먼저 실행"
      ( cd frontend && npm run build )
    fi
    cd backend && ../$PY app.py
    ;;
esac
