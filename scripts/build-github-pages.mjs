#!/usr/bin/env node
/**
 * GitHub Pages uses static export (output: "export"), which cannot include API routes.
 * Temporarily move src/app/api aside, build, then restore.
 */
import { renameSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const apiPath = "src/app/api";
const backupPath = ".github-pages-api-backup";

if (existsSync(backupPath)) {
  console.error("Stale API backup found — a previous build may have failed.");
  console.error("Restore manually: mv .github-pages-api-backup src/app/api");
  process.exit(1);
}

let moved = false;

try {
  if (existsSync(apiPath)) {
    renameSync(apiPath, backupPath);
    moved = true;
    console.log("Moved API routes aside for static export build.");
  }

  execSync("next build --webpack", {
    stdio: "inherit",
    env: { ...process.env, GITHUB_PAGES: "true" },
  });
} finally {
  if (moved && existsSync(backupPath)) {
    renameSync(backupPath, apiPath);
    console.log("Restored API routes.");
  }
}
