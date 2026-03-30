#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const appDir = process.argv[2];

if (!appDir) {
  console.error('Usage: node scripts/package-next-standalone.mjs <app-dir>');
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const appPath = path.join(repoRoot, appDir);
const standaloneDir = path.join(appPath, '.next', 'standalone');
const staticDir = path.join(appPath, '.next', 'static');
const publicDir = path.join(appPath, 'public');
const distDir = path.join(appPath, 'dist');

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function copyIfExists(from, to) {
  if (!(await exists(from))) return;
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, { recursive: true, force: true });
}

if (!(await exists(standaloneDir))) {
  console.error(`Missing standalone output: ${standaloneDir}`);
  console.error('Run the app build first (next build).');
  process.exit(1);
}

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

await fs.cp(standaloneDir, distDir, { recursive: true, force: true });
await copyIfExists(staticDir, path.join(distDir, appDir, '.next', 'static'));
await copyIfExists(publicDir, path.join(distDir, appDir, 'public'));

console.log(`Packaged standalone app into ${path.relative(repoRoot, distDir)}`);
