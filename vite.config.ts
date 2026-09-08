import path from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/frontend/routes",
      generatedRouteTree: "./src/frontend/routeTree.gen.ts",
      quoteStyle: "double",
    }),
    react(),
    cloudflare(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src/frontend"),
      "@backend": path.resolve(import.meta.dirname, "./src/backend"),
      "@frontend": path.resolve(import.meta.dirname, "./src/frontend"),
      "@shared": path.resolve(import.meta.dirname, "./src/shared"),
    },
  },
  build: {
    outDir: "dist/client",
  },
});
