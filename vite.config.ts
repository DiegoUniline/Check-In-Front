// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  /**
   * Qué hace:
   * - Define la base pública de la app.
   * Por qué:
   * - En GitHub Pages el sitio vive bajo `/Check-In-Front/`.
   * - En desarrollo local necesitamos `/` para que las rutas funcionen sin prefijos raros.
   * Relacionado con:
   * - `Check-In-Front/src/App.tsx` (usa `import.meta.env.BASE_URL` para el basename del Router)
   */
  base: mode === "development" ? "/" : "/Check-In-Front/",
  server: {
    host: "::",
    /**
     * Qué hace:
     * - Puerto del dev server.
     * Por qué:
     * - El backend (`check-in-back/src/index.js`) ya permite CORS desde `http://localhost:5173`.
     */
    port: 5173,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
}));
