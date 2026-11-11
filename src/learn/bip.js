// 🤖 Bip, le compagnon : ce qu'il dit (selon le moment, ta série, tes erreurs) et ses astuces de production.
// Les textes sont tirés au hasard dans de petites listes pour ne pas se répéter.
import { el } from '../ui.js';
import { mascot } from './kit.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];

/** Astuces de Bip : courtes, concrètes, à essayer dans Live. */
export const BIP_TIPS = [
  'Un kick et une basse qui jouent en même temps se battent : décale la basse, ou mets un sidechain.',
  'Baisse tout de 6 dB avant de mixer : tu gardes de la marge et tu entends mieux.',
  'Un bon groove tient souvent à ce que tu enlèves, pas à ce que tu ajoutes.',
  'Ctrl + D duplique. Ctrl + J fusionne. Ctrl + E coupe. Trois raccourcis, la moitié du travail.',
  'Les ghost notes à faible vélocité font danser un beat sans le charger.',
  'Coupe les graves (passe-haut) de tout ce qui n’est ni le kick ni la basse.',
  'Change de note sur la basse en même temps que l’accord : c’est la fondamentale qui tient le morceau.',
  'Une mélodie qu’on retient : peu de notes, un rythme marqué, et une répétition.',
  'Écoute ta boucle très bas : ce que tu entends encore, c’est l’essentiel.',
  'Le filtre passe-bas qui s’ouvre sur 8 mesures : la montée la plus simple du monde.',
  'Attack longue = pad qui gonfle. Attack courte, sustain à zéro = pluck.',
  'Deux oscillateurs légèrement désaccordés : le son devient large d’un coup.',
  'Renverse tes accords pour que les notes bougent peu de l’un à l’autre.',
  'Termine avant de perfectionner : une boucle finie vaut dix idées en cours.',
  'Le métronome n’est pas une punition : enregistre avec, quantifie après.',
  'Capture MIDI (Maj + Ctrl + C) rattrape ce que tu viens de jouer sans avoir enregistré.',
  'Tab bascule entre Session et Arrangement : fais-le sans y penser.',
  'Un clap sur 2 et 4, un hat à contretemps : tu as déjà une house.',
  'La résonance fait siffler le filtre : un peu donne du caractère, beaucoup donne de l’acid.',
  'Nomme et colore tes pistes : dans une semaine, tu te remercieras.',
  'Une référence dans ton projet (un morceau que tu aimes) te remet les oreilles à zéro.',
  'Le swing, c’est décaler les doubles croches paires : essaie 55 %, puis 60 %.',
  'Un LFO synchronisé au tempo sur le cutoff : le son bouge avec le morceau.',
  'Fais des pauses : dix minutes loin de l’écran et les défauts sautent aux oreilles.',
  'Pour un break, enlève le kick : son retour fait tout le travail.',
  'La gamme mineure pentatonique : cinq notes, zéro fausse note.',
  'Group (Ctrl + G) réunit plusieurs pistes : un seul fader pour toute la batterie.',
  'Monte le volume du son que tu règles ? Non : baisse les autres.',
  'Freeze une piste gourmande pour soulager ton ordinateur.',
  'Exporte souvent une version, même pas finie : tu entends ta progression.',
];

const HELLO = {
  morning: ['Bien dormi ? On s’échauffe les oreilles.', 'Bonjour ! Le studio est ouvert.', 'Café, casque, et c’est parti.'],
  day: ['Content de te voir !', 'On reprend là où on s’est arrêtés ?', 'Prêt pour une leçon ?'],
  evening: ['Bonsoir ! Une leçon avant la nuit ?', 'Le soir, c’est l’heure des bonnes idées.', 'Session du soir, bonsoir.'],
  night: ['Tu produis la nuit, toi aussi ?', 'Chut… on fait de la musique à voix basse.'],
};
const hour = () => { const h = new Date().getHours(); return h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : h < 23 ? 'evening' : 'night'; };

/** Ce que Bip dit en haut du parcours. ctx : { first, goalPct, goal, xp, risk, streak, lit, due, chDone, chLeft } */
export function bipGreeting(ctx) {
  if (ctx.first) return 'Salut, moi c’est Bip ! Ta première leçon dure 3 minutes.';
  if (ctx.goalPct >= 100 && ctx.chLeft === 0) return pick(['Objectif atteint et coffre ouvert : journée parfaite ! 🎉', 'Tout est fait pour aujourd’hui. Je suis fier de toi ! 🎉']);
  if (ctx.goalPct >= 100) return pick(['Objectif du jour atteint ! 🎉', `Objectif atteint ! Il reste ${ctx.chLeft} défi${ctx.chLeft > 1 ? 's' : ''} pour le coffre.`]);
  if (ctx.risk) return `Ta série de ${ctx.streak} jours t’attend : une leçon et elle continue.`;
  if (ctx.xp > 0) return pick([`Encore ${ctx.goal - ctx.xp} XP pour ton objectif du jour.`, `Bien parti ! Plus que ${ctx.goal - ctx.xp} XP.`]);
  if (ctx.due) return `${ctx.due} notion${ctx.due > 1 ? 's' : ''} à réviser, et la suite du chemin t’attend.`;
  if (ctx.streak >= 3) return `${ctx.streak} jours d’affilée ! ${pick(HELLO[hour()])}`;
  return pick(HELLO[hour()]);
}

/** Réaction dans le bandeau de la leçon. ctx : { ok, combo, wasWrong (se rattrape), retry, last, hearts } */
export function bipReact(ctx) {
  if (ctx.ok) {
    if (ctx.combo >= 10) return pick(['Inarrêtable !', 'Dix d’affilée, tu me fais chauffer les circuits !', 'Quel festival !']);
    if (ctx.combo >= 5) return pick(['En feu !', 'Tu enchaînes !', 'Rien ne t’arrête !']);
    if (ctx.combo >= 3) return pick(['Belle série !', 'Ça déroule !', 'Trois d’affilée !']);
    if (ctx.retry) return pick(['Voilà, c’est rentré !', 'Cette fois, c’est la bonne !', 'Tu vois, tu l’avais.']);
    if (ctx.wasWrong) return pick(['Et c’est reparti !', 'Belle reprise !', 'On repart du bon pied.']);
    return pick(['Excellent !', 'Bravo !', 'Parfait !', 'Bien joué !', 'Exactement !', 'Super !', 'Tu gères !', 'Pile ça !']);
  }
  if (ctx.hearts === 0) return 'Aïe, plus de cœurs…';
  if (ctx.hearts != null) return pick(['Attention aux cœurs…', 'Un cœur en moins, on se concentre.']);
  if (ctx.retry) return pick(['On la reverra, promis.', 'Elle résiste, celle-là.']);
  return pick(['Pas tout à fait…', 'Presque !', 'Pas encore…', 'Raté, mais c’est comme ça qu’on apprend.', 'Oups ! On la revoit à la fin.']);
}

/** Mot de Bip sur l'écran de fin. */
export function bipEnding({ kind, perfect, acc, layers, failed, incomplete }) {
  if (failed) return pick(['Ce contrôle est costaud. Révise deux leçons et reviens, je t’attends.', 'Pas grave : on retente quand tu veux.']);
  if (incomplete) return 'Reviens quand tu pourras mettre le son, je garde ta place.';
  if (kind === 'checkpoint') return pick(['Une unité de plus ! Tu avances comme un pro.', 'Contrôle réussi : la suite est ouverte !']);
  if (kind === 'jump') return 'Tu connaissais déjà tout ça : on file plus loin !';
  if (perfect && layers >= 6) return pick(['Sans faute ET morceau complet : écoute-moi ça !', 'Parfait. Ce morceau, c’est le tien.']);
  if (perfect) return pick(['Zéro erreur. Chapeau !', 'Sans faute : tu maîtrises.']);
  if (acc >= 80) return pick(['Solide ! Encore une ?', 'Très bien joué. Ton morceau prend forme.']);
  return pick(['C’est en se trompant qu’on retient. Bien joué d’être allé au bout.', 'Leçon bouclée ! Les notions difficiles reviendront en révision.']);
}

/** Quand on touche Bip : une astuce, un encouragement ou une blague de studio. */
export function bipChat() {
  return Math.random() < 0.7 ? `💡 ${pick(BIP_TIPS)}` : pick([
    'Bip bip ! Ça chatouille.', 'Tu sais que je suis un petit synthé ? Mon antenne capte le tempo.', 'Je rêve d’un filtre passe-bas rien qu’à moi.',
    'Mon morceau préféré ? Celui que tu vas finir.', 'J’ai 2 oscillateurs et un grand cœur.', 'Si tu me mets un casque, je promets de mixer moins fort.',
    'Je compte en mesures : 1, 2, 3, 4… encore !', 'Un boulon pour tes pensées ? 🔩',
  ]);
}
/** Astuce du jour (la même toute la journée). */
export const tipOfDay = (d = new Date()) => BIP_TIPS[Math.floor(d.getTime() / 86400000) % BIP_TIPS.length];

/** Bip avec sa bulle. Renvoie { node, say(text, mood, anim), bip } ; onTap(api) quand on le touche. */
export function bipBubble({ text = '', sub = null, mood = 'happy', size = 72, anim = '', onTap = null, cls = '' } = {}) {
  const p = el('p', text);
  const small = sub ? el('small', sub) : null;
  const holder = el(onTap ? 'button.bip-tap' : 'div.bip-tap', onTap ? { type: 'button', 'aria-label': 'Parler à Bip', title: 'Touche Bip : il a toujours quelque chose à dire' } : {}, mascot(mood, size, { anim }));
  const bubble = el('div.bip-say', { 'aria-live': 'polite' }, p, small);
  const api = {
    node: el('div.bip-talk' + cls, holder, bubble),
    say(t, m = mood, a = 'hop') {
      p.textContent = t;
      holder.replaceChildren(mascot(m, size, { anim: a }));
      bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    },
  };
  if (onTap) holder.addEventListener('click', (e) => { e.stopPropagation(); onTap(api); });
  return api;
}
