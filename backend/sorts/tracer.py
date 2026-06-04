"""Tracer: 정렬 과정의 매 단계를 frame 으로 기록한다.

각 정렬 알고리즘은 Tracer 인스턴스를 받아 tracer.a (작업 배열) 위에서
동작하고, 비교/교환/덮어쓰기 시점마다 frame 을 남긴다.
프론트엔드(React)는 이 frame 리스트를 받아 막대 애니메이션으로 재생한다.

frame 스키마 (JSON 직렬화 가능):
    {
      "array":   [int, ...],     # 그 순간의 전체 배열 상태
      "active":  [idx, ...],     # 지금 비교/교환 중인 인덱스
      "pivot":   idx | None,     # pivot/gap 기준 인덱스 (강조용)
      "sorted":  [idx, ...],     # 위치가 확정된 인덱스
      "action":  str,            # compare|swap|overwrite|select|pivot|done ...
      "note":    str,            # 사람이 읽는 설명
      "comparisons": int,        # 누적 비교 횟수
      "swaps":   int,            # 누적 교환 횟수
      "aux":     list | None,    # radix 버킷 등 보조 시각화용 (없으면 None)
    }
"""

from __future__ import annotations

# 너무 많은 frame 이 브릿지를 막지 않도록 안전 상한.
MAX_FRAMES = 60_000


class FrameLimitExceeded(Exception):
    """frame 이 MAX_FRAMES 를 넘었을 때 정렬을 중단시키는 신호."""


class Tracer:
    def __init__(self, data: list[int]):
        self.a: list[int] = list(data)
        self.frames: list[dict] = []
        self.comparisons: int = 0
        self.swaps: int = 0
        self._sorted: set[int] = set()
        # 트리 기반 정렬(binary_tree/heap)이 frame 마다 실어 보내는 트리 상태.
        # {"root": node|None, "highlight": value|None, "phase": str} 형태. 없으면 None.
        self._tree = None
        # 알고리즘의 내부 변수 상태. frame 마다 함께 실린다.
        #   held    : 배열에서 빼내 손에 든 값들(key/temp/pivot) → 막대로 그림
        #   pointers: 배열 인덱스를 가리키는 변수(i/j/min/l/r/k) → 막대 아래 라벨
        #   scalars : 그 외 수치(gap/exp/pass …) → 칩
        self._held: list[dict] = []
        self._pointers: list[dict] = []
        self._scalars: list[dict] = []
        # snap() 첫 호출 전, 입력 그대로의 초기 상태를 한 장 남긴다.
        self.snap("init", note="초기 배열")

    def _state(self):
        if not self._held and not self._pointers and not self._scalars:
            return None
        return {
            "held": list(self._held),
            "pointers": list(self._pointers),
            "scalars": list(self._scalars),
        }

    # ── 내부: 한 장의 frame 을 push ──────────────────────────────
    def snap(self, action: str, active=(), pivot=None, aux=None, note: str = ""):
        if len(self.frames) >= MAX_FRAMES:
            raise FrameLimitExceeded
        self.frames.append(
            {
                "array": list(self.a),
                "active": [int(i) for i in active],
                "pivot": None if pivot is None else int(pivot),
                "sorted": sorted(self._sorted),
                "action": action,
                "note": note,
                "comparisons": self.comparisons,
                "swaps": self.swaps,
                "aux": aux,
                "tree": self._tree,
                "state": self._state(),
            }
        )

    def set_tree(self, root=None, highlight=None, phase: str = ""):
        """이후 frame 에 함께 실릴 트리 상태를 설정한다(트리 정렬 시각화용)."""
        if root is None and highlight is None and not phase:
            self._tree = None
        else:
            self._tree = {"root": root, "highlight": highlight, "phase": phase}

    # ── 내부 변수 상태 설정 (이후 frame 에 함께 실림) ────────────
    def held(self, *pairs, active=None):
        """손에 든 값들을 설정. pairs 는 (name, value) 들. active=name 이면 그 값을 강조.

        예: t.held(("key", 40), active="key)
        """
        self._held = [
            {"name": n, "value": int(v), "active": (n == active)} for n, v in pairs
        ]

    def clear_held(self):
        self._held = []

    def pointers(self, **idx):
        """인덱스를 가리키는 변수들. 예: t.pointers(i=3, j=1, min=2). None/음수는 무시."""
        self._pointers = [
            {"name": k, "index": int(v)} for k, v in idx.items() if v is not None and v >= 0
        ]

    def clear_pointers(self):
        self._pointers = []

    def scalars(self, **vals):
        """그 외 수치 변수들. 예: t.scalars(gap=3, exp=10)."""
        self._scalars = [{"name": k, "value": v} for k, v in vals.items()]

    def clear_scalars(self):
        self._scalars = []

    def cmp(self, active=(), note: str = "", pivot=None):
        """비교 1회: 비교 수를 늘리고 한 장 남긴다(값은 바꾸지 않음)."""
        self.comparisons += 1
        self.snap("compare", active=active, pivot=pivot, note=note)

    # ── 정렬 알고리즘이 부르는 동작 단위 ─────────────────────────
    def compare(self, i: int, j: int, note: str = ""):
        """a[i] 와 a[j] 를 비교한다고 기록(값은 바꾸지 않음)."""
        self.comparisons += 1
        self.snap("compare", active=(i, j), note=note or f"[{i}] ↔ [{j}] 비교")

    def swap(self, i: int, j: int, note: str = ""):
        """a[i] 와 a[j] 를 교환."""
        self.a[i], self.a[j] = self.a[j], self.a[i]
        self.swaps += 1
        self.snap("swap", active=(i, j), note=note or f"[{i}] ⇄ [{j}] 교환")

    def write(self, i: int, value: int, note: str = ""):
        """a[i] 슬롯에 값을 덮어쓴다 (삽입/병합/기수정렬에서 사용)."""
        self.a[i] = value
        self.swaps += 1
        self.snap("overwrite", active=(i,), note=note or f"[{i}] ← {value}")

    def mark(self, action: str, active=(), pivot=None, aux=None, note: str = ""):
        """값 변화 없이 강조/상태 표시만 하는 frame."""
        self.snap(action, active=active, pivot=pivot, aux=aux, note=note)

    def lock(self, *indices: int):
        """해당 인덱스를 '정렬 확정' 상태로 표시."""
        for i in indices:
            if 0 <= i < len(self.a):
                self._sorted.add(int(i))

    def lock_all(self):
        self.lock(*range(len(self.a)))

    def done(self, note: str = "정렬 완료 ✓"):
        self.snap("done", note=note)
