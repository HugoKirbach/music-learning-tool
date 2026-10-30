// Recherche rapide (Ctrl+K, « / » ou 🔍) : écrans, styles, missions studio, niveaux de jeux et réglages.
import { el, modal } from './ui.js';
import { getState } from './store.js';
import { TABS, SCREENS, screenById } from './catalog.js';
import { search } from './core/search.js';

const SETTINGS = [
  ['account', '👤', 'Compte & synchro', 'connexion google e-mail téléphone pc'],
  ['general', '🎚️', 'Thème, volume, objectif du jour', 'clair sombre animations indices gaucher'],
  ['midi', '🎹', 'Clavier MIDI (MPC Key 37)', 'brancher usb testeur'],
  ['audio', '🔊', 'Moteur audio', 'latence stable performance diagnostic'],
  ['live', '🎛️', 'Sortie MIDI vers Live', 'ableton horloge tempo loopmidi iac'],
  ['reminders', '🔔', 'Rappels', 'notification agenda'],
  ['backup', '💾', 'Sauvegarde en fichier', 'exporter importer réinitialiser'],
];

async function buildIndex() {
  const [{ GENRES }, { MISSIONS }, { LEVELS }, { PAD_LEVELS }, { PATHS }] = await Promise.all([
    import('./data/genres.js'), import('./data/missions.js'), import('./data/rush.js'), import('./data/pads.js'), import('./data/paths.js')]);
  return [
    ...TABS.map((t) => ({ name: t.label, emoji: t.icon, href: '#/' + t.id, group: 'Onglet', boost: 6 })),
    ...SCREENS.filter((x) => !TABS.some((t) => t.id === x.id)).map((x) => ({ ...x, group: x.desc ? 'Atelier' : 'Écran', boost: 4 })),
    { name: 'Jeux sans le son', emoji: '🔇', href: '#/club?silent=1', desc: 'Nuit au club en mode silencieux', keys: 'silencieux muet métro', group: 'Jeu', boost: 4 },
    { name: 'Dé à idées', emoji: '🎲', href: '#/studio?dice=1', desc: 'Une contrainte au hasard', keys: 'inspiration hasard', group: 'Studio', boost: 3 },
    ...SETTINGS.map(([id, emoji, name, keys]) => ({ name, emoji, keys, href: `#/settings?sec=${id}`, group: 'Réglage', boost: 2 })),
    ...GENRES.map((g) => ({ name: g.name, emoji: g.emoji, desc: `${g.family} · ${g.bpm} BPM`, keys: 'style genre atlas', href: `#/atlas?g=${g.id}`, group: 'Style', boost: 3 })),
    ...Object.entries(PATHS).map(([id, p]) => ({ name: `Parcours ${p.name}`, emoji: '🎓', keys: 'parcours étapes', href: `#/path?g=${id}`, group: 'Parcours', boost: 2 })),
    ...MISSIONS.map((m) => ({ name: m.title, emoji: '🎯', desc: m.goal, keys: `mission ${m.tools.join(' ')}`, href: `#/studio?mission=${m.id}`, group: 'Mission studio' })),
    ...LEVELS.map((l) => ({ name: l.title, emoji: l.emoji, keys: 'piano rush niveau', href: `#/rush?level=${l.id}`, group: 'Piano Rush' })),
    ...PAD_LEVELS.map((l) => ({ name: l.title, emoji: l.emoji, keys: 'pad rush niveau', href: `#/pads?level=${l.id}`, group: 'Pad Rush' })),
  ];
}

let closeSearch = null;
export async function openSearch() {
  if (closeSearch && document.querySelector('.search-box')) return;
  const index = await buildIndex();
  const input = el('input.search-input', { type: 'search', placeholder: 'Un atelier, un style, une mission, un niveau…', 'aria-label': 'Rechercher', autocomplete: 'off', enterkeyhint: 'go' });
  const list = el('div.search-list', { role: 'listbox', 'aria-label': 'Résultats' });
  let results = [], sel = 0;
  const go = (it) => { closeSearch?.(); location.hash = it.href; };
  const suggestions = () => {
    const recent = (getState().recent || []).map(screenById).filter(Boolean).slice(0, 4).map((x) => ({ ...x, group: 'Récent' }));
    return [...recent, ...index.filter((x) => x.group === 'Onglet')];
  };
  const paint = () => {
    const q = input.value.trim();
    results = q ? search(index, q, 14) : suggestions();
    sel = Math.min(sel, Math.max(0, results.length - 1));
    list.replaceChildren(...(results.length ? results.map((it, i) => el('a.search-item' + (i === sel ? '.on' : ''), {
      href: it.href, role: 'option', 'aria-selected': String(i === sel), onclick: (e) => { e.preventDefault(); go(it); },
    }, el('span.search-emoji', { 'aria-hidden': 'true' }, it.emoji || '•'),
    el('span.search-text', el('b', it.name), it.desc ? el('span', it.desc) : null),
    el('span.search-group', it.group))) : [el('p.small.muted', 'Rien trouvé. Essaie « basse », « house », « serum », « accords »…')]));
    list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  };
  input.addEventListener('input', () => { sel = 0; paint(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
    else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); go(results[sel]); }
  });
  closeSearch = modal(el('div.search-box',
    el('div.search-head', el('span', { 'aria-hidden': 'true' }, '🔍'), input),
    list,
    el('p.small.muted.search-tip', 'Astuce PC : Ctrl + K ou « / » ouvre la recherche partout, ↑ ↓ puis Entrée.')), { onClose: () => { closeSearch = null; } });
  paint();
  requestAnimationFrame(() => input.focus());
}
