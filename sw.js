// Service worker : app utilisable hors-ligne (stale-while-revalidate sur les fichiers de l'app).
const CACHE = 'beatforge-v9';
const SHELL = [
  './', './index.html', './styles.css', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './src/main.js', './src/ui.js', './src/store.js', './src/player.js', './src/midiin.js', './src/catalog.js', './src/miniplayer.js',
  './src/core/audio.js', './src/core/theory.js', './src/core/rhythm.js', './src/core/midi.js', './src/core/arrange.js',
  './src/core/catchy.js', './src/core/audioanalysis.js', './src/core/phrase.js', './src/core/srs.js', './src/core/arrangement.js', './src/core/extract.js', './src/core/hum.js', './src/core/basscritic.js', './src/core/mixdown.js', './src/core/variations.js', './src/core/weekly.js', './src/core/progress.js', './src/core/daily.js', './src/core/synthparams.js',
  './src/data/genres.js', './src/data/presets.js', './src/data/missions.js', './src/data/program.js',
  './src/views/home.js', './src/views/labs.js', './src/views/beat.js', './src/views/chords.js', './src/views/melody.js',
  './src/views/synth.js', './src/views/ear.js', './src/views/atlas.js', './src/views/studio.js', './src/views/notebook.js', './src/views/profile.js', './src/views/callresponse.js', './src/views/arrange.js', './src/views/analyze.js', './src/views/program.js', './src/views/recreate.js', './src/views/hum.js', './src/views/basslab.js', './src/views/mixdown.js', './src/views/remix.js', './src/views/bilan.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || network;
  }));
});
