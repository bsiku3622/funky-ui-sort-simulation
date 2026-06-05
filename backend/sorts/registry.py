"""알고리즘 메타데이터 + 실행 진입점.

프론트엔드는 list_algorithms() 로 목록을 받아 Modal 에 뿌리고,
run(algo_id, array) 로 frame 시퀀스를 받는다.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from . import algorithms as alg
from .tracer import Tracer


@dataclass(frozen=True)
class AlgoSpec:
    id: str
    name: str
    category: str  # "quadratic" | "efficient" | "distribution" | "gag"
    complexity: str
    note: str
    func: Callable[[Tracer], None]
    gag: bool = False
    max_n: int = 250  # 이 알고리즘이 다룰 수 있는 최대 원소 수
    non_negative: bool = False  # radix 처럼 음수 불가한지 (현재 모두 양수라 참고용)
    tags: list[str] = field(default_factory=list)


ALGORITHMS: list[AlgoSpec] = [
    # ── O(N²) ──
    AlgoSpec("bubble", "Bubble Sort", "quadratic", "O(n²)",
             "인접 원소를 비교/교환해 큰 값을 뒤로 보냄", alg.bubble_sort),
    AlgoSpec("insertion", "Insertion Sort", "quadratic", "O(n²)",
             "정렬된 앞 구간에 key 를 끼워 넣음", alg.insertion_sort),
    AlgoSpec("selection", "Selection Sort", "quadratic", "O(n²)",
             "최솟값을 찾아 앞으로 보냄", alg.selection_sort),
    AlgoSpec("binary_tree", "Binary Tree Sort", "quadratic", "O(n log n)~O(n²)",
             "BST 구성 후 중위순회(LNR)", alg.binary_tree_sort),
    # ── 개선된 ──
    AlgoSpec("shell", "Shell Sort", "efficient", "O(n^1.25)",
             "gap 간격 삽입정렬을 gap 줄이며 반복 (강의 수열)", alg.shell_sort),
    AlgoSpec("shell_classic", "Shell Sort (Classic)", "efficient", "O(n^1.5)",
             "원조 Shell 수열 — gap 을 n/2, n/4, …, 1 로 절반씩", alg.shell_classic_sort),
    AlgoSpec("quick", "Quick Sort", "efficient", "평균 O(n log n)",
             "pivot 기준 양끝 포인터 분할", alg.quick_sort),
    AlgoSpec("dual_pivot", "Dual-Pivot Quick Sort", "efficient", "평균 O(n log n)",
             "두 pivot 으로 3분할 (Yaroslavskiy)", alg.dual_pivot_quick_sort),
    AlgoSpec("merge", "Merge Sort", "efficient", "O(n log n)",
             "분할 후 병합 (강의 merge 규칙)", alg.merge_sort),
    AlgoSpec("tim", "Tim Sort", "efficient", "O(n log n)",
             "run 삽입정렬 후 안정 병합 (Python·Java 채택)", alg.tim_sort),
    AlgoSpec("heap", "Heap Sort", "efficient", "O(n log n)",
             "최대 힙 구성 후 루트를 뒤로 추출", alg.heap_sort),
    # ── 분배 ──
    AlgoSpec("radix", "Radix Sort", "distribution", "O(d·n)",
             "자리값별 0~9 버킷 분배·수집 (LSD)", alg.radix_sort,
             non_negative=True),
    # ── 개그 ──
    AlgoSpec("stalin", "Stalin Sort ☭", "gag", "O(n)",
             "순서 어기는 원소를 숙청(제거)", alg.stalin_sort, gag=True),
    AlgoSpec("bogo", "Bogo Sort 🎲", "gag", "평균 O(n·n!)",
             "정렬될 때까지 무작위로 섞음 (사실상 ∞)", alg.bogo_sort, gag=True),
    AlgoSpec("sleep", "Sleep Sort ⏰", "gag", "O(n) (개념상)",
             "값만큼 잠들었다 깨어남", alg.sleep_sort, gag=True, max_n=40),
]

_BY_ID = {spec.id: spec for spec in ALGORITHMS}

CATEGORY_LABEL = {
    "quadratic": "O(N²) 기본 정렬",
    "efficient": "개선된 정렬",
    "distribution": "분배 정렬",
    "gag": "개그성 정렬",
}


def list_algorithms() -> list[dict]:
    """프론트엔드용 메타데이터 목록."""
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "categoryLabel": CATEGORY_LABEL.get(s.category, s.category),
            "complexity": s.complexity,
            "note": s.note,
            "gag": s.gag,
            "maxN": s.max_n,
            "nonNegative": s.non_negative,
        }
        for s in ALGORITHMS
    ]


def get(algo_id: str) -> AlgoSpec | None:
    return _BY_ID.get(algo_id)


def run(algo_id: str, array: list[int]) -> dict:
    """주어진 배열에 알고리즘을 적용해 frame 시퀀스를 만든다."""
    spec = _BY_ID.get(algo_id)
    if spec is None:
        raise ValueError(f"알 수 없는 알고리즘: {algo_id}")

    data = [int(x) for x in array]
    if len(data) > spec.max_n:
        data = data[: spec.max_n]

    tracer = Tracer(data)
    spec.func(tracer)  # frame 수는 Tracer 가 다운샘플링으로 알아서 제한한다
    # 실제 정렬이고 결과가 정렬돼 있으면 최종 확인 sweep 연출을 덧붙인다.
    if not spec.gag and tracer.a == sorted(tracer.a):
        tracer.final_sweep()
    # 다운샘플이 일어났는지(원본 단계가 frame 보다 많았는지)
    truncated = tracer._stride > 1

    return {
        "algoId": spec.id,
        "name": spec.name,
        "complexity": spec.complexity,
        "gag": spec.gag,
        "input": data,
        "frames": tracer.frames,
        "frameCount": len(tracer.frames),
        "comparisons": tracer.comparisons,
        "swaps": tracer.swaps,
        "truncated": truncated,
        "infinite": tracer.infinite,  # bogo 처럼 끝나지 않는 정렬이면 True (UI 가 ∞ 표시)
    }
