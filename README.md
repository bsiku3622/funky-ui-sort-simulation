# Sort Simulation — DS Lecture 18

KSA 자료구조(DS) Lecture 18 *Sorting* 의 정렬 알고리즘을 시각화하는 데스크톱 앱.

- **백엔드**: Python — 강의 자료 기반 정렬 알고리즘이 매 단계(비교/교환/덮어쓰기)를
  `frame` 으로 기록한다.
- **프론트엔드**: React + [`@studio-baeks/funky-ui`](https://funky-ui.bsiku.dev)
  (neo-brutalist 디자인 시스템) — frame 을 막대 애니메이션으로 재생한다.
- **셸**: [pywebview](https://pywebview.flowrl.com) — Python 이 호스트 프로세스가 되어
  네이티브 창을 띄우고, JS 는 `window.pywebview.api` 로 정렬 함수를 **HTTP 없이 직접 호출**한다.
  네비게이션 없는 단일 화면.
- **웹 모드**: Python 백엔드가 없는 브라우저(Vercel 배포)에선
  [Pyodide](https://pyodide.org)(파이썬 WASM)가 **똑같은 `backend/sorts/*.py`** 를
  브라우저 안에서 그대로 실행한다. 데스크탑과 웹이 분기 없이 단일 정렬 코드를 공유한다.

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
│  ├─ scripts/sync-backend.mjs  # 빌드 시 backend/sorts/*.py → public/py (웹 엔진용)
│  └─ src/
│     ├─ App.tsx          # 단일 화면 + 재생 로직
│     ├─ components/      # AlgoModal, BarCanvas
│     ├─ lib/
│     │  ├─ bridge.ts        # 데스크탑=pywebview / 웹=Pyodide 라우팅
│     │  └─ pyodideEngine.ts # 브라우저에서 sorts/*.py 실행
│     └─ styles/app.css   # funky 토큰 기반 스타일
├─ deploy/                # PyInstaller spec + mac/win 빌드 스크립트
├─ vercel.json            # 웹 배포 설정
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
4. 하단 트랜스포트(처음/이전/재생·일시정지/다음)와 속도(0.5×~100×)로 제어. 우상단 **소리** 토글 시 막대 값에 따라 음정(높은 값=높은 음)
5. 우상단 **학습** → 알고리즘별 튜터 페이지(메모리 변화 표 · BST/힙 트리 · 머지 분할 · 라딕스 버킷 · 의사코드 · 장단점). 오버레이 안에서 ◀ ▶ 로 알고리즘 넘김.

막대 색: 파랑=대기, 노랑=비교, 분홍=교환, 주황=덮어쓰기, 보라=pivot/gap, 초록=정렬 확정.

## 배포

세 가지 타깃을 지원한다. 어느 쪽이든 정렬 코드는 `backend/sorts/*.py` 한 벌이다.

### 웹 (Vercel)

브라우저에선 Pyodide 가 같은 Python 정렬 코드를 실행한다. 별도 서버 없이 정적 배포.

- Vercel 프로젝트로 이 저장소를 연결하면 끝(루트의 `vercel.json` 이 빌드·출력 경로를 지정).
  - Build Command: `cd frontend && npm install && npm run build`
  - Output Directory: `frontend/dist`
- 로컬 확인:
  ```bash
  cd frontend && npm run build && npm run preview
  ```
- Pyodide 런타임은 jsdelivr CDN 에서 로드된다(첫 진입 시 ~수 초 로딩 오버레이).

### Windows (.exe)

```bat
deploy\build_windows.bat
```
→ `dist\SortSimulation.exe` (단일 실행파일). WebView2 런타임이 필요한데 Windows 10/11 엔
   Edge 와 함께 기본 설치돼 있다.

### macOS (.app)

```bash
./deploy/build_macos.sh
```
→ `dist/SortSimulation.app`. 실행: `open dist/SortSimulation.app`.
   서명 안 된 앱이라 첫 실행은 우클릭 → 열기(또는 시스템 설정 → 보안) 한 번 필요.

### 두 OS 한 번에 (GitHub Actions)

PyInstaller 는 크로스 컴파일이 안 돼 각 OS 에서 따로 빌드해야 한다.
`.github/workflows/desktop.yml` 이 `v*` 태그 push 나 수동 실행(workflow_dispatch) 시
macOS·Windows 러너에서 각각 빌드해 아티팩트(.app/.exe)로 올린다 — 두 기기를 직접
갖추지 않아도 양쪽 바이너리를 받을 수 있다.
