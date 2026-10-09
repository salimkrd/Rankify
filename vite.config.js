import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(() => {
  // Determine base path:
  // 1. Explicit VITE_BASE_PATH if provided
  // 2. /Rankify/ for GitHub Pages or GitHub Actions (unless on Vercel)
  // 3. / default (for Vercel, local development, custom domains)
  const isGitHubPages =
    process.env.GITHUB_PAGES === "true" ||
    (process.env.GITHUB_ACTIONS === "true" && !process.env.VERCEL);

  const basePath = process.env.VITE_BASE_PATH || (isGitHubPages ? "/Rankify/" : "/");

  return {
    plugins: [react()],
    base: basePath,
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
    },
  };
});
