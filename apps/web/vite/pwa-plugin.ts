import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/** Strict CSP, delivered by <meta> because GitHub Pages cannot set headers (ADR-0012).
 *  `wasm-unsafe-eval` is only for the Argon2id WebAssembly module; it does not allow eval(). */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/** Build-only: CSP meta, service worker with precache list, 404.html SPA fallback. */
export function veillePwa(): Plugin {
  return {
    name: "veille-pwa",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const meta = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`;
        return html.replace("<head>", `<head>\n    ${meta}`);
      },
    },
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const files = Object.keys(bundle);
        const staticFiles = [
          "manifest.webmanifest",
          "icons/icon.svg",
          "icons/icon-192.png",
          "icons/icon-512.png",
          "icons/icon-maskable-512.png",
        ];
        const precache = [
          ...new Set([...files.filter((f) => f !== "sw.js"), ...staticFiles]),
        ].sort();
        const hash = createHash("sha256");
        for (const name of files) {
          const item = bundle[name];
          if (item)
            hash
              .update(name)
              .update(item.type === "chunk" ? item.code : (item.source as string | Uint8Array));
        }
        const version = hash.digest("hex").slice(0, 12);
        const template = readFileSync(
          resolve(dirname(fileURLToPath(import.meta.url)), "../sw/sw.js"),
          "utf8",
        );
        const source = template
          .replace("__VERSION__", version)
          .replace("__PRECACHE__", JSON.stringify(precache))
          .replace("__SHELL__", "index.html");
        this.emitFile({ type: "asset", fileName: "sw.js", source });
        const index = bundle["index.html"];
        if (index?.type !== "asset") throw new Error("index.html missing from bundle");
        // GitHub Pages cannot rewrite URLs: a deep link falls back to the same shell.
        this.emitFile({ type: "asset", fileName: "404.html", source: index.source });
      },
    },
  };
}
