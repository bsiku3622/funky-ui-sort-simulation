// 알고리즘별 튜터 페이지. id → { title, render() }.
// 강의(18_DS_Sorting) 슬라이드 내용을 친절한 ~이다 체로 자세히 풀어 설명한다.
import { Accordion } from "@studio-baeks/funky-ui";
import {
  buildBST,
  bubbleRows,
  EX_BST,
  EX_DC,
  EX_HEAP,
  EX_RADIX,
  EX_SIMPLE,
  heapInsert,
  inorder,
  insertionRows,
  quickPartitionRows,
  radixPasses,
  selectionRows,
  shellRows,
} from "./data";
import {
  Bullets,
  BucketGrid,
  ComplexityCard,
  HeapArrayMap,
  ProsCons,
  Prose,
  Pseudo,
  Section,
  SplitMerge,
  type Complexity,
} from "./visuals";
import { InteractiveMemoryTable, InteractiveTreeInsert } from "./interactive";

export interface Tutorial {
  title: string;
  render: () => JSX.Element;
}

const cx = (c: Complexity) => c;

const PyCode = ({ code }: { code: string }) => (
  <Section title="Code (Python)">
    <Pseudo code={code} />
  </Section>
);

// ───────────────────────── Bubble ─────────────────────────
const bubble = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ best: "O(n)", avg: "O(n²)", worst: "O(n²)", space: "O(1)", stable: true, inPlace: true })} />
    <Section title="How it works">
      <Prose>
        Bubble Sort는 가장 먼저 배우는 정렬이자 가장 단순한 정렬이다. 아이디어는 딱 하나, <b>“바로 옆 사람과만 키를 비교해서, 내가 더 크면 자리를 바꾼다”</b> 이다.
        배열의 맨 앞에서 시작해 <code>0번-1번</code>, <code>1번-2번</code>, <code>2번-3번</code> … 이렇게 <b>이웃한 두 칸씩</b> 차례로 비교해 나간다.
      </Prose>
      <Prose>
        이렇게 한 번 끝까지 훑고 나면 신기한 일이 벌어진다. 그 줄에서 <b>가장 큰 값</b>이 마치 물속의 공기방울이 수면으로 떠오르듯 맨 뒤로 밀려가 자리를 잡는다.
        이름이 “버블(거품)”인 이유가 바로 이것이다. 큰 값이 한 칸씩 오른쪽으로 떠밀려 올라가기 때문이다.
      </Prose>
      <Prose>
        맨 뒤 한 자리가 확정됐으니, 다음 바퀴(패스)에서는 그 자리를 빼고 다시 처음부터 훑는다. 그러면 두 번째로 큰 값이 그 앞에 자리를 잡는다.
        이렇게 <b>확정된 영역이 뒤에서부터 한 칸씩 늘어나며</b> 결국 전체가 정렬된다.
      </Prose>
    </Section>
    <Section title={`Walkthrough — input [${EX_SIMPLE.join(", ")}]`}>
      <Prose>
        강의 예제 <code>50 60 40 35 73 52</code> 의 첫 패스를 손으로 따라가 보면 이렇다.
        <br />· <code>50</code> 과 <code>60</code> 비교 → 50이 작으니 그대로.
        <br />· <code>60</code> 과 <code>40</code> 비교 → 60이 크니 교환 → <code>50 40 60 …</code>
        <br />· <code>60</code> 과 <code>35</code> → 교환, <code>60</code> 과 <code>73</code> → 그대로, <code>73</code> 과 <code>52</code> → 교환.
        <br />첫 패스가 끝나면 가장 큰 <b>73</b> 이 맨 끝에 확정된다. 아래 표에서 초록 칸이 바로 이렇게 뒤에서부터 굳어가는 “확정 영역”이다.
      </Prose>
      <InteractiveMemoryTable rows={bubbleRows(EX_SIMPLE)} />
    </Section>
    <Section title="Complexity">
      <Prose>
        패스를 최대 <code>n</code> 번 돌고, 각 패스마다 비교를 최대 <code>n</code> 번 하니 전체 일의 양은 <b>O(n²)</b> 이다. n이 두 배가 되면 일은 네 배가 된다는 뜻이라, 데이터가 커지면 급격히 느려진다.
      </Prose>
      <Prose>
        다만 똑똑한 최적화가 하나 있다. <b>한 패스를 도는 동안 교환이 한 번도 일어나지 않았다면, 그건 이미 다 정렬돼 있다는 뜻</b>이다. 이때 곧장 멈추면, 이미 정렬된 입력에 대해서는 단 한 번만 훑고 끝나므로 <b>O(n)</b> 까지 빨라진다. 아래 코드의 <code>swapped</code> 플래그가 그 역할을 한다.
      </Prose>
    </Section>
    <PyCode
      code={`def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):       # 뒤쪽 i개는 이미 확정됐으니 건너뜀
            if arr[j] > arr[j + 1]:      # 이웃과 비교
                arr[j], arr[j + 1] = arr[j + 1], arr[j]   # 순서가 틀렸으면 교환
                swapped = True
        if not swapped:                  # 한 바퀴 동안 교환이 없으면 이미 정렬 완료
            break
    return arr

print(bubble_sort([50, 60, 40, 35, 73, 52]))   # [35, 40, 50, 52, 60, 73]`}
    />
    <ProsCons
      pros={["구현이 가장 단순해서 이해하기 쉽다", "이미 정렬된 입력은 O(n)으로 빨리 끝난다", "in-place·stable sort다"]}
      cons={["교환이 매우 잦아 실제로는 가장 느린 축이다", "데이터가 커지면 O(n²)이라 쓰기 어렵다"]}
    />
  </>
);

// ───────────────────────── Insertion ─────────────────────────
const insertion = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ best: "O(n)", avg: "O(n²)", worst: "O(n²)", space: "O(1)", stable: true, inPlace: true })} />
    <Section title="How it works">
      <Prose>
        Insertion Sort는 우리가 손에 든 <b>카드를 정리하는 방식</b> 그대로다. 카드를 한 장씩 새로 받을 때마다, 이미 정렬해 둔 왼쪽 카드들 사이의 <b>알맞은 자리에 쏙 끼워 넣는다</b>. 그게 전부다.
      </Prose>
      <Prose>
        배열로 옮겨 보면, 맨 왼쪽 한 칸은 “이미 정렬된 구간”이라고 치고 시작한다. 그다음 칸의 값을 하나 꺼내(이걸 <code>key</code> 라 부른다) 왼쪽 구간을 오른쪽 끝부터 살펴본다.
        <b><code>key</code> 보다 큰 값들은 한 칸씩 오른쪽으로 밀어내고</b>, 그렇게 생긴 빈자리에 <code>key</code> 를 내려놓는다. 이 과정을 반복하면 정렬된 구간이 한 칸씩 자라난다.
      </Prose>
    </Section>
    <Section title={`Walkthrough — input [${EX_SIMPLE.join(", ")}]`}>
      <Prose>
        <code>50 60 40 35 73 52</code> 를 끼워 넣어 보자. <code>50</code> 은 정렬됐다 치고 시작한다.
        <code>60</code> 은 50보다 크니 그대로 두고, <code>40</code> 은 50·60을 모두 밀어내고 맨 앞으로 간다(<code>40 50 60</code>). <code>35</code> 도 맨 앞으로 가고, <code>73</code> 은 가장 크니 그대로,
        <code>52</code> 는 50과 60 사이에 끼어든다. 아래 표에서 <b>주황 칸이 방금 끼워 넣은 <code>key</code></b> 이고, 초록 칸이 정렬이 끝난 앞 구간이다.
      </Prose>
      <InteractiveMemoryTable rows={insertionRows(EX_SIMPLE)} />
    </Section>
    <Section title="Complexity">
      <Prose>
        평균적으로는 Bubble Sort와 같은 <b>O(n²)</b> 이다. 하지만 결정적인 강점이 하나 있다. 데이터가 <b>이미 거의 정렬돼 있으면 밀어낼 값이 거의 없어서</b>, 각 카드가 제자리에 바로 꽂힌다. 이 경우 거의 <b>O(n)</b> 에 가깝게 매우 빨라진다.
      </Prose>
      <Prose>
        그래서 Insertion Sort는 작은 배열이나 부분적으로 정렬된 데이터에서 실전 성능이 아주 좋다. 실제로 파이썬의 표준 정렬(Timsort)도 자잘한 조각들을 정렬할 때 내부적으로 Insertion Sort를 쓴다.
      </Prose>
    </Section>
    <PyCode
      code={`def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]                     # 새로 꺼낸 카드
        j = i - 1
        while j >= 0 and arr[j] > key:   # key보다 큰 값들을
            arr[j + 1] = arr[j]          # 한 칸씩 오른쪽으로 밀고
            j -= 1
        arr[j + 1] = key                 # 생긴 빈자리에 key를 꽂는다
    return arr

print(insertion_sort([50, 60, 40, 35, 73, 52]))   # [35, 40, 50, 52, 60, 73]`}
    />
    <ProsCons
      pros={["거의 정렬된 데이터에서는 O(n)에 가깝게 매우 빠르다", "stable sort다", "값이 들어오는 대로 정렬하는 온라인 처리가 가능하다"]}
      cons={["역순으로 들어온 데이터에는 O(n²)이다", "값을 한 칸씩 미는 이동 비용이 크다"]}
    />
  </>
);

// ───────────────────────── Selection ─────────────────────────
const selection = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ best: "O(n²)", avg: "O(n²)", worst: "O(n²)", space: "O(1)", stable: false, inPlace: true })} />
    <Section title="How it works">
      <Prose>
        Selection Sort는 이름 그대로다. 아직 정렬되지 않은 구간을 <b>전부 훑어서 가장 작은 값을 “선택”하고, 그 구간의 맨 앞으로 가져온다</b>. 그리고 그 자리를 확정한 뒤, 남은 구간에서 또 가장 작은 값을 골라 그다음 자리에 놓는다. 이걸 반복한다.
      </Prose>
      <Prose>
        Bubble·Insertion Sort와 가장 다른 점은 <b>교환 횟수</b>다. 비교는 매번 구간 전체를 훑으니 많이 하지만, 실제로 자리를 바꾸는 일은 <b>한 라운드에 딱 한 번</b>뿐이다. 그래서 전체 교환은 최대 <code>n−1</code> 번으로 끝난다.
      </Prose>
    </Section>
    <Section title={`Walkthrough — input [${EX_SIMPLE.join(", ")}]`}>
      <Prose>
        <code>50 60 40 35 73 52</code> 에서 전체 최솟값은 <b>35</b> 다. 이걸 맨 앞 50과 교환한다(<code>35 60 40 50 73 52</code>). 그다음 35를 뺀 나머지의 최솟값은 40이니 두 번째 자리로, 또 50, 52, 60 … 이렇게 한 라운드마다 최솟값 하나가 앞에서부터 확정된다. 아래 표의 초록 칸이 그 확정 구간이다.
      </Prose>
      <InteractiveMemoryTable rows={selectionRows(EX_SIMPLE)} />
    </Section>
    <Section title="Complexity">
      <Prose>
        비교 횟수가 입력 상태와 무관하게 항상 일정하다. 이미 정렬된 데이터가 들어와도 <b>매번 구간 전체를 끝까지 훑어 최솟값을 확인</b>하기 때문에 항상 <b>O(n²)</b> 이다. Bubble·Insertion Sort처럼 “운 좋으면 빨라지는” 일이 없다.
      </Prose>
      <Prose>
        대신 교환(쓰기)이 최소라는 점은 진짜 장점이다. 메모리에 값을 쓰는 비용이 비싼 환경(예: 플래시 메모리)에서는 비교를 좀 더 하더라도 쓰기가 적은 Selection Sort가 유리할 수 있다.
      </Prose>
    </Section>
    <PyCode
      code={`def selection_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):        # 남은 구간 전체를 훑어
            if arr[j] < arr[min_idx]:    # 최솟값의 위치를 기억해 둔다
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]   # 라운드당 교환은 딱 한 번
    return arr

print(selection_sort([50, 60, 40, 35, 73, 52]))   # [35, 40, 50, 52, 60, 73]`}
    />
    <ProsCons
      pros={["교환 횟수가 최소라 쓰기 비용이 비쌀 때 유리하다", "추가 메모리가 필요 없는 in-place sort다"]}
      cons={["이미 정렬돼 있어도 항상 O(n²)이다", "unstable sort다"]}
    />
  </>
);

// ───────────────────────── Binary Tree ─────────────────────────
const binaryTree = (): JSX.Element => {
  const root = buildBST(EX_BST);
  return (
    <>
      <ComplexityCard c={cx({ best: "O(n log n)", avg: "O(n log n)", worst: "O(n²)", space: "O(n)", stable: true, inPlace: false })} />
      <Section title="How it works">
        <Prose>
          Binary Tree Sort는 <b>Binary Search Tree(BST)라는 자료구조의 성질을 그대로 빌려 쓰는</b> 정렬이다. BST에는 한 가지 약속이 있다.
          어떤 노드를 보든 <b>왼쪽 자식은 그 노드보다 작고, 오른쪽 자식은 그보다 크거나 같다</b>는 것이다.
        </Prose>
        <Prose>
          그래서 정렬은 두 단계로 끝난다. 먼저 입력값을 하나씩 BST에 <b>삽입</b>한다. 새 값이 들어오면 루트부터 시작해 “나보다 작네 → 왼쪽으로, 크네 → 오른쪽으로” 내려가다 빈자리를 만나면 거기에 매달린다.
          모든 값을 다 넣었으면, 트리를 <b>in-order 순회(LNR: 왼쪽 → 자기 자신 → 오른쪽)</b> 순서로 방문하기만 하면 신기하게도 값이 <b>저절로 오름차순으로</b> 흘러나온다.
        </Prose>
      </Section>
      <Section title={`Build the BST — insert order [${EX_BST.join(", ")}]`}>
        <Prose>
          아래에서 “다음 스텝”을 누르며 값을 하나씩 넣어 보자. 매번 루트부터 비교하며 내려가 자리를 찾는 모습이 보인다(분홍 노드 = 방금 삽입된 노드).
        </Prose>
        <InteractiveTreeInsert values={EX_BST} mode="bst" />
      </Section>
      <Section title="Traversal direction = sort order">
        <Prose>
          in-order 순회를 어느 방향부터 도느냐에 따라 정렬 방향이 정해진다. <b>LNR</b>(왼쪽부터)로 돌면 작은 값부터 나와 <b>오름차순</b>, 반대로 <b>RNL</b>(오른쪽부터)로 돌면 큰 값부터 나와 <b>내림차순</b>이다. 순회 순서만 뒤집으면 정렬 방향이 바뀐다는 게 이 정렬의 우아한 점이다.
        </Prose>
        <Prose>위 트리를 LNR로 순회한 결과는 다음과 같다:</Prose>
        <div className="resultline">{inorder(root).join("  →  ")}</div>
      </Section>
      <Section title="Complexity">
        <Prose>
          트리가 좌우로 <b>균형 잡혀 있으면</b> 한 값을 삽입할 때 높이만큼만 내려가면 되니 삽입이 <code>O(log n)</code>, 전체가 <b>O(n log n)</b> 으로 빠르다.
          하지만 함정이 있다. <b>이미 정렬된 데이터를 넣으면</b> 값이 계속 한쪽으로만 매달려 트리가 <b>한 줄로 길게 늘어진 막대(사향 트리)</b> 가 된다. 이러면 삽입이 <code>O(n)</code> 으로 느려지고 전체가 <b>O(n²)</b> 로 떨어진다. 그래서 강의에서도 느린 무리에 포함시켰다.
        </Prose>
      </Section>
      <PyCode
        code={`class Node:
    def __init__(self, key):
        self.key = key; self.left = None; self.right = None

def insert(node, key):
    if node is None: return Node(key)        # 빈 자리를 만나면 새 노드
    if key < node.key: node.left  = insert(node.left, key)    # 작으면 왼쪽
    else:              node.right = insert(node.right, key)   # 크면 오른쪽
    return node

def inorder(node, out):          # 왼쪽 → 자기 자신 → 오른쪽 = 오름차순
    if node:
        inorder(node.left, out); out.append(node.key); inorder(node.right, out)

def binary_tree_sort(data):
    root = None
    for x in data: root = insert(root, x)
    out = []; inorder(root, out); return out`}
      />
      <ProsCons
        pros={["트리 구조가 정렬에 쓰이는 과정을 직접 보여줘 교육적이다", "균형이 잡히면 O(n log n)이다"]}
        cons={["이미 정렬된 입력에서 사향 트리가 되어 O(n²)이 된다", "트리 노드를 위한 추가 메모리가 필요하다"]}
      />
    </>
  );
};

// ───────────────────────── Shell ─────────────────────────
const shell = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ best: "O(n log n)", avg: "O(n^1.25)", worst: "O(n²)", space: "O(1)", stable: false, inPlace: true })} />
    <Section title="How it works">
      <Prose>
        Shell Sort는 <b>Insertion Sort의 업그레이드 버전</b>이다. Insertion Sort의 약점은 분명하다. 아주 작은 값이 맨 뒤에 있으면, 그 값이 맨 앞까지 가려면 <b>한 칸씩 밖에 못 움직여서</b> 엄청나게 많은 이동이 필요하다.
      </Prose>
      <Prose>
        Shell Sort는 이걸 영리하게 푼다. 처음에는 <b>멀리 떨어진(간격 K) 원소끼리만 묶어서</b> Insertion Sort를 한다. 그러면 멀리 있는 값이 단번에 제 위치 근처로 “점프”한다. 그다음 <b>간격 K를 점점 줄여가며</b> 같은 일을 반복하고, 마지막에 <code>K=1</code> 이 되면 그건 그냥 보통의 Insertion Sort인데, 이때는 이미 거의 정렬돼 있어서 살짝만 손보면 끝난다. <b>“큰 그림을 먼저 대충 맞춰 놓고, 점점 정밀하게 다듬는다”</b> 가 핵심 발상이다.
      </Prose>
    </Section>
    <Section title={`Shrinking the gap — input [${EX_SIMPLE.join(", ")}]`}>
      <Prose>
        강의는 <code>77 62 14 19 30 21 10 25 70 15 6</code> 을 <code>K=5 → 3 → 1</code> 로 줄여가며 보여준다.
        <code>K=5</code> 일 땐 5칸 떨어진 <code>(77, 21, 6)</code> 같은 묶음을 각각 정렬하는데, 이것만으로 작은 값 6이 한 번에 맨 앞으로, 큰 값 77이 뒤로 크게 이동한다.
        아래 표는 같은 원리를 짧은 예제에 적용해, 각 간격으로 한 바퀴 돌린 직후의 상태를 보여준다.
      </Prose>
      <InteractiveMemoryTable rows={shellRows(EX_SIMPLE)} />
    </Section>
    <Section title="Complexity">
      <Prose>
        성능은 간격을 어떤 수열로 줄이느냐에 달려 있어 분석이 까다로운데, 강의는 대표적으로 <b>O(n^1.25)</b> 로 적는다. Insertion Sort(<code>n²</code>)보다는 확실히 빠르고, 곧 배울 Quick Sort(<code>n log n</code>)보다는 느린, <b>딱 중간쯤의 성능</b>이다. 구현이 간단하면서도 꽤 쓸 만해서 실전에서도 종종 쓰인다.
      </Prose>
    </Section>
    <PyCode
      code={`def shell_sort(arr):
    n = len(arr)
    gap = n // 2                     # 간격을 절반씩 줄여 나간다
    while gap > 0:
        for i in range(gap, n):      # 간격 gap만큼 떨어진 원소끼리 Insertion Sort
            temp = arr[i]; j = i
            while j >= gap and arr[j - gap] > temp:
                arr[j] = arr[j - gap]; j -= gap
            arr[j] = temp
        gap //= 2                    # 마지막 gap=1은 보통의 Insertion Sort
    return arr`}
    />
    <ProsCons
      pros={["Insertion Sort보다 훨씬 빠르다", "추가 메모리가 필요 없는 in-place sort다", "간격 수열을 바꿔 성능을 조절할 수 있다"]}
      cons={["unstable sort다", "간격 수열에 따라 복잡도 분석이 까다롭다"]}
    />
  </>
);

// ───────────────────────── Quick ─────────────────────────
const quick = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ best: "O(n log n)", avg: "O(n log n)", worst: "O(n²)", space: "O(log n)", stable: false, inPlace: true })} />
    <Section title="How it works">
      <Prose>
        Quick Sort는 <b>“기준 하나를 정하고 그보다 작은 무리와 큰 무리로 갈라놓기”</b> 를 반복하는 정렬이다. 먼저 <b>pivot(기준값)</b> 을 하나 고른다. 그리고 pivot보다 작은 값은 모두 왼쪽으로, 큰 값은 모두 오른쪽으로 몰아넣는다. 이 가르는 작업을 <b>분할(partition)</b> 이라고 한다.
      </Prose>
      <Prose>
        분할이 끝나면 pivot은 정확히 자기가 있어야 할 <b>최종 위치</b>에 놓인다(왼쪽은 다 작고 오른쪽은 다 크니까). 그러면 이제 왼쪽 무리와 오른쪽 무리에 대해 똑같은 일을 <b>재귀적으로</b> 반복하기만 하면 된다. Merge Sort가 “일단 쪼갠 뒤 합칠 때 정렬”한다면, Quick Sort는 반대로 <b>쪼개는 순간에 정렬</b>하는 셈이다.
      </Prose>
    </Section>
    <Section title={`First partition — input [${EX_DC.join(", ")}]`}>
      <Prose>
        강의는 <code>85 24 63 45 17 31 96 50</code> 에서 맨 끝 <b>50을 pivot</b> 으로 잡는다. 그리고 왼쪽 포인터 <code>l</code> 은 50보다 큰 값을, 오른쪽 포인터 <code>r</code> 은 50보다 작은 값을 찾아 서로 다가오다, 둘을 만나면 교환한다.
        <code>l</code> 과 <code>r</code> 이 엇갈리면 분할이 끝나고, pivot 50을 경계 자리에 넣으면 <code>… 45 [50] 85 …</code> 처럼 50이 제자리에 확정된다. 아래 표에서 보라가 pivot, 분홍이 교환되는 두 값이다.
      </Prose>
      <InteractiveMemoryTable rows={quickPartitionRows(EX_DC)} />
    </Section>
    <Section title="Complexity — fast on average, careful at worst">
      <Prose>
        분할이 매번 <b>대체로 반반</b>으로 이뤄지면 깊이가 <code>log n</code> 단계뿐이고 각 단계가 <code>O(n)</code> 이라, 평균 <b>O(n log n)</b> 으로 매우 빠르다. 게다가 추가 메모리를 거의 안 쓰는 in-place sort고 상수가 작아서, 실전에서는 Merge Sort보다 빠른 경우가 많다.
      </Prose>
      <Prose>
        하지만 pivot을 잘못 고르면 위험하다. <b>매번 최솟값이나 최댓값이 pivot이 되면</b>(예: 이미 정렬된 데이터에서 맨 끝을 pivot으로 잡는 경우) 한쪽으로만 쪼개져 깊이가 <code>n</code> 이 되고 <b>O(n²)</b> 로 추락한다. 그래서 실전에서는 pivot을 무작위로 고르거나 세 값의 중앙값으로 고르는 트릭으로 이 최악을 피한다.
      </Prose>
    </Section>
    <PyCode
      code={`def quick_sort(arr, low, high):
    if low < high:
        p = partition(arr, low, high)
        quick_sort(arr, low, p - 1)      # pivot 왼쪽 무리
        quick_sort(arr, p + 1, high)     # pivot 오른쪽 무리

def partition(arr, low, high):
    pivot = arr[high]                    # 맨 끝을 pivot으로
    i = low - 1
    for j in range(low, high):
        if arr[j] < pivot:               # pivot보다 작으면 왼쪽으로 보낸다
            i += 1; arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]   # pivot을 제자리에
    return i + 1

# 위는 이해하기 쉬운 Lomuto 방식이고, 강의 그림은 양끝에서 좁혀오는 Hoare 방식이다(결과는 같다).`}
    />
    <ProsCons
      pros={["평균적으로 가장 빠른 비교 정렬 중 하나다", "추가 메모리가 적은 in-place sort다", "캐시 효율이 좋다"]}
      cons={["pivot을 잘못 고르면 최악 O(n²)이다", "unstable sort다", "재귀 깊이에 주의해야 한다"]}
    />
  </>
);

// ───────────────────────── Merge ─────────────────────────
const merge = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: true, inPlace: false })} />
    <Section title="How it works">
      <Prose>
        Merge Sort는 <b>Divide & Conquer</b>이라는 사고법의 교과서 같은 예시다. 큰 문제를 작은 문제로 쪼개고, 작은 답들을 합쳐 큰 답을 만든다. 세 단계로 정리된다.
      </Prose>
      <Bullets
        items={[
          <><b>분할(Divide)</b>: 배열을 절반으로 계속 쪼갠다. 원소가 1개가 될 때까지.</>,
          <><b>정복(Conquer)</b>: 원소가 1개인 조각은 더 쪼갤 것도 없이 그 자체로 정렬된 상태다.</>,
          <><b>병합(Merge)</b>: 정렬된 두 조각을 하나의 정렬된 배열로 합친다.</>,
        ]}
      />
      <Prose>
        이 정렬의 묘미는 마지막 <b>병합</b>에 있다. “이미 정렬된 두 배열을 합치는 일”은 의외로 쉽다. 두 배열의 <b>맨 앞 값만 비교</b>해서 더 작은 쪽을 꺼내는 걸 반복하면, 합쳐진 결과도 자동으로 정렬돼 있다.
      </Prose>
    </Section>
    <Section title={`Divide & merge — input [${EX_DC.join(", ")}]`}>
      <Prose>
        강의 그림은 <code>85 24 63 45 17 31 96 50</code> 이 절반씩 내려가 낱개로 쪼개지고(분할), 다시 정렬되며 올라와 <code>17 24 31 45 50 63 85 96</code> 이 되는 모습(병합)을 보여준다.
      </Prose>
      <SplitMerge arr={EX_DC} />
    </Section>
    <Section title="Complexity">
      <Prose>
        쪼개는 단계가 <code>log n</code> 겹이고 각 겹마다 병합 비용이 <code>O(n)</code> 이라, 전체는 항상 <b>O(n log n)</b> 이다. 특히 <b>입력이 어떻게 생겼든 최악의 경우에도 O(n log n)을 보장</b>한다는 게 큰 강점이다. Quick Sort와 달리 “운 나쁘면 느려지는” 일이 없다.
      </Prose>
      <Prose>
        대신 병합할 때 두 조각을 임시로 담아 둘 <b>추가 메모리 O(n)</b> 이 필요하다는 단점이 있다. 아래 강의 코드에서 <code>i + j</code> 가 “지금까지 결과에 채운 개수”라서, 이걸 그대로 결과의 인덱스로 쓰는 것이 깔끔하다.
      </Prose>
    </Section>
    <PyCode
      code={`def merge_sort(S):
    if len(S) < 2: return             # 원소 0~1개면 이미 정렬됨
    mid = len(S) // 2
    S1, S2 = S[:mid], S[mid:]
    merge_sort(S1); merge_sort(S2)    # 두 절반을 각각 재귀적으로 정렬
    merge(S1, S2, S)                  # 정렬된 둘을 하나로 병합

def merge(S1, S2, S):
    i = j = 0
    while i + j < len(S):             # i+j = 지금까지 채운 개수 = 쓸 위치
        if j == len(S2) or (i < len(S1) and S1[i] < S2[j]):
            S[i + j] = S1[i]; i += 1
        else:
            S[i + j] = S2[j]; j += 1`}
    />
    <ProsCons
      pros={["최악의 경우에도 O(n log n)을 보장한다", "stable sort다", "연결 리스트나 외부 정렬(대용량)에 잘 맞는다"]}
      cons={["병합용 추가 메모리 O(n)이 필요하다", "작은 데이터에는 오히려 오버헤드가 있다"]}
    />
  </>
);

// ───────────────────────── Heap ─────────────────────────
const heap = (): JSX.Element => {
  const built = heapInsert(EX_HEAP);
  return (
    <>
      <ComplexityCard c={cx({ best: "O(n log n)", avg: "O(n log n)", worst: "O(n log n)", space: "O(1)", stable: false, inPlace: true })} />
      <Section title="How it works">
        <Prose>
          Heap Sort는 <b>힙(heap)</b> 이라는 자료구조의 성질을 이용한다. 먼저 배열을 <b>complete binary tree</b> 로 바라보는 것이 핵심이다. 배열에서 인덱스 <code>i</code> 의 두 자식은 각각 <code>2i+1</code>, <code>2i+2</code> 자리에 있다고 약속하면, 배열 하나가 곧 트리가 된다.
        </Prose>
        <Prose>
          여기에 <b>“부모는 항상 자식보다 크거나 같다”</b> 는 규칙을 만족시키면 <b>최대 힙</b> 이 된다. 최대 힙에서는 <b>맨 앞(루트)이 늘 전체 최댓값</b> 이다. 그래서 정렬은 이렇게 진행된다. 루트(최댓값)를 맨 뒤 자리와 교환해 그 자리를 확정하고, 힙 크기를 하나 줄인 뒤 흐트러진 루트를 아래로 내려보내(<code>heapify</code>) 다시 최대 힙으로 정리한다. 이걸 반복하면 큰 값부터 뒤에서 채워져 오름차순이 된다.
        </Prose>
      </Section>
      <Section title={`Build the heap — input [${EX_HEAP.join(", ")}]`}>
        <Prose>
          아래에서 값을 하나씩 힙에 넣어 보자. 새 값은 맨 끝에 들어간 뒤 부모보다 크면 위로 올라가며(sift-up) 자리를 잡는다(분홍 = 방금 올라간 노드).
        </Prose>
        <InteractiveTreeInsert values={EX_HEAP} mode="heap" />
        <Prose>완성된 힙을 배열로 저장하면 이렇게 인덱스가 매겨진다. <code>i</code> 의 자식은 <code>2i+1</code>, <code>2i+2</code> 임을 직접 확인해 보자.</Prose>
        <HeapArrayMap a={built} />
      </Section>
      <Section title="Complexity">
        <Prose>
          최댓값을 빼낼 때마다 힙을 다시 정리하는 데 <code>O(log n)</code> 이 들고, 이를 <code>n</code> 번 반복하니 전체는 항상 <b>O(n log n)</b> 이다. Merge Sort처럼 최악에도 성능이 보장되면서, <b>추가 메모리는 O(1)</b> 인 in-place sort라는 장점이 있다. 같은 힙 구조가 우선순위 큐의 바탕이기도 하다. (강의 자료에는 Heap Sort가 목차에만 있고 그림이 없어, 표준 구현으로 보충했다.)
        </Prose>
      </Section>
      <PyCode
        code={`def heapify(a, n, i):                 # i를 루트로 하는 부분을 최대 힙으로 정리
    largest = i; l = 2*i + 1; r = 2*i + 2
    if l < n and a[l] > a[largest]: largest = l
    if r < n and a[r] > a[largest]: largest = r
    if largest != i:
        a[i], a[largest] = a[largest], a[i]
        heapify(a, n, largest)

def heap_sort(a):
    n = len(a)
    for i in range(n//2 - 1, -1, -1): heapify(a, n, i)   # 먼저 전체를 최대 힙으로
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0]                       # 최댓값(루트)을 맨 뒤로
        heapify(a, end, 0)                                # 줄어든 힙을 다시 정리
    return a`}
      />
      <ProsCons
        pros={["최악의 경우에도 O(n log n)이다", "추가 메모리 O(1)인 in-place sort다", "우선순위 큐의 기반 구조다"]}
        cons={["unstable sort다", "메모리 점프가 많아 캐시 효율이 Quick Sort보다 낮다"]}
      />
    </>
  );
};

// ───────────────────────── Radix ─────────────────────────
const radix = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ avg: "O(d·n)", worst: "O(d·n)", space: "O(n+k)", stable: true, inPlace: false })} />
    <Section title="How it works">
      <Prose>
        지금까지 본 정렬은 모두 “이게 더 크냐 작냐”를 <b>비교</b>하는 방식이었다. Radix Sort는 완전히 다르다. <b>값을 한 번도 비교하지 않는다.</b> 대신 숫자의 <b>자릿수</b> 를 보고 <b>0번부터 9번까지의 통(bucket)에 나눠 담았다가 순서대로 다시 꺼내는</b> 일을 반복한다.
      </Prose>
      <Prose>
        구체적으로는 <b>가장 낮은 자리(1의 자리)부터</b> 시작한다(이걸 LSD 방식이라 한다). 1의 자리 숫자로 0~9 통에 나눠 담고, 0번 통부터 순서대로 꺼내 다시 한 줄로 만든다. 그다음 10의 자리로 똑같이, 100의 자리로 똑같이… <b>가장 큰 수의 자릿수만큼</b> 반복하면 전체가 정렬된다.
      </Prose>
    </Section>
    <Section title={`Bucketing by digit — input [${EX_RADIX.join(", ")}]`}>
      <Prose>
        강의 예제 <code>321 269 201 707 195 400 892 563 699 499</code> 를 자리별로 담고 모으는 과정이다. 한 단계가 끝날 때마다 “모으기” 결과가 다음 단계의 입력이 되고, 100의 자리까지 끝나면 정렬이 완성된다.
      </Prose>
      {radixPasses(EX_RADIX).map((pass, i) => (
        <BucketGrid key={i} pass={pass} index={i} />
      ))}
    </Section>
    <Section title="Why it works — stability is key">
      <Prose>
        비밀은 <b>안정성</b> 에 있다. 같은 통에 들어간 값들은 <b>들어온 순서를 그대로 보존</b>해야 한다. 그래야 앞 단계(낮은 자리)에서 맞춰 놓은 순서가 다음 단계에서 깨지지 않는다. 이 “순서 보존” 덕분에 자리별로 따로따로 담았다 꺼내기만 했는데도 전체가 정확히 정렬된다.
      </Prose>
      <Prose>
        성능은 자릿수를 <code>d</code>, 통 개수를 <code>k</code> 라 할 때 <b>O(d·(n+k))</b> 이다. 자릿수 <code>d</code> 가 작은 정수라면 사실상 <b>O(n)</b> 으로, 비교 정렬의 <code>n log n</code> 한계를 넘어선다. 다만 <b>정수나 고정 길이 문자열처럼 “자릿수로 쪼갤 수 있는” 데이터</b> 에만 쓸 수 있다는 제약이 있다.
      </Prose>
    </Section>
    <PyCode
      code={`def radix_sort(arr):
    if not arr: return arr
    max_val = max(arr); exp = 1                  # 1, 10, 100 ... 자리
    while max_val // exp > 0:
        buckets = [[] for _ in range(10)]
        for num in arr:
            buckets[(num // exp) % 10].append(num)   # 현재 자리 숫자로 분배(순서 보존)
        arr = [x for b in buckets for x in b]        # 0번 통부터 순서대로 모으기
        exp *= 10
    return arr

print(radix_sort([321,269,201,707,195,400,892,563,699,499]))
# [195, 201, 269, 321, 400, 499, 563, 699, 707, 892]`}
    />
    <ProsCons
      pros={["비교 없이 O(d·n) — 정수에 매우 빠르다", "stable sort다"]}
      cons={["키가 정수·고정폭이어야 쓸 수 있다", "통을 위한 추가 메모리가 필요하다"]}
    />
  </>
);

// ───────────────────────── 개그성 ─────────────────────────
const stalin = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ avg: "O(n)", worst: "O(n)", space: "O(1)", stable: false, inPlace: true })} />
    <Section title="How it works (a joke)">
      <Prose>
        Stalin Sort는 농담으로 만들어진 정렬이다. 왼쪽부터 훑으며 <b>순서를 어기는 원소를 그냥 제거(숙청)해 버린다</b>. 직전까지 통과한 값보다 작은 값이 나오면 “넌 줄을 어겼어” 하고 없애는 식이다. ☭
      </Prose>
      <Prose>
        그러고 나면 남은 값들은 분명히 정렬돼 있다. <b>데이터를 잃는 대가로</b> 단 한 번만 훑어 <code>O(n)</code> 에 끝낸다는 게 이 농담의 핵심이다. “정렬이 안 되면, 안 되는 데이터를 없애면 된다”는 블랙 유머인 셈이다.
      </Prose>
    </Section>
    <Section title="Example">
      <Pseudo
        code={`입력:  3  6  1  9  4  8  2
유지:  3  6  ✗  9  ✗  ✗  ✗   (직전 통과값보다 작은 1, 4, 8, 2를 숙청)
결과:  3  6  9                  ← 남은 건 정렬됨`}
      />
    </Section>
    <Prose>이 시뮬레이터에서는 숙청된 칸을 0으로 표시해 “사라졌음”을 눈에 보이게 한다.</Prose>
  </>
);

const bogo = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ best: "O(n)", avg: "O(n·n!)", worst: "∞", space: "O(1)", stable: false, inPlace: true })} />
    <Section title="How it works (a joke)">
      <Prose>
        Bogo Sort는 세상에서 가장 비효율적인 정렬로 유명하다. 방법은 단순하다. <b>정렬됐는지 확인하고, 안 됐으면 전체를 무작위로 섞는다.</b> 그리고 또 확인하고, 또 섞는다. 정렬될 때까지. 🎲
      </Prose>
      <Prose>
        카드를 통째로 공중에 던졌다가 우연히 정렬된 채로 떨어지길 비는 것과 같다. 평균 <code>O(n·n!)</code> 이라, n이 10만 돼도 사실상 영원히 끝나지 않는다.
      </Prose>
    </Section>
    <Section title="Pseudocode">
      <Pseudo code={`while not is_sorted(a):
    shuffle(a)        # 그저 운에 맡긴다`} />
    </Section>
    <Prose>시뮬레이터는 폭주를 막기 위해 셔플 횟수를 제한한다(그래서 작은 배열만 다룬다). 운이 없으면 “포기”한다.</Prose>
  </>
);

const sleep = (): JSX.Element => (
  <>
    <ComplexityCard c={cx({ avg: "O(n) (개념상)", worst: "O(n + max)", space: "O(n)", stable: false, inPlace: false })} />
    <Section title="How it works (a joke)">
      <Prose>
        Sleep Sort는 기발한 발상의 농담이다. 각 값마다 <b>“그 값에 비례하는 시간만큼 잠들었다가 깨어나 자기 자신을 결과에 적는”</b> 작업을 동시에 띄운다. ⏰
      </Prose>
      <Prose>
        작은 값일수록 짧게 자고 먼저 깨어나니, <b>깨어나는 순서가 곧 정렬 순서</b>가 된다. 비교를 전혀 하지 않는다는 점은 기발하지만, 실제로는 타이머 정밀도와 값의 범위에 휘둘려 전혀 믿을 수 없다.
      </Prose>
    </Section>
    <Section title="Example">
      <Pseudo
        code={`값 5, 2, 8, 1 →  1ms후[1]  2ms후[2]  5ms후[5]  8ms후[8]
깨어난 순서:  1  2  5  8   ← 정렬 완료`}
      />
    </Section>
    <Prose>시뮬레이터는 실제 타이머 대신 깨어나는 순서만 보여준다.</Prose>
  </>
);

// 전체 정리 — 한눈에 보는 복잡도 비교 표 (강의 마지막 슬라이드)
const SUMMARY: [string, string, string, string][] = [
  ["Binary tree sort", "O(n log n)", "O(n²)", "BST + in-order 순회, 사향트리면 느려짐"],
  ["Bubble sort", "O(n²)", "O(n²)", "가장 단순, 인접 교환"],
  ["Insertion sort", "O(n²)", "O(n²)", "거의 정렬된 데이터엔 O(n), 실전 활용"],
  ["Selection sort", "O(n²)", "O(n²)", "교환 횟수 최소 (≤ n번)"],
  ["Shell sort", "O(n^1.25)", "간격에 따라", "insertion sort 강화판"],
  ["Merge sort", "O(n log n)", "O(n log n)", "항상 안정적, 추가 메모리 O(n)"],
  ["Quick sort", "O(n log n)", "O(n²)", "평균 매우 빠름, in-place sort"],
  ["Heap sort", "O(n log n)", "O(n log n)", "힙 이용 (자료엔 그림 없음)"],
  ["Radix sort", "O(d(n+k))", "O(d(n+k))", "비교 안 함, 정수/고정길이 전용"],
  ["Python 내장", "O(n log n)", "O(n log n)", "Timsort, 실무 기본"],
];

// ── 모든 페이지 하단 공통: 강의 이론(슬라이드 2~4, 13~15, 전체 정리) ──
export function TheoryNotes(): JSX.Element {
  return (
    <Accordion>
      <Accordion.Item>
        <Accordion.Header>① 정렬이란 & 이 강의의 큰 그림</Accordion.Header>
        <Accordion.Panel>
          <Prose>
            <b>정렬</b>이란 데이터를 일정한 순서(보통 오름차순/내림차순)대로 다시 늘어놓는 일이다. 단순해 보여도 컴퓨터 과학에서 가장 깊이 연구된 문제 중 하나인데, 빠른 검색(이진 탐색)을 하려면 먼저 정렬돼 있어야 하고, 정렬을 분석하는 과정에서 <b>Divide & Conquer·복잡도 분석</b> 같은 핵심 사고법을 배우기 때문이다.
          </Prose>
          <Prose>
            이 강의는 정렬들을 <b>속도(시간 복잡도)라는 한 축</b>으로 줄 세운다. 먼저 이론적 하한을 깔고, 느린 <b>O(n²) 무리</b>(Binary tree·Bubble·Insertion·Selection)를 보여준 뒤, 점점 빨라지는 <b>Shell → Merge → Quick</b> 으로 올라가고, 비교조차 안 하는 <b>Radix</b> 를 지나, 마지막엔 “실무에선 그냥 파이썬 내장 정렬을 써라”로 마무리한다.
          </Prose>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item>
        <Accordion.Header>② 왜 복잡도가 중요한가 — 0.8초 vs 11.4시간</Accordion.Header>
        <Accordion.Panel>
          <Prose>
            강의는 정렬의 일의 양을 <b>비교 횟수(Sort Effort, SE)</b> 로 잰다. 그리고 비교 기반 정렬은 아무리 잘 만들어도 <b>SE 의 하한이 O(n log₂ n)</b> 임을 짚는다. 직관은 이렇다. n개를 줄 세우는 경우의 수는 <code>n!</code> 가지인데, 비교 한 번은 가능성을 절반으로 가르므로, <code>n!</code> 가지를 구분하려면 최소 <code>log₂(n!) ≈ n log₂ n</code> 번은 물어봐야 한다. 그래서 머지·Heap Sort를 “최적”이라 부른다.
          </Prose>
          <Prose>
            이게 왜 중요한지는 숫자로 보면 충격적이다. 100만 개를 한 번 비교에 1나노초로 정렬한다면, <b>O(n log n) 은 약 0.8초</b>, <b>O(n²) 은 약 11.4시간</b> 이다. 약 5만 배 차이다. 복잡도가 <code>n²</code> 이냐 <code>n log n</code> 이냐는 책상물림 이야기가 아니라, <b>“일이 끝나느냐 마느냐”</b> 를 가르는 문제인 것이다.
          </Prose>
          <Pseudo
            code={`# 강의가 던지는 질문: 비교만이 아니라 메모리 접근 비용도 생각하라
for i in range(1, n+1):
    for j in range(1, n+1):
        if item[j] > item[i]:                      # (a) 비교 → n²번
            item[i], item[j] = item[j], item[i]    # (b) swap
# 이 이중 루프의 메모리 접근 횟수 ≈ 3/2 · n² + 2n`}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item>
        <Accordion.Header>③ Python 내장 정렬 — sort() vs sorted()</Accordion.Header>
        <Accordion.Panel>
          <Prose>
            <code>list.sort()</code> 는 <b>원본 리스트를 제자리에서 정렬하고 None을 반환</b>한다. 그래서 <code>new = colors.sort()</code> 라고 쓰면 <code>new</code> 가 None이 되는 흔한 버그가 생긴다. 반면 <code>sorted()</code> 는 <b>원본을 그대로 두고 정렬된 새 리스트를 반환</b>한다. 원본을 보존해야 할 땐 이쪽을 쓴다.
          </Prose>
          <Prose>
            둘 다 <code>key</code> 로 비교 기준을, <code>reverse=True</code> 로 내림차순을 정할 수 있다. 파이썬의 정렬은 <b>Timsort</b>(머지 + Insertion Sort의 하이브리드)라서 O(n log n)이 보장되고 고도로 최적화돼 있다.
          </Prose>
          <Pseudo
            code={`colors = ['red', 'green', 'blue', 'yellow']
print(colors.sort())     # None        ← 반환값이 None이다!
print(colors)            # ['blue', 'green', 'red', 'yellow']  ← 원본이 바뀜

print(sorted(colors))    # 정렬된 새 리스트를 반환
print(colors)            # 원본은 그대로

colors.sort(key=len, reverse=True)   # 길이 기준 내림차순
# ['yellow', 'green', 'blue', 'red']`}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item>
        <Accordion.Header>④ 사용자 정의 객체 정렬 — __lt__ / key</Accordion.Header>
        <Accordion.Panel>
          <Prose>
            숫자나 문자열이 아니라 내가 만든 클래스의 객체를 정렬하려면, 파이썬에게 <b>두 객체를 어떻게 비교할지 알려줘야</b> 한다. 그 방법이 <code>__lt__</code>(less than) 메서드를 정의하는 것이다. “a가 b보다 작다”의 규칙을 여기에 적어 두면 <code>sort()</code> 가 그 규칙으로 비교한다.
          </Prose>
          <Prose>
            또는 그때그때 <code>key=lambda x: x.num</code> 처럼 기준만 넘겨 줘도 된다. 참고로 <code>__str__</code> 은 출력용이라 정렬과는 무관하고, 리스트를 통째로 print하면 <code>__repr__</code> 이 쓰여 객체 주소가 찍힌다.
          </Prose>
          <Pseudo
            code={`class Members:
    def __init__(self, n, s):
        self.num, self.name = n, s
    def __str__(self):
        return f'[{self.num}] {self.name}'
    def __lt__(self, other):          # a < b 를 정의
        return self.name < other.name # 이름(알파벳) 기준

list1.sort()                          # __lt__ → 이름 알파벳 순
list1.sort(key=lambda x: x.num, reverse=True)   # 번호 기준 내림차순`}
          />
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item>
        <Accordion.Header>⑤ 한눈에 보는 복잡도 비교 표</Accordion.Header>
        <Accordion.Panel>
          <div className="cxtable-wrap">
            <table className="cxtable">
              <thead>
                <tr>
                  <th>알고리즘</th>
                  <th>평균</th>
                  <th>최악</th>
                  <th>특징</th>
                </tr>
              </thead>
              <tbody>
                {SUMMARY.map(([name, avg, worst, note]) => (
                  <tr key={name}>
                    <td className="cxtable__name">{name}</td>
                    <td className="cxtable__n">{avg}</td>
                    <td className="cxtable__n">{worst}</td>
                    <td>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Prose>
            가장 중요한 한 가지만 기억하자. 복잡도 차이는 책상물림 이야기가 아니라 “일이 끝나느냐 마느냐”(0.8초 vs 11.4시간)를 가른다. 그래서 느린 O(n²) 무리에서 빠른 O(n log n) 무리로 올라가는 것이 이 강의의 골자다.
          </Prose>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

export const TUTORIALS: Record<string, Tutorial> = {
  bubble: { title: "Bubble Sort", render: bubble },
  insertion: { title: "Insertion Sort", render: insertion },
  selection: { title: "Selection Sort", render: selection },
  binary_tree: { title: "Binary Tree Sort", render: binaryTree },
  shell: { title: "Shell Sort", render: shell },
  quick: { title: "Quick Sort", render: quick },
  merge: { title: "Merge Sort", render: merge },
  heap: { title: "Heap Sort", render: heap },
  radix: { title: "Radix Sort", render: radix },
  stalin: { title: "Stalin Sort ☭", render: stalin },
  bogo: { title: "Bogo Sort 🎲", render: bogo },
  sleep: { title: "Sleep Sort ⏰", render: sleep },
};
