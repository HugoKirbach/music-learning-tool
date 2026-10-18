// Petits utilitaires d'interface (sans framework).
import { recordExercise, getState } from './store.js';
import { titleFor, hintsByDefault, levelFromXp } from './core/progress.js';
import { buildMidi } from './core/midi.js';
import { ensureAudio } from './core/audio.js';

// append / prepend / replaceChildren natifs affichent « null » : on ignore null/false pour écrire `cond ? node : null`.
for (const m of ['append', 'prepend', 'replaceChildren']) {
  const orig = Element.prototype[m];
  Element.prototype[m] = function (...nodes) { return orig.apply(this, nodes.filter((n) => n != null && n !== false)); };
}

/** Hyperscript minimaliste : el('button.btn.primary', {onclick}, 'Texte', child…) */
export function el(spec, props = {}, ...children) {
  if (props == null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  const [tag, ...classes] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? node.style.setProperty(sk, sv) : (node.style[sk] = sv);
    }
    else if (k === 'class') node.className += ' ' + v;
    else if (k === 'html') node.innerHTML = v;
    else if (k in node && typeof v !== 'string') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  // Accessibilité : un bouton ou lien qui n'a qu'une infobulle reçoit le même texte pour les lecteurs d'écran
  if (props && props.title && !props['aria-label'] && (tag === 'button' || tag === 'a')) node.setAttribute('aria-label', props.title);
  append(node, children);
  return node;
}

function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function toast(msg, kind = 'info', ms = 2600) {
  const host = document.getElementById('toasts');
  const t = el('div.toast.' + kind, msg);
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

/** Fenêtre modale. Renvoie une fonction close(). */
export function modal(content, { onClose, dismissable = true } = {}) {
  const host = document.getElementById('modal-root');
  const box = el('div.modal-card', content);
  const back = el('div.modal-back', box);
  const close = () => { back.classList.remove('show'); setTimeout(() => back.remove(), 200); onClose?.(); };
  if (dismissable) back.addEventListener('click', (e) => { if (e.target === back) close(); });
  host.appendChild(back);
  requestAnimationFrame(() => back.classList.add('show'));
  return close;
}

export function segmented(options, value, onChange, cls = '') {
  const wrap = el('div.seg' + (cls ? '.' + cls : ''));
  const render = (v) => {
    clear(wrap);
    for (const o of options) {
      const opt = typeof o === 'string' ? { value: o, label: o } : o;
      wrap.appendChild(el('button' + (opt.value === v ? '.on' : ''), {
        type: 'button',
        onclick: () => { render(opt.value); onChange(opt.value); },
        title: opt.title || '',
      }, opt.label));
    }
  };
  render(value);
  return wrap;
}

export function select(options, value, onChange) {
  const s = el('select', { onchange: (e) => onChange(e.target.value) });
  for (const o of options) {
    const opt = typeof o === 'string' ? { value: o, label: o } : o;
    s.appendChild(el('option', { value: opt.value, selected: String(opt.value) === String(value) }, opt.label));
  }
  return s;
}

export function slider({ label, min, max, step = 1, value, format = (v) => v, onInput }) {
  const out = el('span.slider-val', format(value));
  const input = el('input', {
    type: 'range', min, max, step, value,
    oninput: (e) => { const v = parseFloat(e.target.value); out.textContent = format(v); onInput(v); },
  });
  return el('label.slider', el('span.slider-label', label), input, out);
}

export function download(filename, data, mime = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

export function downloadMidi(filename, song) {
  const bytes = buildMidi(song);
  download(filename.endsWith('.mid') ? filename : filename + '.mid', bytes, 'audio/midi');
  import('./store.js').then(({ update, checkBadges }) => {
    update((s) => { s.stats.exports++; });
    showBadges(checkBadges());
  });
  toast('MIDI exporté : glisse-le dans Ableton ou le MPC 🎹', 'good');
}

export function showsHints() {
  const s = getState();
  return hintsByDefault(levelFromXp(s.xp).level, s.settings.hints);
}

/** Bloc « indice » : visible d'office pour les débutants, sinon à débloquer (coût en XP). */
export function hintBox(text, onUse) {
  const body = el('div.hint-body', typeof text === 'string' ? el('p', text) : text);
  if (showsHints()) return el('div.hint.open', el('div.hint-title', '💡 Méthode'), body);
  const box = el('div.hint');
  const btn = el('button.btn.ghost.small', {
    onclick: () => { box.classList.add('open'); btn.remove(); box.appendChild(body); onUse?.(); },
  }, '💡 Voir un indice (−20 % XP)');
  box.appendChild(btn);
  return box;
}

export function showBadges(badges) {
  badges.forEach((b, i) => setTimeout(() => toast(`${b.emoji} Badge débloqué : ${b.name}`, 'badge', 3500), i * 600));
}

/**
 * Termine un exercice : XP, feedback, méthode à retenir, suite de session.
 * @param {{key:string, title:string, score?:number, xp:number, skill:string, genre?:string, hintUsed?:boolean,
 *          lesson?:string, transfer?:string, details?:Node, success?:boolean, onRetry?:Function}} r
 */
export function finishExercise(r) {
  const xp = Math.round(r.xp * (r.hintUsed ? 0.8 : 1));
  const res = recordExercise({ ...r, xp });
  const s = getState();
  const lv = levelFromXp(s.xp);
  const sess = s.session;
  const nextStep = sess && !sess.finished && sess.steps[sess.idx];

  const content = el('div.result',
    el('div.result-score', r.score != null ? el('div.big', `${r.score}%`) : el('div.big', '✓'), el('div', r.title)),
    el('div.xp-gain', `+${res.xp} XP` + (r.hintUsed ? ' (indice utilisé)' : '')),
    res.levelUp ? el('div.levelup', `🎉 Niveau ${res.level} ! ${titleFor(res.level)}`) : null,
    el('div.bar', el('div.bar-fill', { style: { width: `${Math.round(lv.progress * 100)}%` } })),
    r.details || null,
    r.lesson ? el('div.lesson', el('div.lesson-title', '🧠 À retenir'), el('p', r.lesson)) : null,
    r.transfer ? el('div.lesson.transfer', el('div.lesson-title', '🎛️ Dans ton studio'), el('p', r.transfer)) : null,
    res.sessionDone ? el('div.levelup', '✅ Session terminée ! +40 XP bonus') : null,
    el('div.row.gap.wrap.center',
      r.onRetry ? el('button.btn', { onclick: () => { close(); r.onRetry(); } }, '↻ Encore') : null,
      nextStep && res.sessionAdvanced
        ? el('button.btn.primary', { onclick: () => { close(); location.hash = nextStep.route; } }, `Étape suivante : ${nextStep.title} →`)
        : res.sessionDone
          ? el('button.btn.primary', { onclick: () => { close(); location.hash = '#/home'; } }, 'Retour à l’accueil')
          : el('button.btn.primary', { onclick: () => close() }, 'Continuer'),
    ),
  );
  const close = modal(content);
  if (res.sessionDone || res.levelUp) confetti();
  showBadges(res.badges);
  return res;
}

export function confetti() {
  if (document.documentElement.dataset.motion === 'reduce' || (document.documentElement.dataset.motion !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  const host = document.body;
  const colors = ['#ff5d73', '#ffb84d', '#ffe066', '#5ce1e6', '#7c9cff', '#c77dff'];
  for (let i = 0; i < 40; i++) {
    const c = el('div.confetti', {
      style: {
        left: Math.random() * 100 + 'vw',
        background: colors[i % colors.length],
        animationDelay: Math.random() * 0.4 + 's',
        transform: `rotate(${Math.random() * 360}deg)`,
      },
    });
    host.appendChild(c);
    setTimeout(() => c.remove(), 2200);
  }
}

/** Bouton lecture/stop générique. */
export function playButton(onPlay, onStop, label = 'Lecture') {
  let playing = false;
  const btn = el('button.btn.play', {
    onclick: () => {
      ensureAudio();
      playing = !playing;
      btn.classList.toggle('on', playing);
      btn.textContent = playing ? '■ Stop' : '▶ ' + label;
      playing ? onPlay() : onStop();
    },
  }, '▶ ' + label);
  btn.reset = () => { playing = false; btn.classList.remove('on'); btn.textContent = '▶ ' + label; };
  return btn;
}

export function card(...children) {
  return el('section.card', ...children);
}

export function header(title, sub, back = '#/labs') {
  return el('div.page-head',
    back ? el('a.back', { href: back, 'aria-label': 'Retour' }, '‹') : null,
    el('div', el('h1', title), sub ? el('p.sub', sub) : null),
  );
}

export function parseQuery(q = '') {
  return Object.fromEntries(new URLSearchParams(q));
}

export function shuffle(arr, r = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
