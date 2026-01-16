import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Nombre de tu repositorio en GitHub
  base: '/Check-In-Front/', 
  
  server: {
    host: "::",
    port: 8080,
  },
  
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      // Esto asegura que las importaciones con "@" funcionen siempre
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // Esto ayuda a que los archivos generados se organicen mejor
    outDir: "dist",
    assetsDir: "assets",
    // Evita problemas de carga si se limpia la caché
    emptyOutDir: true,
  }
}));
