@echo off
REM Windows 데스크탑 빌드 -> dist\SortSimulation.exe
REM 사용:  deploy\build_windows.bat   (프로젝트 루트에서 실행 권장)
setlocal enabledelayedexpansion

REM 프로젝트 루트 = 이 배치 파일의 부모 폴더
set "ROOT=%~dp0.."
pushd "%ROOT%"

echo [1/4] 프론트엔드 빌드 (Pyodide 용 py 동기화 포함)
pushd frontend
call npm install || goto :error
call npm run build || goto :error
popd

echo [2/4] Python 가상환경 준비
if not exist "backend\.venv\Scripts\python.exe" (
  python -m venv backend\.venv || goto :error
)
set "VENV_PY=backend\.venv\Scripts\python.exe"
"%VENV_PY%" -m pip install --upgrade pip
"%VENV_PY%" -m pip install -r backend\requirements.txt pyinstaller || goto :error

echo [3/4] PyInstaller 패키징
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
"%VENV_PY%" -m PyInstaller --clean --noconfirm deploy\SortSimulation.spec || goto :error

echo [4/4] 완료
echo   -^> %ROOT%\dist\SortSimulation.exe
popd
exit /b 0

:error
echo 빌드 실패. 위 로그를 확인하세요.
popd
exit /b 1
