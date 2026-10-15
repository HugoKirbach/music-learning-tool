// Vérifie que tous les imports relatifs pointent vers des fichiers existants et que les exports nommés existent.
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

const files = await walk('src');
let errors = 0;
const exportsOf = new Map();
for (const f of files) {
  const src = await readFile(f, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
  exportsOf.set(resolve(f), names);
}
for (const f of files) {
  const src = await readFile(f, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'(\.[^']+)'/g)) {
    const target = resolve(dirname(f), m[2]);
    if (!existsSync(target)) { console.error(`${f}: fichier introuvable ${m[2]}`); errors++; continue; }
    const names = exportsOf.get(target) || new Set();
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name && !names.has(name)) { console.error(`${f}: '${name}' n'est pas exporté par ${m[2]}`); errors++; }
    }
  }
  for (const m of src.matchAll(/import\(\s*'(\.[^']+)'\s*\)/g)) {
    if (!existsSync(resolve(dirname(f), m[1]))) { console.error(`${f}: import dynamique introuvable ${m[1]}`); errors++; }
  }
}
if (errors) { console.error(`${errors} erreur(s)`); process.exit(1); }
console.log(`OK : ${files.length} modules vérifiés`);
