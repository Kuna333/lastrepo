import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Allow setting a base path for GitHub Pages or sub-path hosting:
//   VITE_BASE=/my-repo-name/  npm run build
// Defaults to "/" for normal hosting (Vercel, Netlify, Firebase Hosting, etc.)
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
});
