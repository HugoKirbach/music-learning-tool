// « Remix ton idée » : transformations guidées d'une idée (projet) pour apprendre à DÉVELOPPER plutôt que recommencer.
// Chaque transformation renvoie le nouveau projet + ce qui a changé + pourquoi ça marche. Module pur.
import { SCALES, mod, slotChord } from './theory.js';
import { gridFromPatterns, emptyGrid } from './rhythm.js';
import { genreById, defaultPump } from '../data/genres.js';
import { kitForGenre } from './audio.js';
import { voiceProgression, MELODY_STEPS } from './arrange.js';
import { bassNote } from './basscritic.js';

const clone = (p) => JSON.parse(JSON.stringify(p));
const isMinor = (scale) => SCALES[scale].steps.includes(3);

/** Re-mappe une note d'une gamme vers une autre en gardant son degré (et son octave). */
export function remapDegree(n, rootPc, from, to) {
  const A = SCALES[from].steps, B = SCALES[to].steps;
  const rel = n - rootPc;
  const oct = Math.floor(rel / 12), pc = mod(rel, 12);
  let deg = A.indexOf(pc);
  if (deg < 0) deg = A.reduce((best, s, i) => (Math.abs(s - pc) < Math.abs(A[best] - pc) ? i : best), 0);
  return rootPc + oct * 12 + B[Math.min(deg, B.length - 1)];
}

export const TRANSFORMS = {
  genre: {
    name: 'Changer de style', emoji: '🗺️',
    run: (p, gid) => {
      const g = genreById(gid);
      const q = clone(p);
      Object.assign(q, { genre: g.id, bpm: g.bpm, swing: g.swing, drums: gridFromPatterns(g.drums), kit: kitForGenre(g.id), chordStyle: g.chordStyle, bassStyle: g.bassStyle, sounds: { ...g.sounds }, pump: defaultPump(g.id) });
      delete q.bassLine;
      return {
        project: q, title: `Version ${g.name}`,
        what: `Même harmonie et même mélodie, mais batterie, tempo (${g.bpm} BPM), rythme des accords, basse et sons du style ${g.name}.`,
        why: `Un style, c’est surtout un groove et des sons. Ta mélodie et tes accords survivent au changement : c’est le principe du remix. Ingrédients ${g.name} : ${g.signature.join(', ')}.`,
      };
    },
  },
  mode: {
    name: 'Majeur ⇄ mineur', emoji: '🌗',
    run: (p) => {
      const q = clone(p);
      const to = isMinor(p.scale) ? 'major' : 'minor';
      q.melody = p.melody.map((m) => (m ? { ...m, n: remapDegree(m.n, p.rootPc, p.scale, to) } : null));
      if (p.bassLine) q.bassLine = p.bassLine.map((m) => (m ? { ...m, n: remapDegree(m.n, p.rootPc, p.scale, to) } : null));
      q.scale = to;
      return {
        project: q, title: to === 'major' ? 'Version majeure' : 'Version mineure',
        what: `Même tonique, mêmes degrés, mais en ${to === 'major' ? 'majeur' : 'mineur'} : chaque note garde sa place dans la gamme.`,
        why: 'Le mode change l’émotion sans changer la structure : même « dessin » mélodique, autre couleur. Astuce de remixeur pour transformer un morceau joyeux en version mélancolique (et inversement).',
      };
    },
  },
  reharm: {
    name: 'Réharmoniser', emoji: '🎨',
    run: (p) => {
      const q = clone(p);
      // Substitution par tierce : chaque accord pair remplacé par l'accord qui partage 2 notes avec lui (une tierce en dessous)
      q.chords = p.chords.map((c, i) => (c && i % 2 === 1 ? { deg: mod(c.deg + 5, 7) } : c));
      q.ext = Math.max(4, p.ext || 3);
      const before = voiceProgression(p).map((c) => c?.symbol || '–').join(' – ');
      const after = voiceProgression(q).map((c) => c?.symbol || '–').join(' – ');
      return {
        project: q, title: 'Réharmonisation',
        what: `${before} → ${after} (accords 2 et 4 substitués, 7e ajoutées).`,
        why: 'Substitution par tierce : I et vi, IV et ii partagent 2 notes sur 3. La mélodie reste « juste » mais l’éclairage change. Les 7e adoucissent le tout (deep house, lo-fi, neo-soul).',
      };
    },
  },
  borrow: {
    name: 'Accord emprunté', emoji: '✨',
    run: (p) => {
      const q = clone(p);
      const minor = isMinor(p.scale);
      const idx = q.chords.findIndex((c) => c && c.deg === (minor ? 4 : 3));
      const at = idx >= 0 ? idx : 3;
      q.chords[at] = minor ? { deg: 4, mode: 'harmonicMinor' } : { deg: 3, mode: 'minor' };
      const c = slotChord(p.rootPc, p.scale, q.chords[at], 3);
      return {
        project: q, title: 'Avec un accord emprunté',
        what: `Accord ${at + 1} → ${c.symbol} (${c.roman}), emprunté au mode ${minor ? 'mineur harmonique' : 'mineur'}.`,
        why: minor
          ? 'Le V majeur (emprunté au mineur harmonique) crée une vraie tension qui appelle le retour sur le i : effet dramatique, trance, flamenco.'
          : 'Le iv mineur dans un morceau majeur : le frisson nostalgique (Radiohead, Daft Punk, M83). Un seul accord suffit à changer l’émotion.',
      };
    },
  },
  halftime: {
    name: 'Half-time', emoji: '🐢',
    run: (p) => {
      const q = clone(p);
      const d = emptyGrid();
      d.kick = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
      const sn = (p.drums.snare || []).some(Boolean) ? 'snare' : 'clap';
      d[sn][8] = 1;
      d.hat = [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 2];
      q.drums = d;
      q.chordStyle = 'pad';
      q.bassStyle = 'halftime';
      delete q.bassLine;
      return {
        project: q, title: 'Version half-time',
        what: 'Même tempo, mais la snare passe du 2 et 4 au 3e temps : tout semble deux fois plus lent. Accords tenus, basse half-time.',
        why: 'Le half-time donne de l’ampleur et de l’espace sans changer de BPM : c’est le secret des drops dubstep/trap et des ponts en DnB. Idéal pour un break ou un 2e drop.',
      };
    },
  },
  roles: {
    name: 'Inverser basse et lead', emoji: '🔄',
    run: (p) => {
      const q = clone(p);
      const voiced = voiceProgression(p);
      // La mélodie devient la ligne de basse (transposée dans le grave, notes longues conservées)
      const mel = p.melody.map((m, s) => (m ? { s, ...m } : null)).filter(Boolean);
      if (mel.length) {
        const avg = mel.reduce((a, m) => a + m.n, 0) / mel.length;
        const shift = Math.round((40 - avg) / 12) * 12;
        q.bassLine = new Array(MELODY_STEPS).fill(null);
        mel.forEach((m) => { q.bassLine[m.s] = { n: m.n + shift, len: m.len || 1 }; });
      } else {
        q.bassLine = new Array(MELODY_STEPS).fill(null);
        voiced.forEach((c, bar) => { if (c) q.bassLine[bar * 16] = { n: bassNote(c.rootPc), len: 8 }; });
      }
      // Le lead devient un arpège des accords (croches montantes)
      q.melody = new Array(MELODY_STEPS).fill(null);
      voiced.forEach((c, bar) => {
        if (!c) return;
        const notes = [...c.notes].sort((a, b) => a - b).map((n) => n + 12);
        for (let i = 0; i < 8; i++) q.melody[bar * 16 + i * 2] = { n: notes[i % notes.length] + (i >= notes.length ? 12 : 0), len: 2 };
      });
      return {
        project: q, title: 'Rôles inversés',
        what: 'Ta mélodie est jouée par la basse ; le lead devient un arpège des accords.',
        why: 'Changer qui porte la mélodie renouvelle complètement une idée : une basse mélodique (style disco, funk, UKG) + un arpège qui remplit le haut du spectre. Les éléments existent déjà, on les redistribue.',
      };
    },
  },
  strip: {
    name: 'Moins de notes', emoji: '✂️',
    run: (p) => {
      const q = clone(p);
      // On garde les notes sur les temps et la dernière note de chaque mesure, en les allongeant
      q.melody = new Array(MELODY_STEPS).fill(null);
      for (let bar = 0; bar < 4; bar++) {
        const notes = p.melody.slice(bar * 16, bar * 16 + 16).map((m, s) => (m ? { s, ...m } : null)).filter(Boolean);
        const keep = notes.filter((m, i) => m.s % 4 === 0 || i === notes.length - 1);
        keep.forEach((m, i) => {
          const next = keep[i + 1]?.s ?? 16;
          q.melody[bar * 16 + m.s] = { n: m.n, len: Math.max(1, Math.min(next - m.s, 6)) };
        });
      }
      const before = p.melody.filter(Boolean).length, after = q.melody.filter(Boolean).length;
      return {
        project: q, title: 'Version épurée',
        what: `Mélodie réduite de ${before} à ${after} notes : on garde les temps forts et la note finale de chaque mesure.`,
        why: 'Retirer révèle le squelette d’une mélodie : si la version épurée marche encore, ton idée est solide. Les hooks les plus forts ont souvent très peu de notes.',
      };
    },
  },
};
