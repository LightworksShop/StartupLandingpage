import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
await mkdir(`${root}/dist`, { recursive: true });
await build({ entryPoints: [`${root}/admin/main.jsx`], outdir: `${root}/dist`, bundle: true, minify: true, platform: "browser", external: ["/assets/*"], publicPath: "/marketing-assets", format: "esm", jsx: "automatic", target: "es2022", loader: { ".ttf": "file" }, assetNames: "fonts/[name]-[hash]", define: { "process.env.NODE_ENV": '"production"' } });
await writeFile(`${root}/dist/index.html`, '<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Marketing · Smartwerk</title><link rel="stylesheet" href="/marketing-assets/main.css"></head><body><div id="root"></div><script type="module" src="/marketing-assets/main.js"></script></body></html>\n');
process.stdout.write("Marketing-Admin gebaut.\n");
