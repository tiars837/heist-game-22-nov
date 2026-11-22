// main.ts — the entrypoint: copies game/ and screenshots/ into the output
// directory and writes dossier.json there with buildDossier from
// vendor/makefun-game.ts. Standard library only, Node 22, no network.
// Deterministic: the same repository always writes the same bytes.

import { buildDossier } from "./vendor/makefun-game.ts";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

/** Copy one directory tree, files in sorted order, creating directories. */
function copyTree(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  const entries = readdirSync(sourceDir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const from = join(sourceDir, entry.name);
    const to = join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to);
    } else if (entry.isFile()) {
      copyFileSync(from, to);
    }
  }
}

/**
 * Empty a directory's contents without removing the directory itself.
 * The grader hands us a writable /output; we must never delete it.
 */
function emptyContents(dir: string): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    rmSync(join(dir, entry.name), { recursive: true, force: true });
  }
}

function main(): void {
  const here = new URL(".", import.meta.url).pathname;
  const repoRoot = here.endsWith("/") ? here.slice(0, -1) : here;

  // A previous run's output is stale: clear only what is inside the
  // output directory, never the directory itself.
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  } else if (!statSync(OUTPUT_DIR).isDirectory()) {
    throw new Error(`output is not a directory: ${OUTPUT_DIR}`);
  } else {
    emptyContents(OUTPUT_DIR);
  }

  copyTree(join(repoRoot, "game"), join(OUTPUT_DIR, "game"));
  copyTree(join(repoRoot, "screenshots"), join(OUTPUT_DIR, "screenshots"));

  const dossier = buildDossier(OUTPUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(OUTPUT_DIR, "dossier.json"), dossier);
}

main();
