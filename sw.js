// Service worker : app utilisable hors-ligne (stale-while-revalidate sur les fichiers de l'app).
const CACHE = 'beatforge-v30';
// Module de compte (Firebase, versionné dans l'URL) : gardé en cache pour retrouver sa session hors-ligne
const SDK_CACHE = 'beatforge-sdk-10.12.2';
const SHELL = [
  './src/core/demosong.js',
  './src/data/demos.js',
  './src/demoplayer.js',
  './src/views/mistakescard.js',
  './src/views/path.js',
  './src/data/paths.js',
  './src/core/mistakes.js',
  './src/views/collection.js',
  './src/core/achievements.js',
  './src/views/club.js',
  './src/core/club.js',
  './src/cert.js',
  './src/core/goals.js',
  './src/core/latency.js',
  './src/core/stats.js',
  './src/views/latency.js',
  './src/views/progress.js',
  './src/views/review.js',
  './', './index.html', './styles.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './src/main.js', './src/ui.js', './src/store.js', './src/player.js', './src/midiin.js', './src/catalog.js', './src/miniplayer.js', './src/shortcuts.js', './src/core/tiles.js', './src/data/rush.js', './src/views/rush.js', './src/cloud.js', './src/core/merge.js', './src/views/account.js', './src/core/padgame.js', './src/data/pads.js', './src/views/pads.js', './src/audiomode.js', './src/views/audiodiag.js', './src/core/schema.js', './src/social.js', './src/views/friends.js', './src/core/pedagogy.js', './src/core/critique.js', './src/stems.js', './src/core/wav.js', './src/views/skills.js', './src/views/placement.js', './src/views/project.js', './src/views/critique.js', './src/prefs.js', './src/core/sharecode.js', './src/views/listen.js', './src/share.js', './src/whatsnew.js', './src/core/challenge.js', './src/views/challenge.js', './src/core/reminder.js', './src/reminders.js', './src/views/reminderscard.js', './src/midiout.js', './src/midisync.js', './src/views/studiocard.js',
  './src/core/audio.js', './src/core/theory.js', './src/core/rhythm.js', './src/core/midi.js', './src/core/arrange.js',
  './src/core/catchy.js', './src/core/audioanalysis.js', './src/core/phrase.js', './src/core/srs.js', './src/core/arrangement.js', './src/core/extract.js', './src/core/hum.js', './src/core/basscritic.js', './src/core/mixdown.js', './src/core/variations.js', './src/core/weekly.js', './src/core/progress.js', './src/core/daily.js', './src/core/synthparams.js',
  './src/data/genres.js', './src/data/presets.js', './src/data/missions.js', './src/data/program.js',
  './src/views/home.js', './src/views/labs.js', './src/views/beat.js', './src/views/chords.js', './src/views/melody.js',
  './src/views/synth.js', './src/views/ear.js', './src/views/atlas.js', './src/views/studio.js', './src/views/notebook.js', './src/views/profile.js', './src/views/callresponse.js', './src/views/arrange.js', './src/views/analyze.js', './src/views/program.js', './src/views/recreate.js', './src/views/hum.js', './src/views/basslab.js', './src/views/mixdown.js', './src/views/remix.js', './src/views/bilan.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SDK_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.open(SDK_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || network;
  }));
});

// ---------- Rappels intelligents (Chrome / Android, app installée : réveil périodique) ----------
function kv(mode, fn) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('beatforge', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => { const tx = r.result.transaction('kv', mode); const q = fn(tx.objectStore('kv')); tx.oncomplete = () => { r.result.close(); res(q && q.result); }; tx.onerror = () => rej(tx.error); };
    r.onerror = () => rej(r.error);
  });
}
const pad = (n) => String(n).padStart(2, '0');
async function maybeRemind() {
  const d = await kv('readonly', (st) => st.get('reminder'));
  if (!d || !d.enabled) return;
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const [h, m] = String(d.time || '19:00').split(':').map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + (m || 0)) return;
  if (d.notified === today) return;
  if (d.day === today && (d.practiced || !d.message)) return;
  const msg = d.day === today ? d.message : { title: '🎧 5 minutes de musique ?', body: 'Ta session express t’attend.', url: '#/home' };
  await self.registration.showNotification(msg.title, { body: msg.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'bf-reminder', data: { url: msg.url } });
  await kv('readwrite', (st) => st.put({ ...d, notified: today }, 'reminder'));
}
self.addEventListener('periodicsync', (e) => { if (e.tag === 'bf-reminder') e.waitUntil(maybeRemind()); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '#/home', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list[0];
    if (c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
