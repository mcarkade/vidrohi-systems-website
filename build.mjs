import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, "dist");

if (basename(output) !== "dist" || dirname(output) !== root) {
  throw new Error("Refusing to clean an unexpected output path.");
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const configuredUrl = process.env.SITE_URL;
const siteUrl = configuredUrl
  ? configuredUrl.replace(/\/$/, "")
  : productionDomain
    ? `https://${productionDomain}`
    : "http://localhost:4173";

const html = readFileSync(join(root, "index.html"), "utf8")
  .replaceAll("__SITE_URL__", siteUrl);

writeFileSync(join(output, "index.html"), html);

for (const file of ["styles.css", "script.js", "site.webmanifest", "robots.txt"]) {
  cpSync(join(root, file), join(output, file));
}
cpSync(join(root, "assets"), join(output, "assets"), { recursive: true });

console.log(`Built Vidrohi Systems for ${siteUrl}`);
