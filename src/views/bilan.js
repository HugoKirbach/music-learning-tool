// Bilan hebdomadaire + coach : ce que tu as travaillé, tes progrès, tes idées à réécouter et le plan de la semaine suivante.
import { el, card, header, toast, download } from '../ui.js';
import { getState } from '../store.js';
import { weekStart, weekStats, coachPlan } from '../core/weekly.js';
import { addDays } from '../core/srs.js';
import { dayKey, SKILLS } from '../core/progress.js';
import { GENRES, genreById } from '../data/genres.js';
import { playProject, stopAll } from '../player.js';
import { PROGRAM_DAYS, dayInfo } from '../data/program.js';

const KEY_NAMES = {
  'beat': '🥁 Beat', 'chords': '🎼 Accords', 'melody': '🎵 Mélodie', 'synth': '🔊 Synthé', 'ear': '👂 Oreille', 'cr': '🔁 Call & Response',
  'arr': '🧱 Arrangement', 'analyze': '🎧 Analyse', 'recreate': '🎛️ Recréation Serum', 'mission': '🎛️ Missions studio', 'dice': '🎲 Dé à idées',
  'hum': '🎤 Fredonne', 'bass': '🎸 Labo de basse', 'mix': '🎚️ Mixdown', 'remix': '🧬 Remix', 'program': '📅 Programme',
};
const dayFr = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

export function render(root, params) {
  const s = getState();
  const today = dayKey();
  const start = params.w || weekStart(today);
  const cur = weekStats(s, start);
  const prev = weekStats(s, addDays(start, -7));
  let curDay = 0;
  for (; curDay < PROGRAM_DAYS && s.program.done[curDay]; curDay++);
  const programNext = curDay < PROGRAM_DAYS ? { title: `Programme : semaine ${dayInfo(curDay).week + 1}, jour ${dayInfo(curDay).day + 1}` } : null;
  const untried = GENRES.filter((g) => !s.genres[g.id]);
  const coach = coachPlan(cur, prev, { review: s.review, programNext, untriedGenre: untried[Math.floor(Date.now() / 6048e5) % Math.max(1, untried.length)] || null });

  root.append(header('📈 Bilan de la semaine', `Du ${dayFr(start)} au ${dayFr(addDays(start, 6))}`, '#/profile'));
  root.append(el('div.row.gap', { style: { marginBottom: '10px' } },
    el('a.btn.small', { href: `#/bilan?w=${addDays(start, -7)}` }, '◀ Semaine précédente'),
    start < weekStart(today) ? el('a.btn.small', { href: `#/bilan?w=${addDays(start, 7)}` }, 'Semaine suivante ▶') : null));

  // ---------- Chiffres ----------
  const delta = (a, b) => (b ? el('span.small', { style: { color: a >= b ? 'var(--good)' : 'var(--warn)' } }, ` ${a >= b ? '▲' : '▼'} ${Math.abs(a - b)}`) : null);
  const earPct = cur.ear.total ? Math.round((100 * cur.ear.ok) / cur.ear.total) : null;
  const maxDay = Math.max(1, ...cur.perDay);
  const maxSk = Math.max(1, ...Object.values(cur.skills), ...Object.values(prev.skills));

  root.append(
    card(
      el('div.stat-grid',
        el('div', el('b', cur.xp, delta(cur.xp, prev.xp)), el('span', 'XP')),
        el('div', el('b', `${cur.activeDays}/7`), el('span', 'jours actifs')),
        el('div', el('b', cur.sessions), el('span', 'sessions')),
        el('div', el('b', cur.exercises), el('span', 'exercices')),
        el('div', el('b', earPct != null ? `${earPct}%` : '—'), el('span', 'oreille')),
        el('div', el('b', cur.ideas.length), el('span', 'idées au Carnet'))),
      el('div.week-bars', cur.perDay.map((x, i) => el('div', { title: `${dayFr(cur.days[i])} : ${x} XP` },
        el('span', { style: { height: `${Math.round((100 * x) / maxDay)}%` } }), el('small', ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i])))),
    ),
    card(el('h3', '📊 Compétences : cette semaine vs la précédente'),
      Object.entries(SKILLS).map(([k, sk]) => el('div.skill',
        el('div.skill-head', el('span', `${sk.emoji} ${sk.name}`), el('span.muted', `${cur.skills[k]} XP`, delta(cur.skills[k], prev.skills[k]))),
        el('div.meter.dual', el('div', { style: { width: `${Math.round((100 * cur.skills[k]) / maxSk)}%`, background: sk.color } })),
        el('div.meter.dual.prev', el('div', { style: { width: `${Math.round((100 * prev.skills[k]) / maxSk)}%` } })))),
      el('p.small.muted', 'Barre fine = semaine précédente.')),
    card(el('h3', '🧭 Ce que tu as fait'),
      Object.keys(cur.keys).length
        ? el('div', Object.entries(Object.entries(cur.keys).reduce((acc, [k, n]) => { const g = k.split(':')[0]; acc[g] = (acc[g] || 0) + n; return acc; }, {}))
          .sort((a, b) => b[1] - a[1]).map(([g, n]) => el('span.tag', `${KEY_NAMES[g] || g} ×${n}`)))
        : el('p.muted', 'Aucun exercice cette semaine.'),
      cur.genres.length ? el('p.small', '🗺️ Styles travaillés : ', cur.genres.map((id) => `${genreById(id).emoji} ${genreById(id).name}`).join(' · ')) : null),
  );

  // ---------- Idées à réécouter ----------
  const playable = cur.ideas.filter((n) => n.project || n.type === 'beat');
  let playing = null, playlistTimer = null;
  const playIdea = (n) => {
    const p = n.project ? n.project : { ...s.project, drums: n.drums, bpm: n.bpm, swing: n.swing ?? 0, mutes: { chords: true, bass: true, melody: true } };
    playProject(() => p);
    return p;
  };
  const listEl = el('div', playable.map((n) => el('div.row.between', { style: { padding: '6px 0', borderBottom: '1px dashed var(--line)' } },
    el('span', `${n.type === 'beat' ? '🥁' : '💡'} ${n.title}`, el('span.small.muted', ` · ${dayFr(dayKey(new Date(n.date)))}`)),
    el('button.btn.small', { onclick: () => { clearTimeout(playlistTimer); if (playing === n.id) { stopAll(); playing = null; } else { playIdea(n); playing = n.id; } } }, '▶'))));
  const playlist = () => {
    clearTimeout(playlistTimer);
    let i = 0;
    const next = () => {
      if (i >= playable.length) { stopAll(); toast('Fin de la playlist'); return; }
      const p = playIdea(playable[i]);
      toast(`▶ ${playable[i].title}`, 'info', 2000);
      i++;
      playlistTimer = setTimeout(next, (60 / p.bpm) * 16 * 1000);
    };
    next();
  };
  root.append(card(el('h3', `🎧 Tes idées de la semaine (${cur.ideas.length})`),
    playable.length ? el('button.btn.small.primary', { onclick: playlist }, '▶ Écouter la playlist (4 mesures chacune)') : el('p.muted', 'Sauve tes beats et idées dans le Carnet pour les retrouver ici.'),
    listEl,
    cur.ideas.length ? el('p.small.muted', 'Rituel du dimanche : réécoute, garde UNE idée, et développe-la (Remix ou Live).') : null));

  // ---------- Coach ----------
  root.append(card(el('h3', '🧑‍🏫 Ton coach'),
    coach.msgs.map((m) => el('p', m)),
    el('h3', { style: { marginTop: '10px' } }, '📋 Plan pour la semaine prochaine'),
    el('ol.mission-steps', coach.plan.map((x) => el('li', el('a', { href: x.route }, x.title), el('div.small.muted', x.why))))));

  // ---------- Export ----------
  const text = () => [
    `BeatForge — bilan du ${dayFr(start)} au ${dayFr(addDays(start, 6))}`,
    `${cur.xp} XP · ${cur.activeDays}/7 jours · ${cur.sessions} sessions · ${cur.exercises} exercices${earPct != null ? ` · oreille ${earPct} %` : ''}`,
    `Compétences : ${Object.entries(SKILLS).map(([k, sk]) => `${sk.name} ${cur.skills[k]}`).join(', ')}`,
    cur.genres.length ? `Styles : ${cur.genres.map((id) => genreById(id).name).join(', ')}` : null,
    ...coach.msgs,
    'Plan : ' + coach.plan.map((x) => x.title).join(' / '),
  ].filter(Boolean).join('\n');
  root.append(card(el('h3', '📤 Garder une trace'),
    el('div.row.gap.wrap',
      el('button.btn.small', { onclick: () => download(`bilan-beatforge-${start}.png`, renderImage(cur, coach, start)) }, '📸 Image du bilan'),
      el('button.btn.small', { onclick: async () => { try { await navigator.clipboard.writeText(text()); toast('Bilan copié 📋', 'good'); } catch { download(`bilan-beatforge-${start}.txt`, text(), 'text/plain'); } } }, '📋 Copier le texte')),
    el('p.small.muted', 'Range les images dans un dossier : en quelques mois, tu verras ta progression d’un coup d’œil.')));

  return () => { clearTimeout(playlistTimer); stopAll(); };
}

/** Image 1080×1350 du bilan (format partage / galerie). */
function renderImage(cur, coach, start) {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1080, 1350);
  grad.addColorStop(0, '#0d0d16'); grad.addColorStop(1, '#1f1a33');
  g.fillStyle = grad; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = '#b388ff'; g.font = 'bold 64px system-ui'; g.fillText('◆ BeatForge', 70, 120);
  g.fillStyle = '#ececf6'; g.font = '40px system-ui'; g.fillText(`Bilan · semaine du ${dayFr(start)}`, 70, 185);
  const tiles = [[`${cur.xp}`, 'XP'], [`${cur.activeDays}/7`, 'jours'], [`${cur.sessions}`, 'sessions'], [`${cur.ideas.length}`, 'idées']];
  tiles.forEach(([v, l], i) => {
    const x = 70 + i * 240;
    g.fillStyle = '#1a1a2e'; g.fillRect(x, 230, 220, 160);
    g.fillStyle = '#5ce1e6'; g.font = 'bold 64px system-ui'; g.fillText(v, x + 24, 315);
    g.fillStyle = '#9a9ab8'; g.font = '30px system-ui'; g.fillText(l, x + 24, 365);
  });
  const max = Math.max(1, ...Object.values(cur.skills));
  Object.entries(SKILLS).forEach(([k, sk], i) => {
    const y = 470 + i * 90;
    g.fillStyle = '#ececf6'; g.font = '34px system-ui'; g.fillText(`${sk.emoji} ${sk.name}`, 70, y);
    g.fillStyle = '#2e2e4a'; g.fillRect(70, y + 18, 940, 22);
    g.fillStyle = sk.color; g.fillRect(70, y + 18, (940 * cur.skills[k]) / max, 22);
    g.fillStyle = '#9a9ab8'; g.font = '28px system-ui'; g.fillText(`${cur.skills[k]} XP`, 880, y);
  });
  g.fillStyle = '#ececf6'; g.font = 'bold 36px system-ui'; g.fillText('Plan de la semaine prochaine', 70, 1060);
  g.font = '30px system-ui'; g.fillStyle = '#c9c9e0';
  coach.plan.slice(0, 4).forEach((x, i) => g.fillText(`${i + 1}. ${x.title}`, 70, 1115 + i * 50));
  const data = c.toDataURL('image/png');
  const bin = atob(data.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}
