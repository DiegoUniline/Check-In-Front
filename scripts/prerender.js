// Static Site Generation para VULO.
// Ejecutar después de:
//   vite build
//   vite build --ssr src/entry-server.tsx --outDir dist/server
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const templatePath = path.join(distDir, "index.html");
const serverEntryPath = path.join(distDir, "server", "entry-server.js");

// Rutas reales de vulo.mx a pre-renderizar.
const ROUTES = ["/", "/funciones", "/precios", "/empresa", "/contacto"];

// Polyfills mínimos para permitir que el bundle SSR se cargue sin explotar
// (Supabase client, ThemeContext, etc. referencian localStorage/window).
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};
if (typeof globalThis.localStorage === "undefined") globalThis.localStorage = noopStorage;
if (typeof globalThis.sessionStorage === "undefined") globalThis.sessionStorage = noopStorage;
if (typeof globalThis.window === "undefined") {
  globalThis.window = {
    localStorage: noopStorage,
    sessionStorage: noopStorage,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    addEventListener() {},
    removeEventListener() {},
    location: { origin: "https://vulo.mx", href: "https://vulo.mx/", pathname: "/" },
    document: { documentElement: { classList: { add() {}, remove() {} } } },
  };
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = { documentElement: { classList: { add() {}, remove() {} } } };
}

async function main() {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`No se encontró ${templatePath}. Corre "vite build" primero.`);
  }
  if (!fs.existsSync(serverEntryPath)) {
    throw new Error(`No se encontró ${serverEntryPath}. Corre "vite build --ssr" primero.`);
  }

  const template = fs.readFileSync(templatePath, "utf-8");
  const { render } = await import(url.pathToFileURL(serverEntryPath).href);

  let ok = 0;
  let fail = 0;

  for (const route of ROUTES) {
    try {
      console.log(`[prerender] → ${route}`);
      const { html, head } = render(route);

      let out = template.replace(
        '<div id="root"></div>',
        `<div id="root">${html}</div>`
      );
      if (head) {
        out = out.replace("</head>", `${head}\n</head>`);
      }

      // Asegura clase is-visible pre-aplicada en cualquier elemento con opacity:0
      // para evitar parpadeos previos a la hidratación.
      out = out.replace(/opacity:\s*0(?!\.[1-9])/g, "opacity:1");

      const outPath =
        route === "/"
          ? path.join(distDir, "index.html")
          : path.join(distDir, route.replace(/^\//, ""), "index.html");

      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, out, "utf-8");
      console.log(`[prerender] ✓ ${route} → ${path.relative(root, outPath)}`);
      ok++;
    } catch (err) {
      fail++;
      console.error(`[prerender] ✗ ${route}`);
      console.error(err && err.stack ? err.stack : err);
    }
  }

  console.log(`\n[prerender] Listas: ${ok} · Fallidas: ${fail}`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[prerender] Error fatal:");
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});