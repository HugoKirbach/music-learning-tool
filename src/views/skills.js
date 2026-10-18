// Arbre de compétences : une vue d'ensemble qui relie tous les modules de l'app.
import { el, header } from '../ui.js';
import { getState } from '../store.js';
import { BRANCHES, SKILL_TREE, skillStates, nextSkills } from '../core/pedagogy.js';

export function render(root) {
  const s = getState();
  const st = skillStates(s);
  const acquired = Object.values(st).filter((x) => x.state === 'acquired').length;
  const next = nextSkills(s, 3);
  const node = (n) => {
    const x = st[n.id];
    return el('details.skill-node.' + x.state, { style: { '--c': BRANCHES.find((b) => b.id === n.branch).color } },
      el('summary',
        el('span.sn-emoji', x.state === 'locked' ? '🔒' : n.emoji),
        el('span.sn-txt', el('b', n.name), el('small', n.desc)),
        el('span.sn-state', x.state === 'acquired' ? '✅' : `${x.count}/${x.need}`)),
      x.state === 'locked' ? el('p.small.muted', `Débloquée après : ${n.requires.map((r) => SKILL_TREE.find((y) => y.id === r).name).join(', ')}.`) : null,
      el('p.small.muted', x.state === 'acquired' ? 'Compétence acquise 🎉 Continue à la pratiquer :' : `Réunis ${x.need} preuve${x.need > 1 ? 's' : ''} parmi :`),
      el('ul.sn-proofs', n.proofs.map((p, i) => el('li' + (x.got[i] ? '.ok' : ''), x.got[i] ? '✓ ' : '○ ', el('a', { href: p.route }, p.label)))));
  };
  root.append(
    header('🌳 Arbre de compétences', 'Tous les modules de l’app nourrissent les mêmes compétences. Ouvre une case pour voir comment la valider.', '#/profile'),
    el('div.card.glow',
      el('div.row.between', el('b', `${acquired}/${SKILL_TREE.length} compétences acquises`), el('a.btn.small', { href: '#/placement' }, '🧪 Test de la semaine')),
      el('div.bar', el('div.bar-fill', { style: { width: `${Math.round((acquired / SKILL_TREE.length) * 100)}%` } })),
      next.length ? el('p.small', '🎯 Prochaines étapes : ', ...next.flatMap((x, i) => [i ? ' · ' : '', el('b', `${x.node.emoji} ${x.node.name}`)])) : null),
    el('div.skill-tree', BRANCHES.map((b) => el('div.skill-branch',
      el('h3.fam-title', `${b.emoji} ${b.name}`),
      SKILL_TREE.filter((n) => n.branch === b.id).map(node)))),
  );
}
