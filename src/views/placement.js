// Test de positionnement hebdomadaire (disponible chaque lundi) : 5 minutes pour mesurer ses progrès et choisir le focus de la semaine.
import { el, header, card, toast, confetti, showBadges } from '../ui.js';
import { getState, update, recordExercise, recordReview } from '../store.js';
import { ensureAudio, now, playClick, outputLatency } from '../core/audio.js';
import { onMidi } from '../midiin.js';
import { viewKeys } from '../shortcuts.js';
import { inputLatency } from '../core/latency.js';
import { WARMUPS, CREATES } from '../core/daily.js';
import { DOMAINS, placementPlan, PLACEMENT_LEVEL, scorePlacement, tapScore, placementDue, weekId, nextSkills } from '../core/pedagogy.js';
import { makeQuestion } from './ear.js';

const shortDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export function render(root, params = {}) {
  let cleanup = null;
  root.append(header('🧪 Test de la semaine', 'Chaque lundi, 5 minutes pour mesurer tes progrès en rythme, harmonie, mélodie et son.', '#/skills'));
  const body = el('div');
  root.append(body);

  function home() {
    const s = getState();
    const weeks = Object.keys(s.placement || {}).sort();
    if (!placementDue(s) && !params.retake) return results(s.placement[weekId()], weeks);
    body.replaceChildren(
      el('div.card.glow',
        el('h3', '📋 Au programme (≈ 5 min)'),
        el('ul.rush-points',
          el('li', '🎵 4 intervalles à reconnaître'),
          el('li', '🎼 3 couleurs d’accords et 2 progressions'),
          el('li', '🥁 3 styles à identifier au groove, puis 8 frappes en rythme sur le métronome'),
          el('li', '🔊 3 « quel paramètre a changé ? »')),
        el('p.small.muted', 'Même niveau chaque semaine : tu vois tes vrais progrès. Ton point faible devient le focus de tes sessions de la semaine.'),
        el('button.btn.primary.wide', { onclick: start }, '▶ Commencer le test')),
      weeks.length ? history(s, weeks) : null,
    );
  }

  function start() {
    ensureAudio();
    const plan = placementPlan();
    const answers = [];
    let i = 0;
    const step = () => {
      if (i >= plan.length) return finish(answers);
      const it = plan[i];
      if (it.mode === 'tap') return tapTest((score) => { answers.push({ domain: it.domain, score }); i++; step(); });
      const q = makeQuestion(it.mode, PLACEMENT_LEVEL, i);
      let answered = false;
      const listen = el('button.btn.primary.listen', { onclick: () => { ensureAudio(); q.play(); } }, '▶');
      const box = card(
        el('div.quiz-progress', plan.map((_, k) => el('span' + (k < i ? '.ok' : k === i ? '.cur' : '')))),
        el('p.muted', { style: { textAlign: 'center' } }, `Question ${i + 1}/${plan.length} · ${DOMAINS.find((d) => d.id === it.domain).emoji} ${q.prompt}`),
        listen,
        el('div.answers', q.options.map((o) => {
          const b = el('button.btn.answer', {
            onclick: () => {
              if (answered) return;
              answered = true;
              const ok = o.value === q.answer;
              b.classList.add(ok ? 'right' : 'wrong');
              const good = q.options.find((x) => x.value === q.answer);
              answers.push({ domain: it.domain, ok, prompt: q.prompt, given: o.label, correct: good?.label, explain: q.explain });
              if (q.reviewKey) recordReview(q.reviewKey, ok); // une erreur revient en révision
              if (ok) { setTimeout(() => { i++; step(); }, 450); return; }
              // Erreur : on montre la bonne réponse et l'explication, on passe à la suite quand on veut
              [...box.querySelectorAll('.answer')].forEach((x) => { if (x.textContent === good?.label) x.classList.add('right'); });
              const next = el('button.btn.primary.wide', { 'data-key': 'enter', onclick: () => { i++; step(); } }, i + 1 < plan.length ? 'Question suivante →' : 'Continuer →');
              box.append(el('div.lesson', el('div.lesson-title', `❌ La bonne réponse : ${good?.label || ''}`), q.explain ? el('p', q.explain) : null,
                el('button.btn.small.ghost', { onclick: () => { ensureAudio(); q.play(); } }, '🔊 Réécouter')), next);
              next.focus();
            },
          }, o.label);
          return b;
        })),
      );
      body.replaceChildren(box);
      setTimeout(() => q.play(), 250);
    };
    step();
  }

  // Régularité : 4 clics de décompte puis 8 clics à frapper en même temps (tactile, Espace ou pad MIDI).
  function tapTest(done) {
    const bpm = 100, spb = 60 / bpm, lat = outputLatency();
    const t0 = now() + 0.6;
    const targets = Array.from({ length: 8 }, (_, k) => t0 + (4 + k) * spb);
    for (let k = 0; k < 12; k++) playClick(t0 + k * spb, k % 4 === 0);
    const best = new Map();
    const status = el('p.muted', { style: { textAlign: 'center' } }, 'Écoute les 4 premiers clics…');
    const pad = el('button.tap-pad', { type: 'button' }, 'TAPE ICI');
    const tap = (src) => {
      const t = now() - inputLatency(getState().settings, src);
      pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit');
      targets.forEach((tg, k) => {
        const off = (t - (tg + lat)) * 1000;
        if (Math.abs(off) < 300 && (!best.has(k) || Math.abs(off) < Math.abs(best.get(k)))) best.set(k, off);
      });
    };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); tap('p'); });
    viewKeys({ space: () => tap('k') });
    const offMidi = onMidi({ noteOn: () => tap('m') });
    body.replaceChildren(card(el('h3', '🥁 Régularité'), el('p', 'Frappe en même temps que les 8 clics qui suivent le décompte (écran, barre Espace ou un pad de ton MPC).'), status, pad));
    const timer = setInterval(() => {
      const t = now();
      const k = Math.floor((t - t0) / spb);
      status.textContent = k < 4 ? `Décompte : ${Math.max(1, 4 - k)}…` : k < 12 ? `À toi ! ${k - 3}/8` : 'Terminé';
      if (t > targets[7] + 0.6) {
        clearInterval(timer); offMidi(); viewKeys({ space: null }); cleanup = null;
        done(tapScore([...best.values()]));
      }
    }, 80);
    cleanup = () => { clearInterval(timer); offMidi(); viewKeys({ space: null }); };
  }

  function finish(answers) {
    const r = scorePlacement(answers);
    const week = weekId();
    const prevWeeks = Object.keys(getState().placement || {}).filter((w) => w < week).sort();
    const mistakes = answers.filter((a) => a.ok === false).map(({ domain, prompt, given, correct, explain }) => ({ domain, prompt, given, correct, explain }));
    update((s) => { s.placement = { ...(s.placement || {}), [week]: { date: new Date().toISOString().slice(0, 10), ...r, mistakes } }; });
    const res = recordExercise({ key: 'placement', title: 'Test de la semaine', score: r.global, xp: 20 + r.global * 0.3, skill: 'oreille', success: true });
    showBadges(res.badges);
    const prev = prevWeeks.length ? getState().placement[prevWeeks[prevWeeks.length - 1]] : null;
    if (prev && r.global > prev.global) confetti();
    results(getState().placement[week], Object.keys(getState().placement).sort(), res.xp);
  }

  function results(t, weeks, xp = null) {
    const s = getState();
    const idx = weeks.indexOf(weekId());
    const prev = idx > 0 ? s.placement[weeks[idx - 1]] : null;
    const weak = DOMAINS.find((d) => d.id === t.weakest);
    const focusActs = [...WARMUPS, ...CREATES].filter((a) => a.skill === weak.skill).slice(0, 3);
    body.replaceChildren(
      el('div.card.glow.rush-result',
        el('div.small.muted', `Semaine du ${shortDate(weekId())}`),
        el('div.big', `${t.global}/100`),
        xp != null ? el('div.xp-gain', `+${xp} XP`) : null,
        prev ? el('p', t.global >= prev.global ? `📈 +${t.global - prev.global} par rapport à la semaine dernière` : `📉 ${t.global - prev.global} par rapport à la semaine dernière — normal, une semaine sur l’autre ça varie.`) : el('p.small.muted', 'Premier test : ta base de départ. Reviens lundi prochain pour mesurer tes progrès.'),
        el('div.placement-bars', DOMAINS.map((d) => {
          const v = t.scores[d.id], p = prev?.scores?.[d.id];
          return el('div.pb-row', el('span', `${d.emoji} ${d.name}`),
            el('div.pb-track', el('div.pb-fill', { style: { width: `${v}%` } }), p != null ? el('i.pb-prev', { style: { left: `${p}%` }, title: `Semaine dernière : ${p}` }) : null),
            el('b', String(v)), p != null ? el('small' + (v >= p ? '.up' : '.down'), `${v >= p ? '+' : ''}${v - p}`) : null);
        }))),
      card(el('h3', `🎯 Focus de la semaine : ${weak.emoji} ${weak.name}`),
        el('p.small.muted', 'Tes sessions express de la semaine cibleront surtout ce domaine. Pour aller plus vite :'),
        el('div.row.gap.wrap', focusActs.map((a) => el('a.btn.small', { href: a.route.replace('{genre}', 'house') }, a.title))),
        el('p.small.muted', { style: { marginTop: '10px' } }, 'Compétences à valider ensuite : ', nextSkills(s, 3).map((x) => `${x.node.emoji} ${x.node.name}`).join(' · '), ' — ', el('a', { href: '#/skills' }, 'voir l’arbre'))),
      debrief(t),
      weeks.length > 1 ? history(s, weeks) : null,
      el('p.small.muted', '🗓️ Prochain test : lundi prochain.'),
    );
  }

  /** Débrief : chaque erreur avec ta réponse, la bonne et l'explication. */
  function debrief(t) {
    const list = t.mistakes || [];
    if (!list.length) return card(el('h3', '✅ Aucune erreur dans les questions'), el('p.small.muted', 'Bravo ! (La régularité au métronome est notée à part.)'));
    return card(el('h3', `🔎 Débrief : ${list.length} erreur${list.length > 1 ? 's' : ''}`),
      list.map((m) => el('div.debrief-item',
        el('div.small.muted', `${DOMAINS.find((d) => d.id === m.domain)?.emoji || ''} ${m.prompt || ''}`),
        el('div', '❌ Ta réponse : ', el('b', m.given || '—'), ' · ✅ Bonne réponse : ', el('b', m.correct || '—')),
        m.explain ? el('p.small', m.explain) : null)),
      el('p.small.muted', 'Ces notions reviennent dans tes sessions de la semaine grâce au focus.'));
  }

  function history(s, weeks) {
    const last = weeks.slice(-8);
    return card(el('h3', '📊 Tes tests'),
      el('div.ph-chart', last.map((w) => {
        const g = s.placement[w].global;
        return el('div.ph-col', { title: `${shortDate(w)} : ${g}/100` }, el('b', String(g)), el('div.ph-bar', { style: { height: `${Math.max(4, g)}%` } }), el('small', shortDate(w)));
      })));
  }

  home();
  return () => cleanup?.();
}
