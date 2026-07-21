import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type FilledContext } from "react-helmet-async";
import App from "./App";
import "./index.css";

// react-helmet-async: forzar modo servidor (no tocar window/document).
// @ts-expect-error propiedad estática privada expuesta por la lib
HelmetProvider.canUseDOM = false;

export function render(url: string) {
  const helmetContext: Partial<FilledContext> = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>
  );
  const helmet = (helmetContext as FilledContext).helmet;
  const head = helmet
    ? [
        helmet.title?.toString() ?? "",
        helmet.meta?.toString() ?? "",
        helmet.link?.toString() ?? "",
        helmet.script?.toString() ?? "",
      ].join("\n")
    : "";
  return { html, head };
}