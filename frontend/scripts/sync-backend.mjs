// 백엔드 정렬 패키지(backend/sorts/*.py)를 웹 빌드에 실어 보내기 위해
// frontend/public/py/sorts/ 로 복사한다. predev / prebuild 에서 자동 실행된다.
//
// 이렇게 하면 데스크탑(pywebview)과 웹(Pyodide)이 "똑같은 .py 한 벌"을 쓴다.
// 웹에서는 이 파일들을 fetch 해 Pyodide 가상 파일시스템에 올려 그대로 실행한다.

import { mkdir, copyFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "..", "backend", "sorts"); // 단일 진실 공급원
const outDir = join(here, "..", "public", "py", "sorts");

if (!existsSync(srcDir)) {
  console.error(`[sync-backend] backend/sorts 를 찾을 수 없습니다: ${srcDir}`);
  process.exit(1);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const files = (await readdir(srcDir)).filter((f) => f.endsWith(".py"));
for (const f of files) {
  await copyFile(join(srcDir, f), join(outDir, f));
}

console.log(`[sync-backend] ${files.length}개 .py → public/py/sorts/ (${files.join(", ")})`);
