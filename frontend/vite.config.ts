import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" → built asset 경로를 상대경로로. pywebview가 dist/index.html을
// file:// 로 직접 로드할 때 깨지지 않게 한다.
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
