// Parcours de style : 6 étapes pour faire un morceau dans un style, du beat jusqu'à l'export vers Live.
// Chaque étape se valide toute seule quand l'exercice est fait dans le bon style (ou à la main).

const since = (s, p, prefix, g) => (s.log || []).some((e) => e.d >= p.start && e.key?.startsWith(prefix) && (!g || e.genre === g));
const saved = (s, p, type, g) => (s.notebook || []).some((n) => n.type === type && (!g || n.genre === g) && n.date >= p.startAt);
const padDone = (s, id) => (s.pads?.best?.[id]?.stars || 0) >= 1;
const exported = (s, p) => (s.stats?.exports || 0) > (p.exports0 || 0);

export const PATHS = {
  hardtrance: {
    genre: 'hardtrance', name: 'Hard Trance', emoji: '⚡', refs: 'Fenrick, L.Zwo, Kichta, 2HOT2PLAY',
    intro: 'Six étapes pour un morceau hard trance à 155 BPM : le kick, le groove aux pads, la basse roulante, le lead supersaw, la structure break → montée → drop, puis l’export vers Live.',
    steps: [
      { id: 'beat', emoji: '🥁', title: 'Le kick qui cogne', href: '#/beat?genre=hardtrance', cta: 'Lab Beat',
        lesson: 'Kick court et saturé sur chaque temps, clap sur 2 et 4, hats entre les temps. Pars du beat Hard Trance, change au moins une chose (une perc sur le « a » du 4, un hat ouvert en plus…) puis valide-le.',
        check: (s, p) => since(s, p, 'beat:', 'hardtrance') },
      { id: 'pads', emoji: '🔲', title: 'Le groove aux pads', href: '#/pads?level=htgroove', cta: 'Pad Rush',
        lesson: 'Joue le groove à la main à 155 BPM : c’est la meilleure façon de sentir la vitesse et la place laissée à la basse.',
        check: (s) => padDone(s, 'htgroove') },
      { id: 'bass', emoji: '🎸', title: 'La basse roulante', href: '#/basslab', cta: 'Labo de basse',
        lesson: 'Entre deux kicks, trois doubles croches de basse : elle « roule » et laisse le premier quart de chaque temps au kick. Fais critiquer ta basse dans le Labo de basse.',
        check: (s, p) => since(s, p, 'bass:', 'hardtrance') },
      { id: 'lead', emoji: '🎹', title: 'Le lead supersaw', href: '#/melody', cta: 'Lab Mélodie',
        lesson: 'Un hook chantant en mineur, avec des notes répétées et une montée vers l’aigu : c’est lui qu’on chante en club. Écris-le dans le Lab Mélodie (8 mesures max).',
        check: (s, p) => since(s, p, 'melody:', 'hardtrance') },
      { id: 'arr', emoji: '🧱', title: 'Break → montée → drop', href: '#/arrange', cta: 'Lab Arrangement',
        lesson: 'Intro 16 mesures, break mélodique 32 (le lead presque seul), montée 8 à 16 (roulement de snare + riser + filtre qui s’ouvre), drop 32 à pleine énergie.',
        check: (s, p) => since(s, p, 'arr:', 'hardtrance') },
      { id: 'export', emoji: '📦', title: 'Vers Live', href: '#/melody', cta: 'Exporter',
        lesson: 'Exporte l’idée en MIDI (bouton ⬇ MIDI) ou en Pack Live (mini-lecteur) et ouvre-la dans Ableton : Serum 2 sur le lead, sidechain fort sur la basse, Saturator sur le kick.',
        check: (s, p) => exported(s, p) },
    ],
  },
  hardhouse: {
    genre: 'hardhouse', name: 'Hard House', emoji: '🔨', refs: 'Marlon Hoffstadt, Malugi, Kettama',
    intro: 'Six étapes pour un morceau hard house à 145 BPM : le groove de warehouse, le donk aux pads, la basse offbeat, les stabs rave, un build court et un drop direct, puis l’export vers Live.',
    steps: [
      { id: 'beat', emoji: '🥁', title: 'Le groove de warehouse', href: '#/beat?genre=hardhouse', cta: 'Lab Beat',
        lesson: 'Kick sur chaque temps, clap sur 2 et 4, hats et percussions qui rebondissent. Pars du beat Hard House, rends-le à toi (une perc en plus, un clap doublé…) puis valide-le.',
        check: (s, p) => since(s, p, 'beat:', 'hardhouse') },
      { id: 'pads', emoji: '🔲', title: 'Le donk aux pads', href: '#/pads?level=hhdonk', cta: 'Pad Rush',
        lesson: 'Joue le donk sur chaque contretemps, entre les kicks : boum-donk-boum-donk. C’est le moteur du style.',
        check: (s) => padDone(s, 'hhdonk') },
      { id: 'bass', emoji: '🎸', title: 'La basse offbeat', href: '#/basslab', cta: 'Labo de basse',
        lesson: 'Courte et percutante sur les « et ». Un pitch qui descend vite à l’attaque donne le « donk ». Fais critiquer ta basse dans le Labo de basse.',
        check: (s, p) => since(s, p, 'bass:', 'hardhouse') },
      { id: 'stabs', emoji: '🎼', title: 'Les stabs rave', href: '#/chords', cta: 'Lab Accords',
        lesson: 'Des accords mineurs courts, joués en stabs (hoover, piano rave). Choisis une progression de 2 ou 3 accords, garde-la au Carnet ou réussis une recette.',
        check: (s, p) => since(s, p, 'chords:', 'hardhouse') || saved(s, p, 'chords', 'hardhouse') },
      { id: 'arr', emoji: '🧱', title: 'Build court, drop direct', href: '#/arrange', cta: 'Lab Arrangement',
        lesson: 'Intro 16, drop 32 très tôt, petit break de 8, re-drop. Les builds sont courts (4 à 8 mesures) : la hard house va droit au but.',
        check: (s, p) => since(s, p, 'arr:', 'hardhouse') },
      { id: 'export', emoji: '📦', title: 'Vers Live', href: '#/melody', cta: 'Exporter',
        lesson: 'Exporte en MIDI ou en Pack Live et ouvre-le dans Ableton : sidechain sur le donk, Erosion ou Redux pour le grain rave, clap doublé avec une réverbe très courte.',
        check: (s, p) => exported(s, p) },
    ],
  },
};

/** Avancement d'un parcours : étapes faites (auto ou à la main) et étape en cours. */
export function pathProgress(s, g) {
  const path = PATHS[g];
  const p = s.paths?.[g];
  if (!path || !p) return { started: false, done: {}, count: 0, total: path?.steps.length || 0, next: path?.steps[0] || null };
  const done = {};
  for (const st of path.steps) done[st.id] = !!(p.done?.[st.id] || safe(() => st.check(s, p)));
  const count = Object.values(done).filter(Boolean).length;
  return { started: true, done, count, total: path.steps.length, next: path.steps.find((st) => !done[st.id]) || null };
}
function safe(fn) { try { return fn(); } catch (e) { return false; } }
