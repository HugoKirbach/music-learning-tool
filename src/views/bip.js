// 🤖 La page de Bip : lui parler, voir les défis du jour, dépenser ses boulons dans sa garde-robe.
import { el, header, toast, confetti, showBadges } from '../ui.js';
import { getState, buyBipItem, wearBip, tapBip } from '../store.js';
import { mascot } from '../learn/kit.js';
import { bipBubble, bipChat, tipOfDay } from '../learn/bip.js';
import { dailyCard } from './dailycard.js';
import { BIP_ITEMS, ownsItem, bipLook, boltsBalance, boltsEarned, challengeTotals, BOLT, TIER_BOLTS } from '../core/challenges.js';
import { sfx } from '../learn/jam.js';

export function render(root) {
  const paint = (say = null) => {
    const s = getState();
    const look = bipLook(s);
    const bal = boltsBalance(s);
    const tot = challengeTotals(s);
    const days = Math.max(1, Math.round((Date.now() - (s.createdAt || Date.now())) / 86400000) + 1);
    const talk = bipBubble({
      text: say || `💡 Astuce du jour : ${tipOfDay()}`, sub: 'Touche-moi pour une autre astuce', mood: say ? 'party' : 'happy', size: 132, anim: say ? 'jump' : '', cls: '.big',
      onTap: (api) => { showBadges(tapBip()); api.say(bipChat(), Math.random() < 0.3 ? 'wow' : 'happy', Math.random() < 0.4 ? 'jump' : 'hop'); },
    });
    const tile = (it) => {
      const own = ownsItem(s, it.id);
      const on = look[it.kind] === it.id;
      const preview = mascot('happy', 62, { look: it.kind === 'skin' ? { skin: it.id, acc: look.acc } : { skin: look.skin, acc: it.id } });
      const act = on ? el('span.bw-on', '✓ Porté')
        : own ? el('button.btn3d.bw-btn', { type: 'button', onclick: () => { wearBip({ [it.kind]: it.id }); paint(it.id === 'none' ? 'Au naturel !' : `${it.name} : ça me va bien, non ?`); } }, 'Porter')
          : it.unlock ? el('span.bw-lock', { title: it.how }, `🔒 ${it.how}`)
            : el('button.btn3d.primary.bw-btn', { type: 'button', disabled: bal < it.price, title: bal < it.price ? `Il te manque ${it.price - bal} boulons` : `Acheter pour ${it.price} boulons`, onclick: () => {
              if (!buyBipItem(it.id)) { toast(`Il te manque ${it.price - bal} ${BOLT}`, 'bad'); return; }
              wearBip({ [it.kind]: it.id });
              sfx('end'); confetti();
              paint(`Oh ! ${it.name} ! Merci, j’adore ! 🎉`);
            } }, `${it.price} ${BOLT}`);
      return el('div.bw-item' + (on ? '.on' : '') + (own ? '' : '.locked'), el('div.bw-prev', preview), el('b', `${it.emoji} ${it.name}`), act);
    };
    root.replaceChildren(
      header('🤖 Bip', 'Ton compagnon de studio : parle-lui, relève ses défis, habille-le.', '#/learn'),
      el('section.bip-hero', talk.node,
        el('div.bip-stats',
          el('div.bip-stat.bolts', el('b', `${BOLT} ${bal}`), el('small', 'boulons')),
          el('div.bip-stat', el('b', String(tot.challenges)), el('small', tot.challenges > 1 ? 'défis réussis' : 'défi réussi')),
          el('div.bip-stat', el('b', String(tot.chests)), el('small', tot.chests > 1 ? 'coffres ouverts' : 'coffre ouvert')),
          el('div.bip-stat', el('b', String(days)), el('small', days > 1 ? 'jours ensemble' : 'jour ensemble')))),
      dailyCard(),
      el('section.card.bip-wardrobe',
        el('div.row.between', el('h3', '👕 La garde-robe de Bip'), el('span.small.muted', `${boltsEarned(s)} ${BOLT} gagnés en tout`)),
        el('p.small.muted', `Les boulons se gagnent avec les défis du jour (10 à 25), le coffre du jour (30) et chaque succès (bronze ${TIER_BOLTS.bronze}, argent ${TIER_BOLTS.silver}, or ${TIER_BOLTS.gold}). Certaines pièces se débloquent en progressant.`),
        el('h4.bw-title', 'Couleurs'),
        el('div.bw-grid', BIP_ITEMS.filter((x) => x.kind === 'skin').map(tile)),
        el('h4.bw-title', 'Accessoires'),
        el('div.bw-grid', BIP_ITEMS.filter((x) => x.kind === 'acc').map(tile))),
      el('a.learn-extras', { href: '#/collection' }, el('span', { 'aria-hidden': 'true' }, '🏅'), el('div', el('b', 'Tes succès'), el('small', 'Chaque succès rapporte des boulons et une carte à collectionner.')), el('span', { 'aria-hidden': 'true' }, '›')));
  };
  paint();
}
