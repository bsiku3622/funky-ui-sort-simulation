"""Sort Simulation — pywebview 진입점.

Python 이 호스트 프로세스가 되어 네이티브 웹뷰 창을 띄우고,
그 안에 funky-ui React 화면을 로드한다. JS 는 window.pywebview.api 를 통해
HTTP 없이 아래 Api 메서드들을 직접 호출한다.

실행:
    # 개발 (Vite dev server + HMR):
    #   1) frontend 에서  npm run dev
    #   2) 여기서        python app.py --dev
    # 배포용 (빌드된 정적 파일 로드):
    #   1) frontend 에서  npm run build
    #   2) 여기서        python app.py
"""

from __future__ import annotations

import os
import random
import sys
from pathlib import Path

import webview

from sorts import list_algorithms, registry, run

BASE_DIR = Path(__file__).resolve().parent
DIST_INDEX = BASE_DIR.parent / "frontend" / "dist" / "index.html"
DEV_URL = "http://localhost:5173"

# 막대 높이가 보기 좋은 범위. radix(분배정렬) 도 양수만 다루므로 안전.
VALUE_MIN = 5
VALUE_MAX = 99
DEFAULT_COUNT = 16
MAX_COUNT = 250


class Api:
    """JS 에서 window.pywebview.api 로 호출하는 백엔드."""

    # ── 알고리즘 목록 ───────────────────────────────────────
    def list_algorithms(self) -> list[dict]:
        return list_algorithms()

    # ── 랜덤 배열 생성 ──────────────────────────────────────
    def random_array(self, count: int, algo_id: str | None = None) -> dict:
        """count 개의 랜덤 양의 정수 배열을 만든다.

        algo_id 가 주어지면 해당 알고리즘의 max_n 으로 개수를 제한한다
        (예: bogo 는 7개까지).
        """
        try:
            n = int(count)
        except (TypeError, ValueError):
            n = DEFAULT_COUNT
        n = max(2, min(n, MAX_COUNT))

        capped_by = None
        if algo_id:
            spec = registry.get(algo_id)
            if spec and n > spec.max_n:
                n = spec.max_n
                capped_by = spec.name

        # 1 ~ 2N 에서 서로 다른(중복 없는) 값 N개 → 정렬 시 매끈한 계단, 평평한 구간 없음
        values = random.sample(range(1, 2 * n + 1), n)
        return {
            "array": values,
            "count": n,
            "min": 1,
            "max": 2 * n,
            "cappedBy": capped_by,  # max_n 때문에 잘렸으면 알고리즘 이름
        }

    # ── 정렬 실행 → frame 시퀀스 ────────────────────────────
    def sort(self, algo_id: str, array: list[int]) -> dict:
        return run(algo_id, list(array))

    # ── 한 번에: 랜덤 생성 + 정렬 (편의용) ──────────────────
    def random_and_sort(self, algo_id: str, count: int) -> dict:
        gen = self.random_array(count, algo_id)
        result = run(algo_id, gen["array"])
        result["generated"] = gen
        return result


def _resolve_target(dev: bool) -> str:
    if dev:
        return DEV_URL
    if not DIST_INDEX.exists():
        sys.stderr.write(
            f"[Sort Simulation] 빌드 결과가 없습니다: {DIST_INDEX}\n"
            f"  먼저 frontend 에서  npm run build  를 실행하거나,\n"
            f"  개발 모드로  python app.py --dev  를 쓰세요 "
            f"(Vite dev server 필요).\n"
        )
        sys.exit(1)
    return str(DIST_INDEX)


def main():
    dev = "--dev" in sys.argv or os.environ.get("SORTSIM_DEV") == "1"
    target = _resolve_target(dev)

    api = Api()
    webview.create_window(
        "Sort Simulation — DS Lecture 18",
        url=target,
        js_api=api,
        width=1180,
        height=820,
        min_size=(900, 640),
        background_color="#fff5d1",  # funky cream
    )
    # gui 자동 선택 (macOS: WKWebView). debug=dev 로 개발 시 우클릭 inspect 허용.
    webview.start(debug=dev)


if __name__ == "__main__":
    main()
