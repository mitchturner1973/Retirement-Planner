import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const testsDir = path.resolve('scripts/tests');

async function run() {
  const files = (await readdir(testsDir))
    .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
    .sort();

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const fullPath = path.join(testsDir, file);
    const label = file.replace(/\.mjs$/, '');

    try {
      await import(`${pathToFileURL(fullPath).href}?t=${Date.now()}-${Math.random()}`);
      console.log(`PASS ${label}`);
      passed += 1;
    } catch (err) {
      console.log(`FAIL ${label}`);
      if (err?.message) {
        console.log(`  ${err.message}`);
      } else {
        console.log(`  ${String(err)}`);
      }
      failed += 1;
    }
  }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test runner crashed');
  console.error(err);
  process.exit(1);
});
