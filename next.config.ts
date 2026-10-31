import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads pdf.js with a worker file; bundling breaks that path, so load them from node_modules.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  // Keep each server function small. Prisma's runtime folder ships WebAssembly engines for every
  // database and edge runtime; we run the native Postgres engine on Node, so those are dead weight
  // (~60 MB copied into each of ~60 functions).
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@prisma/client/runtime/*.wasm-base64.*",
      "node_modules/@prisma/client/runtime/query_engine_bg.*",
      "node_modules/@prisma/client/runtime/query_compiler_bg.*",
      "node_modules/@prisma/client/runtime/edge*",
      "node_modules/@prisma/client/runtime/wasm*",
      "node_modules/@prisma/client/runtime/react-native*",
      "node_modules/@prisma/client/runtime/index-browser*",
      "node_modules/.prisma/client/query_engine_bg.*",
      "node_modules/.prisma/client/wasm*",
      "node_modules/.prisma/client/edge.js",
      "node_modules/.prisma/client/*.d.ts",
      "node_modules/.prisma/client/*.tmp*",
      "node_modules/prisma/**",
      "node_modules/@prisma/engines/**",
      "node_modules/typescript/**",
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
