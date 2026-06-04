# Sort Simulation — DS Lecture 18

KSA 자료구조(DS) Lecture 18 *Sorting* 의 정렬 알고리즘을 시각화하는 데스크톱 앱.

- **백엔드**: Python — 강의 자료 기반 정렬 알고리즘이 매 단계(비교/교환/덮어쓰기)를
  `frame` 으로 기록한다.
- **프론트엔드**: React + [`@studio-baeks/funky-ui`](https://funky-ui.bsiku.dev)
  (neo-brutalist 디자인 시스템) — frame 을 막대 애니메이션으로 재생한다.
- **셸**: [pywebview](https://pywebview.flowrl.com) — Python 이 호스트 프로세스가 되어
  네이티브 창을 띄우고, JS 는 `window.pywebview.api` 로 정렬 함수를 **HTTP 없이 직접 호출**한다.
  네비게이션 없는 단일 화면.

## 구조

```
SortSimulation/
├─ backend/
│  ├─ app.py              # pywebview 진입점 + Api(브릿지) 클래스
│  └─ sorts/
│     ├─ tracer.py        # 단계별 frame 기록기
│     ├─ algorithms.py    # 강의 기반 정렬 12종
│     └─ registry.py      # 메타데이터 + run(algo, array)
├─ frontend/
│  └─ src/
│     ├─ App.tsx          # 단일 화면 + 재생 로직
│     ├─ components/      # AlgoModal, BarCanvas
│     ├─ lib/             # bridge(window.pywebview.api), types
│     └─ styles/app.css   # funky 토큰 기반 스타일
└─ run.sh
```

## 다루는 알고리즘

| 분류 | 알고리즘 |
|------|----------|
| O(N²) 기본 | Bubble · Insertion · Selection · Binary Tree |
| 개선된 | Shell · Quick · Merge · Heap |
| 분배 | Radix (LSD) |
| 개그성 | Stalin ☭ · Bogo 🎲 · Sleep ⏰ |

> Heap 은 강의 목차엔 있으나 본문 슬라이드가 없어 표준 배열 힙정렬로 구현했다.

## 실행

사전 설치(최초 1회):

```bash
# 백엔드
cd backend && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
# 프론트엔드
cd ../frontend && npm install --legacy-peer-deps
```

실행:

```bash
./run.sh          # 빌드된 화면을 pywebview 창으로 (배포 모드)
./run.sh dev      # Vite dev server + HMR (개발 모드)
./run.sh build    # 프론트엔드만 빌드
```

## 사용법

1. **알고리즘** 버튼 → 모달에서 정렬 알고리즘 선택
2. **케이스 수** 입력 후 **🎲 RANDOM** 으로 배열 생성
3. 가운데 **▶ START** → 정렬 과정이 막대 애니메이션으로 재생
4. 하단 트랜스포트(처음/이전/재생·일시정지/다음)와 속도(0.5×~4×)로 제어
5. 우상단 **학습** → 알고리즘별 튜터 페이지(메모리 변화 표 · BST/힙 트리 · 머지 분할 · 라딕스 버킷 · 의사코드 · 장단점). 오버레이 안에서 ◀ ▶ 로 알고리즘 넘김.

막대 색: 파랑=대기, 노랑=비교, 분홍=교환, 주황=덮어쓰기, 보라=pivot/gap, 초록=정렬 확정.

## 실행파일 패키징 (선택)

```bash
cd frontend && npm run build
cd ../backend && ./.venv/bin/pip install pyinstaller
./.venv/bin/pyinstaller --windowed --name SortSimulation \
  --add-data "../frontend/dist:frontend/dist" app.py
```
> 패키징 시 `app.py` 의 dist 경로 탐색을 PyInstaller 번들 기준으로 조정해야 한다.
