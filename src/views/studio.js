import { el, card, header, segmented, finishExercise, toast, hintBox } from '../ui.js';
import { getState, update } from '../store.js';
import { MISSIONS, TOOLS, CATEGORIES, DICE, missionById } from '../data/missions.js';
import { GENRES } from '../data/genres.js';
import { NOTE_NAMES, SCALES, HEPTATONIC } from '../core/theory.js';

export function render(root, params) {
  if (params.mission) return missionView(root, missionById(params.mission));
  if (params.dice) return diceView(root);
  return listView(root, params);
}

function toolTags(m) {
  return m.tools.map((t) => el('span.tag.tool-' + t, `${TOOLS[t].emoji} ${TOOLS[t].short}`));
}

function listView(root, params) {
  let tool = params.tool || 'all';
  let cat = params.cat || 'all';
  const s = getState();
  const list = el('div');
  const draw = () => {
    const items = MISSIONS.filter((m) => (tool === 'all' || m.tools.includes(tool)) && (cat === 'all' || m.cat === cat));
    list.replaceChildren(...items.map((m) => {
      const done = s.missions[m.id] || 0;
      return el('a.tile', { href: `#/studio?mission=${m.id}`, style: { marginBottom: '8px' } },
        el('div.row.between', el('b', `${CATEGORIES[m.cat].emoji} ${m.title}`), el('span.small.muted', `${m.min} min · ${'★'.repeat(m.level)}`)),
        el('span', m.goal), el('div', toolTags(m), done ? el('span.tag', `✓ ×${done}`) : null));
    }));
  };
  const later = (s.later || []).map(missionById).filter(Boolean);
  root.append(
    header('Studio', 'Missions de 5-10 min à faire sur tes vrais outils. C’est ici que tu deviens autonome.', null),
    el('div.grid2', { style: { marginBottom: '12px' } },
      el('a.tile', { href: '#/studio?dice=1' }, el('div.tile-emoji', '🎲'), el('b', 'Dé à idées'), el('span', 'Point de départ + contrainte + twist : impossible de rester bloqué')),
      el('a.tile', { href: '#/analyze' }, el('div.tile-emoji', '🎧'), el('b', 'Analyse de référence'), el('span', 'Importe un morceau et dissèque-le')),
      el('a.tile', { href: `#/studio?mission=${MISSIONS[Math.floor(Math.random() * MISSIONS.length)].id}` }, el('div.tile-emoji', '🎯'), el('b', 'Mission surprise'), el('span', 'Laisse le hasard choisir'))),
    later.length ? card(el('h3', `⏳ Plus tard (${later.length})`), el('ul.clean', later.map((m) => el('li', el('a', { href: `#/studio?mission=${m.id}` }, m.title))))) : null,
    el('div.ctrl-row', segmented([{ value: 'all', label: 'Tous' }, ...Object.entries(TOOLS).map(([k, t]) => ({ value: k, label: `${t.emoji} ${t.short}` }))], tool, (v) => { tool = v; draw(); })),
    el('div.ctrl-row', segmented([{ value: 'all', label: 'Tout' }, ...Object.entries(CATEGORIES).map(([k, c]) => ({ value: k, label: `${c.emoji} ${c.name}` }))], cat, (v) => { cat = v; draw(); })),
    list,
  );
  draw();
}

function timerEl(minutes) {
  let left = minutes * 60, iv = null;
  const out = el('div.timer', fmt(left));
  const btn = el('button.btn', {
    onclick: () => {
      if (iv) { clearInterval(iv); iv = null; btn.textContent = '▶ Reprendre'; return; }
      btn.textContent = '⏸ Pause';
      iv = setInterval(() => {
        left--;
        out.textContent = fmt(Math.max(0, left));
        if (left <= 0) { clearInterval(iv); iv = null; btn.textContent = '✓ Temps écoulé'; toast('⏰ Temps écoulé ! Sauvegarde ce que tu as, même imparfait.', 'good', 5000); navigator.vibrate?.(300); }
      }, 1000);
    },
  }, `▶ Timer ${minutes} min`);
  return { node: el('div', out, el('div.row.center', btn)), stop: () => iv && clearInterval(iv) };
}

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function missionView(root, m) {
  if (!m) { location.hash = '#/studio'; return; }
  const checked = new Set();
  const timer = timerEl(m.min);
  const reflect = el('textarea', { placeholder: 'Qu’as-tu découvert ? Quel réglage / quelle idée garder ? (facultatif, +5 XP)' });
  const steps = el('ol.mission-steps', m.steps.map((s, i) => {
    const li = el('li', { onclick: () => { checked.has(i) ? checked.delete(i) : checked.add(i); li.classList.toggle('checked'); } }, s);
    return li;
  }));
  const inLater = (getState().later || []).includes(m.id);
  root.append(
    header(m.title, `${CATEGORIES[m.cat].emoji} ${CATEGORIES[m.cat].name} · ${m.min} min · ${'★'.repeat(m.level)}`, '#/studio'),
    card(el('div', toolTags(m)), el('p', el('b', '🎯 Objectif : '), m.goal), steps, el('p.small.muted', 'Touche une étape pour la cocher.'),
      m.id === 'i-reference' ? el('a.btn.small.primary', { href: '#/analyze' }, '🎧 Ouvrir l’outil d’analyse') : null),
    card(timer.node),
    hintBox(el('div', el('p', el('b', 'Pourquoi ça marche : '), m.why))),
    card(el('h3', '🧭 Pour aller plus loin (en autonomie)'), el('p', m.next)),
    card(reflect,
      el('div.row.gap.wrap', { style: { marginTop: '8px' } },
        el('button.btn', {
          onclick: () => {
            update((s) => { if (!s.later.includes(m.id)) s.later.push(m.id); });
            const sess = getState().session;
            if (sess && !sess.finished && sess.steps[sess.idx]?.key === 'mission') {
              finishExercise({ key: 'mission:later', title: 'Mission ajoutée à « Plus tard »', xp: 8, skill: 'autonomie',
                lesson: 'Bloque un créneau au studio pour la faire : les missions te rapportent bien plus d’XP une fois réalisées.' });
            } else toast(inLater ? 'Déjà dans ta liste' : 'Ajoutée à « Plus tard » ⏳');
          },
        }, '⏳ Plus tard'),
        el('button.btn.primary', {
          onclick: () => {
            timer.stop();
            const txt = reflect.value.trim();
            update((s) => {
              s.missions[m.id] = (s.missions[m.id] || 0) + 1;
              s.later = s.later.filter((x) => x !== m.id);
              if (txt) s.notebook.unshift({ id: Date.now(), type: 'note', title: `Mission : ${m.title}`, note: txt, date: Date.now() });
            });
            finishExercise({ key: 'mission', title: m.title, xp: 30 + m.level * 10 + (txt ? 5 : 0), skill: 'autonomie', success: true,
              lesson: m.why, transfer: m.next });
          },
        }, '✓ Mission accomplie'),
      )),
  );
  return () => timer.stop();
}

function diceView(root) {
  const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const custom = getState().customDice || [];
  const roll = () => {
    const g = r(GENRES);
    return {
      genre: g, start: r(DICE.start), constraint: r([...DICE.constraint, ...custom]),
      twist: r(DICE.twist).replace('{genre}', r(GENRES.filter((x) => x !== g)).name),
      key: `${NOTE_NAMES[Math.floor(Math.random() * 12)]} ${SCALES[r(HEPTATONIC)].name}`,
      bpm: g.bpm + Math.round((Math.random() - 0.5) * 10),
    };
  };
  let d = roll();
  const dice = el('div.dice');
  const die = (label, val, key) => el('div.die', { onclick: () => { const n = roll(); d[key] = n[key]; if (key === 'genre') d.bpm = n.bpm; draw(key); } },
    el('small', label + ' — touche pour relancer'), el('b', val));
  const draw = (rolled) => {
    dice.replaceChildren(
      die('Style', `${d.genre.emoji} ${d.genre.name} · ${d.bpm} BPM`, 'genre'),
      die('Tonalité', d.key, 'key'),
      die('Point de départ', d.start, 'start'),
      die('Contrainte', d.constraint, 'constraint'),
      die('Twist', d.twist, 'twist'),
    );
    [...dice.children].forEach((c, i) => { if (!rolled || ['genre', 'key', 'start', 'constraint', 'twist'][i] === rolled) { c.classList.remove('roll'); void c.offsetWidth; c.classList.add('roll'); } });
  };
  draw();
  const timer = timerEl(10);
  const own = el('input', { type: 'text', placeholder: 'Ta propre contrainte (ex. « que des sons de cuisine »)' });
  root.append(
    header('🎲 Dé à idées', 'Une combinaison aléatoire pour lancer une idée dans Live 12 / MPC / Serum 2', '#/studio'),
    card(dice, el('div.row.gap.wrap', { style: { marginTop: '10px' } },
      el('button.btn', { onclick: () => { d = roll(); draw(); } }, '🎲 Tout relancer'),
      el('a.btn', { href: `#/beat?genre=${d.genre.id}`, onclick: (e) => { e.currentTarget.href = `#/beat?genre=${d.genre.id}`; } }, '🥁 Esquisser dans l’app'))),
    card(timer.node, el('p.small.muted', { style: { textAlign: 'center' } }, '10 minutes, pas une de plus. Imparfait mais fini > parfait mais abandonné.')),
    card(el('h3', '🧭 Crée tes contraintes'), el('p.small.muted', 'Savoir s’imposer ses propres règles, c’est la clé de l’autonomie créative.'),
      el('div.row.gap', own, el('button.btn', {
        onclick: () => {
          const v = own.value.trim();
          if (v.length < 4) return;
          update((s) => { s.customDice = [...(s.customDice || []), v]; });
          own.value = '';
          toast('Contrainte ajoutée au dé ✨', 'good');
        },
      }, 'Ajouter')),
      custom.length ? el('p.small.muted', `${custom.length} contrainte(s) perso dans le dé.`) : null),
    el('button.btn.primary.wide', {
      onclick: () => {
        timer.stop();
        update((s) => {
          s.notebook.unshift({ id: Date.now(), type: 'note', title: `Défi : ${d.genre.name}`, note: `Départ : ${d.start}\nContrainte : ${d.constraint}\nTwist : ${d.twist}\n${d.key} · ${d.bpm} BPM`, date: Date.now(), genre: d.genre.id });
        });
        finishExercise({ key: 'dice', title: 'Défi relevé !', xp: 45, skill: 'autonomie', genre: d.genre.id, success: true,
          lesson: 'La contrainte force des choix inhabituels. Plus tu en relèves, plus tu sauras t’en inventer quand tu bloques.',
          transfer: 'Sauvegarde ton projet Live avec le nom du défi. Dimanche, réécoute les défis de la semaine et développe le meilleur.' });
      },
    }, '✓ J’ai relevé le défi'),
  );
  return () => timer.stop();
}
