import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(rootDir, 'public');

const items = [
  { path: 'index.html', required: true },
  { path: 'styles', required: true },
  { path: 'src', required: true },
  { path: 'assets', required: false },
  { path: 'images', required: false },
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function copyItem(source, target) {
  await cp(source, target, { recursive: true });
}

async function main() {
  await rm(publicDir, { recursive: true, force: true });
  await mkdir(publicDir, { recursive: true });

  const copied = [];

  for (const item of items) {
    const from = resolve(rootDir, item.path);
    if (!(await exists(from))) {
      if (item.required) {
        throw new Error(`Required public asset missing: ${item.path}`);
      }
      continue;
    }

    const to = resolve(publicDir, item.path);
    await copyItem(from, to);
    copied.push(item.path);
  }

  console.log(`Public bundle ready in ${publicDir}`);
  console.log(`Copied: ${copied.join(', ') || 'nothing copied'}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
