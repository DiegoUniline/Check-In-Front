// vite.config.ts - Para dominio custom usa:

export default defineConfig(({ mode }) => ({
  base: '/',  // <- DOMINIO CUSTOM = '/'
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
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
}));
