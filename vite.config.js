// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import * as path from "node:path";
import viteTsconfigPaths from "vite-tsconfig-paths";

/**
 * ✅ 선택: Langfuse 백엔드가 BASE_PATH(예: "/langfuse")를 쓰는 경우만 값 지정
 *    - docker/env에서 LANGFUSE_BASE_PATH="/mybase" 식으로 넣거나
 *    - 아래 상수에 직접 문자열로 적어도 됨.
 *    - 빈 문자열("")이면 리라이트를 하지 않음.
 */
const BASE_PATH = process.env.LANGFUSE_BASE_PATH || ""; // 예: "/mybase" | 기본: ""

export default defineConfig({
  base: "/",
  server: {
    host: "0.0.0.0",
    // port: 5173, // 필요 시 해제
    proxy: {
      /**
       * ✅ Next.js API (next-auth 포함) → 3000 프록시
       * - credentials: "include"로 세션 쿠키가 오가도록
       * - cookieDomainRewrite/cookiePathRewrite 추가: 포트/베이스패스 차이로 인한 쿠키 미부착 방지
       * - BASE_PATH 사용하는 경우에만 rewrite 활성화
       */
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        // 🆕 Set-Cookie의 Domain을 로컬호스트로 재작성 (다른 도메인/포트와 충돌 방지)
        cookieDomainRewrite: { "*": "localhost" }, // [ADDED]
        // 🆕 BASE_PATH 환경에서 Path가 '/mybase'로 내려와도 루트에서 쿠키 먹게끔
        cookiePathRewrite: { "*": "/" }, // [ADDED]
        // 🆕 Langfuse가 BASE_PATH를 쓸 때만 API 경로 리라이트
        rewrite: BASE_PATH
          ? (path) => path.replace(/^\/api(\/.*)?$/, `${BASE_PATH}/api$1`) // [ADDED - 조건부]
          : undefined,
        // 🆕 스트리밍/롱폴링 대비 타임아웃 여유
        timeout: 600000, // 10m  [ADDED]
        proxyTimeout: 600000, // 10m  [ADDED]
      },

      /**
       * ✅ tRPC 라우트 → 3000 프록시
       * - 지금은 /api/trpc/*로 부르지만, 혹시 /trpc/*로 바뀌어도 대비 가능
       */
      "/api/trpc": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: { "*": "localhost" }, // [ADDED]
        cookiePathRewrite: { "*": "/" }, // [ADDED]
        rewrite: BASE_PATH
          ? (path) => path.replace(/^\/api\/trpc(\/.*)?$/, `${BASE_PATH}/api/trpc$1`) // [ADDED - 조건부]
          : undefined,
        // tRPC WebSocket을 쓸 경우 대비 (지금은 fetch라 필요 없지만 무해)
        ws: true, // [ADDED]
        timeout: 600000, // [ADDED]
        proxyTimeout: 600000, // [ADDED]
      },

      /**
       * (선택) /trpc 도입 시를 대비한 별칭
       * - 현재는 /api/trpc 를 쓰므로 없어도 됨.
       */
      "/trpc": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: { "*": "localhost" }, // [ADDED]
        cookiePathRewrite: { "*": "/" }, // [ADDED]
        rewrite: BASE_PATH
          ? (path) => path.replace(/^\/trpc(\/.*)?$/, `${BASE_PATH}/trpc$1`) // [ADDED - 조건부]
          : undefined,
        ws: true, // [ADDED]
        timeout: 600000, // [ADDED]
        proxyTimeout: 600000, // [ADDED]
      },

      /**
       * (옵션) /auth 별도 프록시가 필요하면 유지
       * - next-auth는 보통 /api/auth/* 이라서 /api 프록시에 이미 포함됨.
       * - 혼동 방지하려면 제거해도 무관.
       */
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: { "*": "localhost" }, // [ADDED]
        cookiePathRewrite: { "*": "/" }, // [ADDED]
        rewrite: BASE_PATH
          ? (path) => path.replace(/^\/auth(\/.*)?$/, `${BASE_PATH}/auth$1`) // [ADDED - 조건부]
          : undefined,
      },
    },
  },
  plugins: [react(), viteTsconfigPaths()],
  resolve: {
    alias: {
      Components: path.resolve(process.cwd(), "./src/Components"),
      Library: path.resolve(process.cwd(), "./src/Library"),
      Pages: path.resolve(process.cwd(), "./src/Pages"),
      Communicator: path.resolve(process.cwd(), "./src/Communicator"),
    },
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  optimizeDeps: {
    // exclude: [],
  },
});
