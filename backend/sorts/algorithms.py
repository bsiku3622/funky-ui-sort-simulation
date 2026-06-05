"""Lecture 18 (DS Sorting) 기반 정렬 알고리즘 구현.

각 함수는 Tracer 를 받아 tracer.a 위에서 정렬하며 frame 을 남긴다.
강의 PPT 에서 다룬 알고리즘을 충실히 따르고, 시각화를 위해 인덱스를
명시적으로 다루도록 약간 변형한 부분은 주석으로 표시했다.

개그성 알고리즘(Stalin / Bogo / Sleep)은 gag=True 로 분류한다.
"""

from __future__ import annotations

import random

from .tracer import Tracer

# 트리 시각화(binary_tree/heap)를 frame 에 실을 최대 원소 수.
# 최대 입력(250)까지 트리를 그대로 보여준다(250개 트리 ≈ 16~33MB, 무리 없음).
# 이보다 훨씬 큰 비정상적 입력에서만 트리를 생략(노드 트리 직렬화가 폭발하므로).
TREE_MAX = 250


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
    show_tree = n <= TREE_MAX  # 큰 n 은 트리 생략(막대만)

    def serialize(node):
        if node is None:
            return None
        return {"v": node.v, "l": serialize(node.l), "r": serialize(node.r)}

    def stree(root_node, highlight, phase):
        if show_tree:
            t.set_tree(serialize(root_node), highlight=highlight, phase=phase)

    # ── 1단계: 삽입 — 루트부터 경로를 타고 내려가며 자리를 찾는다 ──
    root = None
    for i in range(n):
        v = a[i]
        if root is None:
            root = _Node(v)
            stree(root, v, "insert")
            t.mark("select", active=(i,), note=f"{v} 를 루트로 삽입")
            continue
        cur = root
        while True:
            # 현재 노드와 비교 (트리 한 칸 내려가는 매 단계가 1프레임)
            stree(root, cur.v, "compare")
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
        stree(root, v, "insert")
        t.mark("select", active=(i,), note=f"빈 자리를 찾아 {v} 삽입")

    # ── 2단계: 중위순회(LNR) — 내려감(visit)·출력(output)을 각각 1프레임으로 ──
    full = serialize(root) if show_tree else None
    out_idx = [0]

    def setfull(highlight, phase):
        if show_tree:
            t.set_tree(full, highlight=highlight, phase=phase)

    def inorder(node):
        if node is None:
            return
        # 이 노드 방문 — LNR(왼쪽 → 자기 → 오른쪽) 순서로 본다
        setfull(node.v, "visit")
        t.mark("select", note=f"노드 {node.v} 방문 — 먼저 왼쪽(L)부터")
        # L: 왼쪽 서브트리 (있으면 내려갔다가 돌아온다)
        if node.l is not None:
            inorder(node.l)
            setfull(node.v, "visit")
            t.mark("select", note=f"왼쪽 서브트리 끝 → 노드 {node.v} 로 복귀, 이제 출력(N) 차례")
        # N: 이 노드를 출력
        i = out_idx[0]
        setfull(node.v, "output")
        t.write(i, node.v, note=f"LNR {i + 1}번째 출력 → [{i}] = {node.v}")
        t.lock(i)
        out_idx[0] += 1
        # R: 오른쪽 서브트리 (있으면 내려갔다가 돌아온다)
        if node.r is not None:
            setfull(node.v, "visit")
            t.mark("select", note=f"이제 노드 {node.v} 의 오른쪽(R)으로 내려간다")
            inorder(node.r)
            setfull(node.v, "visit")
            t.mark("select", note=f"오른쪽 서브트리 끝 → 노드 {node.v} 서브트리 완료, 부모로 복귀")

    inorder(root)
    setfull(None, "output")
    t.done(note="완료 — LNR 순회 결과가 오름차순 정렬")


# ─────────────────────────────────────────────────────────────
#  개선된 알고리즘
# ─────────────────────────────────────────────────────────────
def shell_sort(t: Tracer):
    """gap 만큼 떨어진 원소끼리 삽입정렬. gap 을 줄여가며 반복.

    강의(PPT)의 gap 수열을 따른다: n//2 에서 시작해 홀수로 맞춘 뒤 2씩 줄여 1까지.
    예) n=11 → K = 5, 3, 1 (PPT와 동일).
    """
    a = t.a
    n = len(a)
    gap = n // 2
    if gap % 2 == 0:
        gap -= 1  # 홀수로 (PPT: n=11 → 5, 3, 1)
    while gap >= 1:
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
        if gap == 1:
            break
        gap -= 2  # 다음 홀수 gap (PPT: 5 → 3 → 1)
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
            if left[i] < right[j]:  # PPT 의 merge 규칙: S1[i] < S2[j] (동점이면 오른쪽)
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


def shell_classic_sort(t: Tracer):
    """고전(원조) Shell Sort — Shell(1959) 의 gap 수열 n/2, n/4, …, 1 을 쓴다.

    강의판 Shell Sort 와 같은 'gap 간격 삽입정렬'이지만, gap 을 홀수로 맞추지 않고
    그냥 절반씩 줄인다는 점만 다르다(가장 널리 알려진 일반형).
    """
    a = t.a
    n = len(a)
    gap = n // 2
    while gap >= 1:
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
        gap //= 2  # 절반씩 (n/2 → n/4 → … → 1)
    t.clear_scalars()
    t.clear_pointers()
    t.lock_all()
    t.done()


def dual_pivot_quick_sort(t: Tracer):
    """두 개의 pivot(P1 ≤ P2)으로 세 구간(<P1, P1..P2, >P2)으로 나눈다.

    Java 의 Arrays.sort(기본형) 가 쓰는 Yaroslavskiy 의 dual-pivot quicksort.
    양 끝을 두 pivot 으로 잡고, lt·gt·k 세 포인터로 한 번에 3분할한다.
    """
    a = t.a

    def partition(lo, hi):
        # 양 끝을 두 pivot 으로 — 먼저 P1 ≤ P2 가 되도록 맞춘다
        if a[lo] > a[hi]:
            t.pointers(lo=lo, hi=hi)
            t.swap(lo, hi, note=f"양 끝 정렬: a[{lo}] ⇄ a[{hi}] (P1 ≤ P2 보장)")
        p1, p2 = a[lo], a[hi]
        t.held(("P1", p1), ("P2", p2))
        t.pointers(lo=lo, hi=hi)
        t.mark("pivot", active=(lo, hi), note=f"두 pivot: P1=a[{lo}]={p1}, P2=a[{hi}]={p2}")
        lt, gt, k = lo + 1, hi - 1, lo + 1
        while k <= gt:
            t.held(("P1", p1), ("P2", p2))
            t.pointers(lt=lt, gt=gt, k=k)
            t.cmp(active=(k,), note=f"a[{k}]({a[k]}) 를 P1({p1})·P2({p2}) 와 비교")
            if a[k] < p1:
                t.held(("P1", p1), ("P2", p2))
                t.pointers(lt=lt, gt=gt, k=k)
                t.swap(k, lt, note=f"a[{k}] < P1 → 왼쪽 구간으로 (a[{k}] ⇄ a[{lt}])")
                lt += 1
            elif a[k] > p2:
                while a[gt] > p2 and k < gt:
                    t.held(("P1", p1), ("P2", p2))
                    t.pointers(lt=lt, gt=gt, k=k)
                    t.cmp(active=(gt,), note=f"오른쪽 gt: a[{gt}]({a[gt]}) > P2({p2}) → 안쪽으로")
                    gt -= 1
                t.held(("P1", p1), ("P2", p2))
                t.pointers(lt=lt, gt=gt, k=k)
                t.swap(k, gt, note=f"a[{k}] > P2 → 오른쪽 구간으로 (a[{k}] ⇄ a[{gt}])")
                gt -= 1
                if a[k] < p1:
                    t.held(("P1", p1), ("P2", p2))
                    t.pointers(lt=lt, gt=gt, k=k)
                    t.swap(k, lt, note=f"바뀐 a[{k}] < P1 → 다시 왼쪽으로 (a[{k}] ⇄ a[{lt}])")
                    lt += 1
            k += 1
        lt -= 1
        gt += 1
        t.held(("P1", p1), ("P2", p2))
        t.pointers(lt=lt, gt=gt)
        t.swap(lo, lt, note=f"P1 을 제자리 [{lt}]로 (a[{lo}] ⇄ a[{lt}])")
        t.swap(hi, gt, note=f"P2 를 제자리 [{gt}]로 (a[{hi}] ⇄ a[{gt}])")
        t.lock(lt)
        t.lock(gt)
        t.clear_held()
        return lt, gt

    def dpsort(lo, hi):
        if lo > hi:
            return
        if lo == hi:
            t.lock(lo)
            return
        if hi - lo == 1:
            t.pointers(lo=lo, hi=hi)
            t.cmp(active=(lo, hi), note=f"두 원소 a[{lo}]({a[lo]}) 와 a[{hi}]({a[hi]}) 비교")
            if a[lo] > a[hi]:
                t.swap(lo, hi, note=f"a[{lo}] ⇄ a[{hi}]")
            t.lock(lo)
            t.lock(hi)
            return
        lp, gp = partition(lo, hi)
        dpsort(lo, lp - 1)
        dpsort(lp + 1, gp - 1)
        dpsort(gp + 1, hi)

    dpsort(0, len(a) - 1)
    t.clear_pointers()
    t.lock_all()
    t.done()


def tim_sort(t: Tracer):
    """run(작은 구간)을 삽입정렬한 뒤, run 들을 병합해 합치는 하이브리드 정렬. ⏱

    Python 의 sorted()·Java 의 Object[] 정렬이 쓰는 Tim Sort 의 핵심 구조를 보여준다
    (run 삽입정렬 + 안정 병합). 실제 Tim Sort 의 자연 run 탐지·갤로핑·스택 불변식은
    생략하고, 막대로 보이도록 run 이 여러 개 생기게 minrun 을 잡는다.
    """
    a = t.a
    n = len(a)
    if n <= 1:
        t.lock_all()
        t.done()
        return

    # 시각화를 위해 run 이 4개 안팎 생기도록 minrun 을 정한다(원조는 32~64).
    min_run = 2
    while min_run * 4 < n:
        min_run *= 2
    min_run = min(min_run, 32)

    # ── 1단계: min_run 크기의 run 들을 각각 삽입정렬 ──
    runs = []
    start = 0
    while start < n:
        end = min(start + min_run, n)
        t.scalars(run=len(runs) + 1, minrun=min_run)
        t.mark("select", active=tuple(range(start, end)), note=f"run #{len(runs) + 1}: [{start}..{end - 1}] 을 삽입정렬")
        for j in range(start + 1, end):
            key = a[j]
            t.held(("key", key))
            k = j - 1
            while k >= start:
                t.held(("key", key), active="key")
                t.pointers(i=j, j=k)
                t.cmp(active=(k,), note=f"run 내부: a[{k}]({a[k]}) 와 key({key}) 비교")
                if a[k] > key:
                    t.held(("key", key))
                    t.write(k + 1, a[k], note=f"a[{k}]={a[k]} 를 뒤로 (a[{k + 1}]←{a[k]})")
                    k -= 1
                else:
                    break
            t.held(("key", key))
            t.write(k + 1, key, note=f"빈자리 a[{k + 1}] 에 key={key}")
            t.clear_held()
        runs.append((start, end - 1))
        start = end
    t.clear_held()

    # ── 2단계: run 들을 양옆으로 안정 병합 (같으면 왼쪽 먼저 → 안정성) ──
    def merge(lo, mid, hi):
        left = a[lo : mid + 1]
        right = a[mid + 1 : hi + 1]
        x = y = 0
        k = lo
        while x < len(left) and y < len(right):
            t.pointers(i=lo + x, j=mid + 1 + y, k=k)
            t.cmp(active=(lo + x, mid + 1 + y), note=f"병합: 왼쪽 {left[x]} 와 오른쪽 {right[y]} 비교")
            if left[x] <= right[y]:
                t.write(k, left[x], note=f"작은 왼쪽 {left[x]} → [{k}]")
                x += 1
            else:
                t.write(k, right[y], note=f"작은 오른쪽 {right[y]} → [{k}]")
                y += 1
            k += 1
        while x < len(left):
            t.write(k, left[x], note=f"왼쪽 잔여 {left[x]} → [{k}]")
            x += 1
            k += 1
        while y < len(right):
            t.write(k, right[y], note=f"오른쪽 잔여 {right[y]} → [{k}]")
            y += 1
            k += 1

    while len(runs) > 1:
        merged = []
        idx = 0
        while idx < len(runs):
            if idx + 1 < len(runs):
                lo, mid = runs[idx][0], runs[idx][1]
                hi = runs[idx + 1][1]
                t.scalars(runs_left=len(runs))
                t.mark("select", active=tuple(range(lo, hi + 1)), note=f"run 병합: [{lo}..{mid}] + [{mid + 1}..{hi}]")
                merge(lo, mid, hi)
                merged.append((lo, hi))
                idx += 2
            else:
                merged.append(runs[idx])
                idx += 1
        runs = merged

    t.clear_scalars()
    t.clear_pointers()
    t.lock_all()
    t.done()


def heap_sort(t: Tracer):
    """최대 힙을 만든 뒤 루트(최댓값)를 맨 뒤로 빼며 정렬한다.

    강의 목차에는 있으나 본문 슬라이드가 없어, 표준 배열 기반 힙정렬로 구현.
    """
    a = t.a
    n = len(a)
    show_tree = n <= TREE_MAX  # 큰 n 은 트리 생략(막대만)

    def serialize(size):
        # 현재 힙 영역 [0, size) 만 트리로 그린다(빠져나간 뒤쪽은 트리에서 사라짐).
        def build(i):
            if i >= size:
                return None
            return {"v": a[i], "l": build(2 * i + 1), "r": build(2 * i + 2)}
        return build(0)

    def htree(size, highlight):
        if show_tree:
            t.set_tree(serialize(size), highlight=highlight, phase="heap")

    def sift_down(start, end):
        root = start
        while True:
            child = 2 * root + 1
            if child >= end:
                # 자식이 없는 곳(리프)까지 내려왔으면 끝 — 멈추는 판정도 한 단계로 보인다
                htree(end, a[root])
                t.pointers(root=root)
                t.mark("select", active=(root,), note=f"a[{root}]={a[root]} 는 자식이 없다(리프 도달) → sift-down 종료")
                break
            if child + 1 < end:
                htree(end, a[root])
                t.pointers(root=root, child=child)
                t.cmp(
                    active=(child, child + 1),
                    note=f"두 자식 a[{child}]({a[child]}) 와 a[{child + 1}]({a[child + 1]}) 중 큰 쪽 선택",
                )
                if a[child + 1] > a[child]:
                    child += 1
            htree(end, a[root])
            t.pointers(root=root, child=child)
            t.cmp(active=(root, child), note=f"부모 a[{root}]({a[root]}) 와 큰 자식 a[{child}]({a[child]}) 비교")
            if a[root] < a[child]:
                htree(end, a[child])
                t.swap(root, child, note=f"부모가 더 작으니 교환 (a[{root}] ⇄ a[{child}])")
                root = child
            else:
                # 부모가 자식보다 크거나 같으면 힙 속성 만족 — 여기서 멈춘다는 판정을 보여준다
                htree(end, a[root])
                t.pointers(root=root, child=child)
                t.mark("select", active=(root,), note=f"부모 a[{root}]({a[root]}) ≥ 큰 자식 a[{child}]({a[child]}) → 힙 속성 만족, sift-down 종료")
                break

    # 1단계: 최대 힙 만들기 (아래쪽 부모부터 sift-down)
    for start in range(n // 2 - 1, -1, -1):
        htree(n, a[start])
        t.pointers(root=start)
        t.mark("select", active=(start,), note=f"heapify: 부모 [{start}]부터 아래로 정리")
        sift_down(start, n)
    # 2단계: 루트(최댓값)를 맨 뒤로 빼며 정렬
    for end in range(n - 1, 0, -1):
        htree(end + 1, a[0])
        t.swap(0, end, note=f"최댓값(루트) a[0]={a[0]} 를 맨 뒤 [{end}]로 빼낸다")
        t.lock(end)
        if end > 1:
            # 힙이 한 칸 줄었으니, 새로 올라온 루트부터 다시 정리한다는 단계를 보여준다
            htree(end, a[0])
            t.pointers(root=0)
            t.mark("select", active=(0,), note=f"힙 크기 {end} 로 줄었다 — 새 루트 a[0]={a[0]} 부터 다시 sift-down")
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

    이론상 끝나지 않을 수 있다(작은 배열만 운 좋게 정렬됨). 강제로 멈춰 '포기'하지
    않고, 충분히 많이 섞는 모습만 보여준 뒤 끝나지 않음을 ∞ 로 표시한다(t.infinite).
    frame 은 유한하게 만들어야 결과를 돌려줄 수 있으므로 frame 예산까지만 섞는다.
    """
    a = t.a
    n = len(a)
    FRAME_BUDGET = 6000  # 이 정도 섞어도 안 끝나면 사실상 ∞ 로 본다
    rng = random.Random()  # 시드 고정 안 함: 매번 다른 운빨
    tries = 0

    while True:
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
        tries += 1
        t.mark(
            "swap",
            active=list(range(n)),
            note=f"정렬 안 됨 → 전체 셔플 #{tries} 🎲",
        )
        if len(t.frames) >= FRAME_BUDGET:
            t.infinite = True
            t.done(note=f"{tries}번 섞어도 안 끝남… 이게 Bogo — 사실상 영원히 ∞ ♾️")
            return


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
