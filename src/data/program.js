// Programme de 4 semaines : un thème par semaine, 6 jours de sessions + 1 mini-projet.
import { missionById } from './missions.js';
import { genreById } from './genres.js';

const EAR = {
  intervals: ['Intervalles', 'oreille'], chords: ['Couleurs d’accords', 'oreille'], progressions: ['Progressions', 'harmonie'],
  genre: ['Blind test rythmique', 'rythme'], sound: ['Quel paramètre ?', 'sound'],
};
const ear = (mode, n = 8) => ({ key: `ear:${mode}`, title: EAR[mode][0], desc: `${n} questions`, route: `#/ear?mode=${mode}&n=${n}`, skill: EAR[mode][1], min: 2 });
const g = (id) => genreById(id).name;
const beatEar = (genre) => ({ key: 'beat:ear', title: 'Recrée le beat', desc: `Groove ${g(genre)} à l’oreille`, route: `#/beat?mode=ear&genre=${genre}`, skill: 'rythme', min: 4 });
const beatC = (genre) => ({ key: 'beat:constraint', title: 'Beat sous contrainte', desc: `Groove ${g(genre)}`, route: `#/beat?mode=constraint&genre=${genre}`, skill: 'rythme', min: 4 });
const recipe = (genre) => ({ key: 'chords:recipe', title: 'Recette d’accords', desc: `Ambiance ${g(genre)}`, route: `#/chords?mode=recipe&genre=${genre}`, skill: 'harmonie', min: 4 });
const hook = (genre) => ({ key: 'melody:challenge', title: 'Hook sous contrainte', desc: `Sur une boucle ${g(genre)}`, route: `#/melody?mode=challenge&genre=${genre}`, skill: 'melodie', min: 5 });
const dict = (genre) => ({ key: 'melody:dictation', title: 'Dictée mélodique', desc: `Motif ${g(genre)}`, route: `#/melody?mode=dictation&genre=${genre}`, skill: 'oreille', min: 4 });
const match = () => ({ key: 'synth:match', title: 'Son mystère', desc: 'Retrouve les réglages', route: '#/synth?mode=match', skill: 'sound', min: 4 });
const cr = (kind, mode, genre) => ({
  key: `cr:${mode}`, title: `Call & Response ${mode === 'repeat' ? '(répète)' : '(improvise)'}`,
  desc: `${{ melody: 'Mélodie', bass: 'Basse', rhythm: 'Rythme aux pads' }[kind]} · ${g(genre)}`,
  route: `#/callresponse?kind=${kind}&mode=${mode}&genre=${genre}&auto=1`, skill: kind === 'rhythm' ? 'rythme' : kind === 'bass' ? 'oreille' : 'melodie', min: 3,
});
const arr = (challenge) => ({ key: 'arr:challenge', title: 'Défi arrangement', desc: 'Transforme ta boucle en morceau', route: `#/arrange?challenge=${challenge}`, skill: 'autonomie', min: 6 });
const analyze = () => ({ key: 'analyze', title: 'Analyse de référence', desc: 'Dissèque un morceau que tu aimes', route: '#/analyze', skill: 'oreille', min: 8 });
const mis = (id) => { const m = missionById(id); return { key: 'mission', title: m.title, desc: m.goal, route: `#/studio?mission=${id}`, skill: 'autonomie', min: m.min, missionId: id }; };

export const PROGRAM = [
  {
    theme: 'Groove', emoji: '🥁', color: '#ff5d73',
    intro: 'Cette semaine, tout part du rythme : placement, ghost notes, swing, polyrythmie. Un bon groove sauve un morceau moyen.',
    days: [
      [ear('genre', 6), beatEar('house'), mis('m-ghost')],
      [cr('rhythm', 'repeat', 'techno'), beatC('techno'), mis('m-noterepeat')],
      [ear('genre', 6), beatEar('ukg'), mis('m-groovepool')],
      [cr('rhythm', 'improv', 'afrohouse'), beatC('afrohouse'), mis('m-polyrhythm')],
      [ear('genre', 6), beatEar('dnb'), mis('m-euclid')],
      [cr('rhythm', 'repeat', 'trap'), beatC('trap'), mis('m-genreswap')],
    ],
    project: {
      title: 'Mini-projet : ton groove signature',
      goal: 'Un beat de 8 mesures qui pourrait être reconnu comme « le tien ».',
      checklist: [
        'Choisis un style de l’Atlas que tu n’as jamais produit.',
        'Programme le beat dans Live (Drum Rack) ou joue-le aux pads du MPC.',
        'Au moins 3 ghost notes et du swing sur les hats seulement.',
        'Une percussion en polyrythmie (motif de 3 sur 4) ou euclidienne.',
        'Mesure 8 : un fill ou une variation.',
        'Exporte l’audio et note dans le Carnet ce qui rend ce groove unique.',
      ],
    },
  },
  {
    theme: 'Harmonie', emoji: '🎼', color: '#ffb84d',
    intro: 'Degrés, modes, emprunts et voicings : les accords donnent l’émotion. La basse, elle, donne la direction.',
    days: [
      [ear('chords'), recipe('deephouse'), mis('m-scalemode')],
      [ear('progressions', 5), recipe('trance'), mis('m-mpcchords')],
      [ear('chords'), cr('bass', 'repeat', 'house'), mis('m-voicelead')],
      [ear('progressions', 5), recipe('lofi'), mis('m-borrow')],
      [ear('chords'), cr('bass', 'improv', 'disco'), mis('m-stacks')],
      [ear('progressions', 5), recipe('techno'), mis('m-onechord')],
    ],
    project: {
      title: 'Mini-projet : progression + basse',
      goal: 'Une boucle de 8 mesures accords + basse qui donne une émotion précise.',
      checklist: [
        'Choisis une émotion (nostalgie, euphorie, tension…) et le mode qui va avec.',
        'Écris 4 accords dont au moins un emprunté.',
        'Voicings en voice leading (notes communes gardées).',
        'Basse : fondamentale + une note de passage ou une octave.',
        'Un son Serum 2 construit depuis Init pour les accords.',
        'Fais écouter à quelqu’un sans dire l’émotion : la devine-t-il ?',
      ],
    },
  },
  {
    theme: 'Hooks', emoji: '🎵', color: '#ffe066',
    intro: 'Rythme d’abord, peu de notes, répétition et variation : la recette des mélodies qu’on retient.',
    days: [
      [ear('intervals'), hook('house'), mis('m-rhythmfirst')],
      [ear('intervals'), cr('melody', 'repeat', 'synthwave'), mis('m-callresponse')],
      [dict('trance'), hook('ukg'), mis('m-seed')],
      [ear('intervals'), cr('melody', 'improv', 'afrobeats'), mis('m-arpmpc')],
      [dict('lofi'), hook('reggaeton'), mis('m-transform')],
      [cr('melody', 'improv', 'trance'), hook('disco'), mis('i-hum')],
    ],
    project: {
      title: 'Mini-projet : un hook complet',
      goal: 'Un hook de 4 mesures qui reste en tête, posé sur ta boucle de la semaine 2.',
      checklist: [
        'Trouve le rythme sur une seule note (fredonné ou aux pads).',
        'Structure AABA ou question / réponse.',
        'Catchy-mètre ≥ 75 dans le Lab Mélodie.',
        'Joue-le au MPC Key 37 avec 3 sons différents de Serum 2, garde le meilleur.',
        'Ajoute une contre-mélodie ou une réponse à la basse.',
        'Le lendemain : est-ce que tu t’en souviens sans réécouter ?',
      ],
    },
  },
  {
    theme: 'Sound design & arrangement', emoji: '🔊', color: '#5ce1e6',
    intro: 'Du son au morceau : reconnaître un réglage à l’oreille, puis transformer une boucle en titre de 64 mesures.',
    days: [
      [ear('sound', 6), match(), mis('s-init')],
      [ear('sound', 6), match(), mis('s-wtpos')],
      [ear('sound', 6), arr('tension'), mis('s-reese')],
      [analyze(), arr('structure'), mis('i-reference')],
      [ear('sound', 6), match(), mis('s-macros')],
      [arr('subtractive'), match(), mis('a-subtract')],
    ],
    project: {
      title: 'Projet final : ton premier morceau de 64 mesures',
      goal: 'Réunir groove, harmonie, hook et sons dans un arrangement complet.',
      checklist: [
        'Reprends tes mini-projets des semaines 1 à 3 dans un même set Live.',
        'Arrangement : intro, build, drop, break, drop, outro (Lab Arrangement pour le plan).',
        'Un son resamplé et un riser maison.',
        'Automation de filtre sur au moins un build.',
        'Exporte en WAV et écoute-le sur 3 systèmes (casque, enceintes, téléphone).',
        'Compare avec ta référence de l’Analyse : qu’est-ce qui manque encore ?',
      ],
    },
  },
];

export const PROGRAM_DAYS = PROGRAM.length * 7;

/** Index plat d'un jour → {week, day, isProject}. */
export function dayInfo(i) {
  const week = Math.floor(i / 7), day = i % 7;
  return { week, day, isProject: day === 6, w: PROGRAM[week] };
}
