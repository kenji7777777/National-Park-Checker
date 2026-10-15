// Builds index.html from src/: bundles src/main.jsx and its modules (JSX -> plain JS) and
// inlines React, so the published page needs no CDN and no in-browser Babel.
// Usage: npm install && npm run build
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildSync } from "esbuild";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
// Prevent a literal "</script" inside inlined code from closing the tag early.
const inline = (code) => code.replace(/<\/script/gi, "<\\/script");

const app = buildSync({
  entryPoints: [new URL("src/main.jsx", import.meta.url).pathname],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2018",
  minify: true,
  legalComments: "none",
}).outputFiles[0].text;

const html = read("src/index.template.html")
  .replace("/*__REACT__*/", () => inline(read("node_modules/react/umd/react.production.min.js")))
  .replace("/*__REACT_DOM__*/", () => inline(read("node_modules/react-dom/umd/react-dom.production.min.js")))
  .replace("/*__APP__*/", () => inline(app));
writeFileSync(new URL("index.html", import.meta.url), html);

// Stamp sw.js with a content hash so a new build replaces the old offline cache.
const version = createHash("sha256").update(html).digest("hex").slice(0, 10);
const sw = read("sw.js").replace(/const VERSION = "[^"]*";/, `const VERSION = "${version}";`);
writeFileSync(new URL("sw.js", import.meta.url), sw);

console.log(`index.html: ${(html.length / 1024).toFixed(0)} KB, sw version ${version}`);
