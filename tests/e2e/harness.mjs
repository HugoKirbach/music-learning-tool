// Outils communs des tests navigateur : pages PC / mobile, faux MIDI, faux Firebase (avec les règles de sécurité).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const VIEWPORTS = {
  pc: { viewport: { width: 1366, height: 860 } },
  mobile: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
};

/** Serveur Firestore en mémoire, partagé entre plusieurs « appareils » d'un même test. */
export function fakeCloud() {
  const docs = new Map();
  const accounts = new Map();
  const deny = { __err: 'permission-denied' };
  const parts = (p) => p.split('/');
  // Reproduit firestore.rules (si une règle change là-bas, la changer ici aussi)
  function allowed(op, path, uid, data, existing) {
    if (!uid) return false;
    const p = parts(path);
    if (p[0] === 'users') return p[1] === uid;
    if (p[0] === 'profiles') return op === 'read' || (p[1] === uid && typeof data?.pseudo === 'string' && data.pseudo.length <= 20);
    if (p[0] === 'pseudos') {
      if (op === 'read') return true;
      if (op === 'create') return data?.uid === uid;
      if (op === 'delete') return existing?.uid === uid;
      return false;
    }
    if (p[0] === 'requests') {
      if (op === 'create') return data?.from === uid && p[1] === `${data.to}_${uid}`;
      if (op === 'read' || op === 'delete') return existing && (existing.to === uid || existing.from === uid);
      return false;
    }
    if (p[0] === 'challenges' && p[2] === 'entries') {
      if (op === 'read') return true;
      if (op === 'delete') return p[3] === uid;
      return p[3] === uid && typeof data?.project === 'string' && data.project.length < 60000;
    }
    return false;
  }
  const writeOp = (path, data) => (data == null ? 'delete' : docs.has(path) ? 'update' : 'create');
  const fs = (op, args, uid) => {
    if (op === 'get') {
      const [path] = args;
      const d = docs.get(path);
      if (!allowed('read', path, uid, null, d ?? null) && !(parts(path)[0] === 'requests' && !d)) return deny;
      return d ?? null;
    }
    if (op === 'set') {
      const [path, data, merge] = args;
      const next = merge ? { ...(docs.get(path) || {}), ...data } : data;
      if (!allowed(writeOp(path, next), path, uid, next, docs.get(path))) return deny;
      docs.set(path, JSON.parse(JSON.stringify(next)));
      return true;
    }
    if (op === 'del') {
      const [path] = args;
      if (docs.has(path) && !allowed('delete', path, uid, null, docs.get(path))) return deny;
      docs.delete(path);
      return true;
    }
    if (op === 'list') {
      const [coll, filters] = args;
      const depth = parts(coll).length + 1;
      const out = [];
      for (const [path, d] of docs) {
        if (!path.startsWith(coll + '/') || parts(path).length !== depth) continue;
        if (!filters.every(([f, o, v]) => o === '==' && d[f] === v)) continue;
        if (!allowed('read', path, uid, null, d)) return deny; // comme Firestore : une requête non couverte par les règles échoue entièrement
        out.push([parts(path).pop(), d]);
      }
      return out;
    }
    if (op === 'commit') {
      const [reads, writes] = args;
      for (const [path, json] of Object.entries(reads)) if (JSON.stringify(docs.get(path) ?? null) !== json) return false;
      for (const [path, data] of writes) {
        if (!allowed(writeOp(path, data), path, uid, data, docs.get(path))) return deny;
      }
      for (const [path, data] of writes) { if (data == null) docs.delete(path); else docs.set(path, JSON.parse(JSON.stringify(data))); }
      return true;
    }
    return deny;
  };
  const auth = (op, [email, pw]) => {
    if (op === 'create') { if (accounts.has(email)) return false; accounts.set(email, pw); return true; }
    return accounts.get(email) === pw;
  };
  return { docs, accounts, fs, auth };
}

/** Script injecté : faux clavier MIDI « MPC Key 37 » pilotable avec window.__midi(...octets). */
function midiInit(connected) {
  const input = { name: 'MPC Key 37', state: 'connected', onmidimessage: null };
  const inputs = new Map(connected ? [['1', input]] : []);
  window.__sent = [];
  const output = { id: 'out-loop', name: 'loopMIDI BeatForge', state: 'connected', send: (bytes, ts) => window.__sent.push([...bytes, ts || 0]) };
  const access = { inputs, outputs: new Map([['out-loop', output]]), onstatechange: null };
  window.__plug = () => { inputs.set('1', input); access.onstatechange?.({}); };
  window.__unplug = () => { inputs.delete('1'); access.onstatechange?.({}); };
  window.__midi = (...bytes) => input.onmidimessage?.({ data: new Uint8Array(bytes) });
  window.__midiAt = (ts, ...bytes) => input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp: ts });
  navigator.requestMIDIAccess = async () => access;
  const q = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = async (d) => (d.name === 'midi' ? { state: 'granted' } : q(d));
}

export function createHarness({ browser, base }) {
  const contexts = [];
  const errors = [];
  async function open({ device = 'pc', midi = false, midiConnected = true, cloud = null, onboard = true, route = '#/home', name = device, permissions = [] } = {}) {
    const ctx = await browser.newContext({ ...VIEWPORTS[device], permissions });
    contexts.push(ctx);
    // Garde-fou : jamais d'appel aux vrais serveurs Google (comptes, base de données) pendant les tests
    await ctx.route(/^https:\/\/[^/]*(googleapis\.com|firebaseapp\.com|google\.com)\//, (r) => r.abort());
    if (midi) await ctx.addInitScript(midiInit, midiConnected);
    if (cloud) {
      await ctx.route('https://www.gstatic.com/firebasejs/**', (r) => r.fulfill({ contentType: 'text/javascript', body: readFileSync(join(here, 'fbmock', r.request().url().split('/').pop()), 'utf8') }));
      await ctx.exposeFunction('__fs', (op, args, uid) => cloud.fs(op, args, uid));
      await ctx.exposeFunction('__auth', (op, args) => cloud.auth(op, args));
    } else {
      // Sans faux Firebase, aucun appel réseau vers Google pendant les tests
      await ctx.route('https://www.gstatic.com/**', (r) => r.abort());
    }
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(m.text())) errors.push(`[${name}] console : ${m.text()}`); });
    page.go = async (hash, wait = 350) => {
      if (page.url().endsWith(hash)) { await page.goto(base + (hash === '#/atlas' ? '#/labs' : '#/atlas')); await page.waitForTimeout(100); } // même écran : on force le rechargement
      await page.goto(base + hash); await page.waitForTimeout(wait);
    };
    // Clic après avoir centré l'élément (les barres fixes du bas ne le recouvrent plus)
    page.clickC = async (sel) => { const l = page.locator(sel).first(); await l.evaluate((e) => e.scrollIntoView({ block: 'center' })); await l.click(); };
    page.state = () => page.evaluate(() => JSON.parse(localStorage.getItem('beatforge.v1')));
    page.store = (src) => page.evaluate(async (code) => { const m = await import('/src/store.js'); m.update(new Function('s', code)); }, src);
    await page.goto(base + route);
    await page.waitForTimeout(400);
    if (onboard) { await page.click('text=C’est parti'); await page.waitForTimeout(250); }
    return page;
  }
  return { open, errors, close: async () => { for (const c of contexts) await c.close().catch(() => {}); contexts.length = 0; } };
}
