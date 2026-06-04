"""Lecture 18 (DS Sorting) 기반 정렬 알고리즘 구현.

각 함수는 Tracer 를 받아 tracer.a 위에서 정렬하며 frame 을 남긴다.
강의 PPT 에서 다룬 알고리즘을 충실히 따르고, 시각화를 위해 인덱스를
명시적으로 다루도록 약간 변형한 부분은 주석으로 표시했다.

개그성 알고리즘(Stalin / Bogo / Sleep)은 gag=True 로 분류한다.
"""

from __future__ import annotations

import random

from .tracer import Tracer


# ─────────────────────────────────────────────────────────────
#  O(N²) 그룹
# ─────────────────────────────────────────────────────────────
def bubble_sort(t: Tracer):
    """인접한 두 원소를 비교/교환하며 큰 값을 오른쪽으로 '거품'처럼 올린다."""
    a = t.a
    n = len(a)
    for i in range(n - 1):
        t.scalars(pass_=i + 1)
        for j in range(n - 1 - i):
            t.pointers(j=j)
            t.cmp(active=(j, j + 1), note=f"이웃 a[{j}]({a[j]}) 와 a[{j + 1}]({a[j + 1]}) 비교")
            if a[j] > a[j + 1]:
                t.swap(j, j + 1, note=f"순서가 틀려서 a[{j}] ⇄ a[{j + 1}] 교환")
        t.lock(n - 1 - i)  # 이번 패스에서 맨 뒤 값 확정
    t.lock(0)
    t.clear_pointers()
    t.clear_scalars()
    t.done()


def insertion_sort(t: Tracer):
    """앞쪽 정렬된 구간에 key 를 끼워 넣는다. 비교는 항상 key vs a[j] 다."""
    a = t.a
    n = len(a)
    t.lock(0)
    for i in range(1, n):
        key = a[i]
        t.held(("key", key))  # 배열에서 key 를 빼서 손에 든다
        t.pointers(i=i, j=i - 1)
        t.mark("select", active=(i,), note=f"a[{i}]={key} 를 key 로 빼서 손에 든다")
        j = i - 1
        while j >= 0:
            t.held(("key", key), active="key")  # 지금 비교 중인 값
            t.pointers(i=i, j=j)
            t.cmp(active=(j,), note=f"key({key}) 와 a[{j}]({a[j]}) 비교")
            if a[j] > key:
                t.held(("key", key))
                t.write(j + 1, a[j], note=f"a[{j}]={a[j]} 가 key보다 크니 한 칸 뒤로 (a[{j + 1}]←{a[j]})")
                j -= 1
            else:
                break
        t.held(("key", key))
        t.pointers(i=i, j=j + 1)
        t.write(j + 1, key, note=f"빈자리 a[{j + 1}] 에 key={key} 를 꽂는다")
        t.clear_held()
        t.lock(*range(i + 1))
    t.clear_pointers()
    t.done()


def selection_sort(t: Tracer):
    """남은 구간에서 최솟값을 찾아 맨 앞과 교환한다. min 변수가 최솟값 위치를 추적한다."""
    a = t.a
    n = len(a)
    for i in range(n):
        m = i
        t.pointers(i=i, j=i, min=m)
        t.mark("select", active=(i,), note=f"자리 [{i}]부터 최솟값 탐색 — 현재 min = a[{m}]={a[m]}")
        for j in range(i + 1, n):
            t.pointers(i=i, j=j, min=m)
            t.cmp(active=(j, m), note=f"a[{j}]({a[j]}) 와 현재 최솟값 a[{m}]({a[m]}) 비교")
            if a[j] < a[m]:
                m = j
                t.pointers(i=i, j=j, min=m)
                t.mark("select", active=(m,), note=f"더 작은 값 발견! min ← a[{m}]={a[m]}")
        if m != i:
            t.pointers(i=i, min=m)
            t.swap(i, m, note=f"찾은 최솟값 a[{m}]={a[m]} 를 자리 [{i}]로 교환")
        t.lock(i)
    t.clear_pointers()
    t.done()


class _Node:
    __slots__ = ("v", "l", "r")

    def __init__(self, v):
        self.v = v
        self.l = None
        self.r = None


def binary_tree_sort(t: Tracer):
    """입력으로 BST 를 만든 뒤 중위순회(LNR)로 오름차순 출력한다.

    BST 구성 단계는 배열을 바꾸지 않으므로, 순회 결과를 배열에
    하나씩 써 넣는 단계에서 '채워지는' 애니메이션을 보여준다.
    """
    a = t.a
    n = len(a)

    def serialize(node):
        if node is None:
            return None
        return {"v": node.v, "l": serialize(node.l), "r": serialize(node.r)}

    # ── 1단계: 삽입 — 루트부터 경로를 타고 내려가며 자리를 찾는다 ──
    root = None
    for i in range(n):
        v = a[i]
        if root is None:
            root = _Node(v)
            t.set_tree(serialize(root), highlight=v, phase="insert")
            t.mark("select", active=(i,), note=f"{v} 를 루트로 삽입")
            continue
        cur = root
        while True:
            # 현재 노드와 비교 (트리 한 칸 내려가는 매 단계가 1프레임)
            t.set_tree(serialize(root), highlight=cur.v, phase="compare")
            t.comparisons += 1
            go = "왼쪽" if v < cur.v else "오른쪽"
            t.mark("compare", active=(i,), note=f"삽입값 {v} 와 노드 {cur.v} 비교 → {go}으로")
            if v < cur.v:
                if cur.l is None:
                    cur.l = _Node(v)
                    break
                cur = cur.l
            else:
                if cur.r is None:
                    cur.r = _Node(v)
                    break
                cur = cur.r
        t.set_tree(serialize(root), highlight=v, phase="insert")
        t.mark("select", active=(i,), note=f"빈 자리를 찾아 {v} 삽입")

    # ── 2단계: 중위순회(LNR) — 내려감(visit)·출력(output)을 각각 1프레임으로 ──
    full = serialize(root)
    out_idx = [0]

    def inorder(node):
        if node is None:
            return
        # 이 노드로 내려가 왼쪽 서브트리부터 본다 (travel)
        t.set_tree(full, highlight=node.v, phase="visit")
        t.mark("select", note=f"노드 {node.v} 방문 — 왼쪽 서브트리 먼저")
        inorder(node.l)
        # 왼쪽을 다 봤으니 이 노드를 출력
        i = out_idx[0]
        t.set_tree(full, highlight=node.v, phase="output")
        t.write(i, node.v, note=f"LNR {i + 1}번째 출력 → [{i}] = {node.v}")
        t.lock(i)
        out_idx[0] += 1
        inorder(node.r)

    inorder(root)
    t.set_tree(full, highlight=None, phase="output")
    t.done(note="완료 — LNR 순회 결과가 오름차순 정렬")


# ─────────────────────────────────────────────────────────────
#  개선된 알고리즘
# ─────────────────────────────────────────────────────────────
def shell_sort(t: Tracer):
    """gap 만큼 떨어진 원소끼리 삽입정렬. gap 을 줄여가며 반복.

    강의는 K=5,3,1 예시를 보여줬다. 여기선 일반화해 gap = n//2 부터
    절반씩 줄인다(마지막 gap=1 은 일반 삽입정렬과 동일).
    """
    a = t.a
    n = len(a)
    gap = n // 2
    while gap > 0:
        t.scalars(gap=gap)
        for i in range(gap, n):
            key = a[i]
            t.held(("temp", key))
            t.pointers(i=i, j=i)
            t.mark("select", active=(i,), note=f"gap={gap}: a[{i}]={key} 를 temp 로 빼낸다")
            j = i
            while j >= gap:
                t.held(("temp", key), active="temp")
                t.pointers(i=i, j=j)
                t.cmp(active=(j - gap,), note=f"gap={gap}: a[{j - gap}]({a[j - gap]}) 와 temp({key}) 비교")
                if a[j - gap] > key:
                    t.held(("temp", key))
                    t.write(j, a[j - gap], note=f"a[{j - gap}]={a[j - gap]} 를 {gap}칸 뒤로 (a[{j}]←{a[j - gap]})")
                    j -= gap
                else:
                    break
            t.held(("temp", key))
            t.pointers(i=i, j=j)
            t.write(j, key, note=f"빈자리 a[{j}] 에 temp={key} 를 꽂는다")
            t.clear_held()
        gap //= 2
    t.clear_scalars()
    t.clear_pointers()
    t.lock_all()
    t.done()


def quick_sort(t: Tracer):
    """마지막 원소를 pivot 으로 두고 양끝 포인터로 분할한다.

    강의 (a)~(g) 의 두 포인터(l, r) 분할 방식을 따른다.
    """
    a = t.a

    def partition(lo, hi):
        pivot = a[hi]
        t.held(("pivot", pivot))
        t.pointers(pivot=hi, l=lo, r=hi - 1)
        t.mark("pivot", active=(hi,), pivot=hi, note=f"pivot = a[{hi}] = {pivot} (맨 끝)")
        l, r = lo, hi - 1
        while True:
            while l <= r:
                t.held(("pivot", pivot), active="pivot")
                t.pointers(pivot=hi, l=l, r=r)
                t.cmp(active=(l,), pivot=hi, note=f"왼쪽 l: a[{l}]({a[l]}) 와 pivot({pivot}) 비교")
                if a[l] < pivot:
                    l += 1
                else:
                    break
            while l <= r:
                t.held(("pivot", pivot), active="pivot")
                t.pointers(pivot=hi, l=l, r=r)
                t.cmp(active=(r,), pivot=hi, note=f"오른쪽 r: a[{r}]({a[r]}) 와 pivot({pivot}) 비교")
                if a[r] > pivot:
                    r -= 1
                else:
                    break
            if l >= r:
                break
            t.held(("pivot", pivot))
            t.pointers(pivot=hi, l=l, r=r)
            t.swap(l, r, note=f"l·r 두 값을 교환 (a[{l}] ⇄ a[{r}])")
            l += 1
            r -= 1
        t.held(("pivot", pivot))
        t.pointers(pivot=hi, l=l)
        t.swap(l, hi, note=f"pivot 을 제자리 [{l}]로 (a[{l}] ⇄ a[{hi}])")
        t.lock(l)
        t.clear_held()
        return l

    def qsort(lo, hi):
        if lo > hi:
            return
        if lo == hi:
            t.lock(lo)
            return
        p = partition(lo, hi)
        qsort(lo, p - 1)
        qsort(p + 1, hi)

    qsort(0, len(a) - 1)
    t.clear_pointers()
    t.lock_all()
    t.done()


def merge_sort(t: Tracer):
    """분할 정복으로 정렬. 강의의 merge() 선택 규칙(S1[i] < S2[j])을 따른다.

    강의 코드는 부분리스트(S1,S2)를 복사해 S 에 다시 쓰지만, 막대 시각화를
    위해 원본 배열 위의 [lo..hi] 구간 인덱스를 명시적으로 다룬다.
    """
    a = t.a

    def merge(lo, mid, hi):
        left = a[lo : mid + 1]
        right = a[mid + 1 : hi + 1]
        i = j = 0
        k = lo
        while i < len(left) and j < len(right):
            t.pointers(i=lo + i, j=mid + 1 + j, k=k)
            t.cmp(
                active=(lo + i, mid + 1 + j),
                note=f"왼쪽 a[{lo + i}]({left[i]}) 와 오른쪽 a[{mid + 1 + j}]({right[j]}) 비교",
            )
            if left[i] <= right[j]:
                t.pointers(i=lo + i, j=mid + 1 + j, k=k)
                t.write(k, left[i], note=f"더 작은 왼쪽 {left[i]} 를 [{k}]에 기록")
                i += 1
            else:
                t.pointers(i=lo + i, j=mid + 1 + j, k=k)
                t.write(k, right[j], note=f"더 작은 오른쪽 {right[j]} 를 [{k}]에 기록")
                j += 1
            k += 1
        while i < len(left):
            t.pointers(i=lo + i, k=k)
            t.write(k, left[i], note=f"왼쪽 잔여 {left[i]} → [{k}]")
            i += 1
            k += 1
        while j < len(right):
            t.pointers(j=mid + 1 + j, k=k)
            t.write(k, right[j], note=f"오른쪽 잔여 {right[j]} → [{k}]")
            j += 1
            k += 1

    def msort(lo, hi):
        if lo >= hi:
            return
        mid = (lo + hi) // 2
        msort(lo, mid)
        msort(mid + 1, hi)
        merge(lo, mid, hi)

    msort(0, len(a) - 1)
    t.clear_pointers()
    t.lock_all()
    t.done()


def heap_sort(t: Tracer):
    """최대 힙을 만든 뒤 루트(최댓값)를 맨 뒤로 빼며 정렬한다.

    강의 목차에는 있으나 본문 슬라이드가 없어, 표준 배열 기반 힙정렬로 구현.
    """
    a = t.a
    n = len(a)

    def serialize(size):
        # 현재 힙 영역 [0, size) 만 트리로 그린다(빠져나간 뒤쪽은 트리에서 사라짐).
        def build(i):
            if i >= size:
                return None
            return {"v": a[i], "l": build(2 * i + 1), "r": build(2 * i + 2)}
        return build(0)

    def sift_down(start, end):
        root = start
        while True:
            child = 2 * root + 1
            if child >= end:
                break
            if child + 1 < end:
                t.set_tree(serialize(end), highlight=a[root], phase="heap")
                t.pointers(root=root, child=child)
                t.cmp(
                    active=(child, child + 1),
                    note=f"두 자식 a[{child}]({a[child]}) 와 a[{child + 1}]({a[child + 1]}) 중 큰 쪽 선택",
                )
                if a[child + 1] > a[child]:
                    child += 1
            t.set_tree(serialize(end), highlight=a[root], phase="heap")
            t.pointers(root=root, child=child)
            t.cmp(active=(root, child), note=f"부모 a[{root}]({a[root]}) 와 큰 자식 a[{child}]({a[child]}) 비교")
            if a[root] < a[child]:
                t.set_tree(serialize(end), highlight=a[child], phase="heap")
                t.swap(root, child, note=f"부모가 더 작으니 교환 (a[{root}] ⇄ a[{child}])")
                root = child
            else:
                break

    # 1단계: 최대 힙 만들기 (아래쪽 부모부터 sift-down)
    for start in range(n // 2 - 1, -1, -1):
        t.set_tree(serialize(n), highlight=a[start], phase="heap")
        t.pointers(root=start)
        t.mark("select", active=(start,), note=f"heapify: 부모 [{start}]부터 아래로 정리")
        sift_down(start, n)
    # 2단계: 루트(최댓값)를 맨 뒤로 빼며 정렬
    for end in range(n - 1, 0, -1):
        t.set_tree(serialize(end + 1), highlight=a[0], phase="heap")
        t.swap(0, end, note=f"최댓값(루트) a[0]={a[0]} 를 맨 뒤 [{end}]로 빼낸다")
        t.lock(end)
        sift_down(0, end)
    t.lock(0)
    t.set_tree()  # 트리 상태 해제
    t.clear_pointers()
    t.done()


def radix_sort(t: Tracer):
    """LSD 기수정렬. 1의 자리부터 0~9 버킷에 분배 후 모은다 (강의 예시 방식)."""
    a = t.a
    n = len(a)
    if n == 0:
        t.done()
        return
    max_v = max(a)
    exp = 1
    while max_v // exp > 0:
        t.scalars(exp=exp)
        buckets: list[list[int]] = [[] for _ in range(10)]
        for i in range(n):
            d = (a[i] // exp) % 10
            buckets[d].append(a[i])
            t.pointers(i=i)
            t.mark(
                "select",
                active=(i,),
                aux=[list(b) for b in buckets],
                note=f"a[{i}]={a[i]} 의 자리값 숫자 {d} → 버킷 {d} 로",
            )
        idx = 0
        for d in range(10):
            for v in buckets[d]:
                t.pointers(k=idx)
                t.write(idx, v, note=f"버킷 {d} 에서 꺼내 [{idx}]에 모으기")
                idx += 1
        exp *= 10
    t.clear_scalars()
    t.clear_pointers()
    t.lock_all()
    t.done()


# ─────────────────────────────────────────────────────────────
#  개그성 알고리즘
# ─────────────────────────────────────────────────────────────
def stalin_sort(t: Tracer):
    """순서를 어기는 원소를 '숙청'(제거)한다. 살아남은 것만 정렬돼 있다. ☭

    제거된 원소는 0 으로 만들어 그 자리에 남겨 둔다(눈에 보이게).
    O(n) 으로 빠르지만 데이터를 잃는다는 게 농담의 핵심.
    """
    a = t.a
    n = len(a)
    if n == 0:
        t.done()
        return
    keep_max = a[0]
    t.lock(0)
    for i in range(1, n):
        t.compare(i, i - 1, note="직전 통과값과 비교")
        if a[i] >= keep_max:
            keep_max = a[i]
            t.mark("select", active=(i,), note=f"{a[i]} 통과 ✓")
            t.lock(i)
        else:
            t.write(i, 0, note=f"순서 위반 → 숙청 ☭")
    t.done(note="스탈린 정렬 완료 (살아남은 값만 정렬됨)")


def bogo_sort(t: Tracer):
    """정렬될 때까지 전체를 무작위로 섞는다. 🎲 평균 O(n·n!).

    폭주 방지를 위해 셔플 횟수를 제한한다. 작은 배열에서만 의미 있음.
    """
    a = t.a
    n = len(a)
    MAX_SHUFFLE = 250
    rng = random.Random()  # 시드 고정 안 함: 매번 다른 운빨

    for tries in range(MAX_SHUFFLE + 1):
        ok = True
        for i in range(n - 1):
            t.compare(i, i + 1)
            if a[i] > a[i + 1]:
                ok = False
                break
        if ok:
            t.lock_all()
            t.done(note=f"{tries}번 셔플 후 우연히 정렬됨 🍀")
            return
        rng.shuffle(a)
        t.mark(
            "swap",
            active=list(range(n)),
            note=f"정렬 안 됨 → 전체 셔플 #{tries + 1} 🎲",
        )
    t.done(note=f"{MAX_SHUFFLE}번 시도 후 포기… 🥲 (운이 없었습니다)")


def sleep_sort(t: Tracer):
    """각 값이 '자기 값만큼 잠들었다 깨어난다'는 농담. 작은 값이 먼저 깨어남. ⏰

    실제 스레드/타이머 대신, 값 순서대로 깨어나 제자리에 놓이는 과정을 보여준다.
    """
    a = t.a
    n = len(a)
    order = sorted(range(n), key=lambda i: a[i])  # 깨어나는 순서 = 값 오름차순
    woken = [a[i] for i in order]
    for k, v in enumerate(woken):
        t.write(k, v, note=f"값 {v} 이(가) {v}ms 후 깨어남 ⏰ → [{k}]")
        t.lock(k)
    t.done(note="sleep sort 완료 (작은 값이 먼저 깨어남)")
