// Certificat de niveau : image PNG (1200 × 850) générée dans le navigateur, à télécharger ou partager.
import { getState } from './store.js';
import { titleFor, SKILLS } from './core/progress.js';
import { getMyProfile } from './social.js';
import { download, toast } from './ui.js';

const dateFr = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Dessine le certificat du niveau L et renvoie le canvas. */
export function drawCert(L, s = getState()) {
  const W = 1200, H = 850;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#141424'); bg.addColorStop(1, '#2a1b4d');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // Cadre
  g.strokeStyle = '#b388ff'; g.lineWidth = 6; g.strokeRect(36, 36, W - 72, H - 72);
  g.strokeStyle = 'rgba(92,225,230,.5)'; g.lineWidth = 2; g.strokeRect(52, 52, W - 104, H - 104);
  // Ondes décoratives
  g.strokeStyle = 'rgba(179,136,255,.18)'; g.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    for (let x = 60; x <= W - 60; x += 6) g.lineTo(x, H - 150 + Math.sin(x / (40 + k * 12) + k) * (14 + k * 6));
    g.stroke();
  }
  const center = (txt, y, font, color) => { g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.fillText(txt, W / 2, y); };
  const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  center('◆ BeatForge', 140, `700 34px ${sans}`, '#b388ff');
  center('CERTIFICAT DE NIVEAU', 200, `600 26px ${sans}`, '#9a9ab8');
  const who = getMyProfile()?.pseudo || 'Producteur·rice';
  center(who, 300, `800 64px ${sans}`, '#ececf6');
  center('a atteint le', 360, `400 28px ${sans}`, '#9a9ab8');
  center(`Niveau ${L} · ${titleFor(L)}`, 440, `800 56px ${sans}`, '#ffe066');
  const day = s.certs?.[L];
  if (day) center(`le ${dateFr(day)}`, 492, `400 26px ${sans}`, '#9a9ab8');
  // Compétences principales
  const top = Object.entries(s.skills || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).filter(([, v]) => v > 0);
  if (top.length) center(`Points forts : ${top.map(([k]) => `${SKILLS[k].emoji} ${SKILLS[k].name}`).join('   ')}`, 570, `500 26px ${sans}`, '#5ce1e6');
  center(`${s.xp} XP · record de série : ${s.streak?.best || 0} jours · ${Object.keys(s.genres || {}).length} styles explorés`, 620, `400 24px ${sans}`, '#ececf6');
  center('hugokirbach.github.io/music-learning-tool', H - 80, `400 20px ${sans}`, '#6f6f90');
  return c;
}

const blobOf = (c) => new Promise((res) => c.toBlob(res, 'image/png'));

/** Partage le certificat (feuille de partage du téléphone) ou, à défaut, le télécharge. */
export async function shareCert(L) {
  const blob = await blobOf(drawCert(L));
  const name = `beatforge-certificat-niveau-${L}.png`;
  const file = typeof File !== 'undefined' ? new File([blob], name, { type: 'image/png' }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: `BeatForge · niveau ${L}`, text: `J’ai atteint le niveau ${L} (${titleFor(L)}) sur BeatForge 🎧` }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  download(name, blob, 'image/png');
  toast('Certificat téléchargé 🎓', 'good');
  return 'downloaded';
}

export async function downloadCert(L) {
  download(`beatforge-certificat-niveau-${L}.png`, await blobOf(drawCert(L)), 'image/png');
}
