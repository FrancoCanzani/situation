import path from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), cloudflare(), tailwindcss()],
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
