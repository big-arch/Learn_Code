import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "pages" ? "/Learn_Code/" : "/",
  cacheDir: '.cache/vite',
  server: { proxy: { '/api': process.env.API_TARGET || 'http://127.0.0.1:4174' } },
  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/].*three/ }] } } } },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
}));
