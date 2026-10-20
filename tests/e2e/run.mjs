// Lanceur des tests navigateur : `npm run e2e` (ou `npm run e2e -- pads` pour un seul fichier).
// Démarre le serveur local, ouvre Chromium (Playwright) et exécute tests/e2e/*.e2e.mjs.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { createHarness } from './harness.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const require = createRequire(import.meta.url);
// Les requêtes du service worker passent aussi par les interceptions des tests (faux Firebase servi en cache)
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium } = require(process.env.PW || 'playwright');
const PORT = Number(process.env.E2E_PORT) || 8765;
const base = `http://localhost:${PORT}/`;
const only = process.argv.slice(2);

const server = spawn(process.execPath, [join(root, 'scripts', 'serve.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(base)).ok) break; } catch (e) { /* pas encore prêt */ }
  await new Promise((r) => setTimeout(r, 100));
}

const executablePath = process.env.PW_CHROMIUM || undefined;
const browser = await chromium.launch({ executablePath, args: ['--autoplay-policy=no-user-gesture-required'] });
const files = readdirSync(here).filter((f) => f.endsWith('.e2e.mjs') && (!only.length || only.some((o) => f.includes(o)))).sort();
let pass = 0, fail = 0;
const t0 = Date.now();
for (const f of files) {
  const mod = await import(pathToFileURL(join(here, f)).href);
  for (const [name, fn] of Object.entries(mod.tests || {})) {
    const h = createHarness({ browser, base });
    const start = Date.now();
    try {
      await Promise.race([fn({ ...h, assert, base }), new Promise((_, rej) => setTimeout(() => rej(new Error('délai dépassé (180 s)')), 180000))]);
      if (h.errors.length) throw new Error('Erreurs JavaScript dans la page :\n' + h.errors.join('\n'));
      pass++;
      console.log(`✔ ${f} › ${name} (${((Date.now() - start) / 1000).toFixed(1)} s)`);
    } catch (e) {
      fail++;
      console.log(`✘ ${f} › ${name}\n  ${String(e.stack || e.message).split('\n').slice(0, 8).join('\n  ')}`);
    } finally {
      await h.close();
    }
  }
}
await browser.close();
server.kill();
console.log(`\n${pass} réussi(s), ${fail} échoué(s) en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fail ? 1 : 0);
