import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// react-helmet-async: forzar modo servidor (no tocar window/document).
(HelmetProvider as unknown as { canUseDOM: boolean }).canUseDOM = false;

export function render(url: string) {
  const helmetContext: Record<string, unknown> = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext as never}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>
  );
  const helmet = (helmetContext as { helmet?: {
    title?: { toString(): string };
    meta?: { toString(): string };
    link?: { toString(): string };
    script?: { toString(): string };
  } }).helmet;
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