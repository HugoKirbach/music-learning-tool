// 🪩 Nuit au club : le jeu du téléphone. Des mini-jeux de quelques secondes (façon WarioWare), la salle s'échauffe,
// le tempo monte… et l'oreille, le rythme et la théorie progressent en arrière-plan.
// Mode « 🔇 Sans le son » : mini-jeux à lire et à toucher, aucun son joué (vibrations et animations seulement).
import { PIANO_CODES, pianoIndex, keyLabels } from '../keyboard.js';
import { el, card, header, toast, confetti, showBadges } from '../ui.js';
import { getState, update, recordExercise } from '../store.js';
import { ensureAudio, now, playSynth, playDrum, playClick, playRiser, outputLatency, kitForGenre, muteFxTails, restoreFx } from '../core/audio.js';
import { presetParams } from '../player.js';
import { viewKeys } from '../shortcuts.js';
import { inputLatency } from '../core/latency.js';
import { dayKey, SKILLS } from '../core/progress.js';
import { GENRES, genreById } from '../data/genres.js';
import {
  GAMES, VENUES, MAX_STARS, venueById, dailyVenue, planNight, roundTime, judgeTaps, roundPoints, nextHype, starsFor,
  totalStars, isOpen, nightXp, pressVinyl, addToCrate, nightConcepts, noteNameFr, noteNameEn,
  SOUND_GAMES, SILENT_GAMES, starKey, energyCurve, ASK_LABEL, stepName,
} from '../core/club.js';

const clubState = () => ({ best: {}, crate: {}, nights: 0, daily: null, vib: true, silent: false, ...(getState().club || {}) });
const setClub = (fn) => update((s) => { s.club = { best: {}, crate: {}, nights: 0, daily: null, vib: true, ...(s.club || {}) }; fn(s.club); });
const starsTxt = (n, max = 3) => '★'.repeat(n) + '☆'.repeat(max - n);
const HYPE = ['😴', '😐', '🙂', '😃', '🤩', '🔥'];
const hypeFace = (h) => HYPE[Math.min(HYPE.length - 1, Math.floor(h / 20))];
const VINYL = { black: { name: 'Vinyle noir', cls: 'black' }, color: { name: 'Édition couleur', cls: 'color' }, gold: { name: 'Disque d’or', cls: 'gold' } };
// Sons secs (sans delay, très peu de réverbe) : chaque manche doit s'entendre sans la traîne de la précédente
const dry = (id) => ({ ...presetParams(id), delay: 0 });
const Q_FX = { send: 0.05 };
// Son de victoire : niveau de sortie à 85 % de l'ancien (vélocité 0.35 → 0.217, gain = 0.35 + 0.65 × vélocité)
const WIN_VEL = 0.217;
const buzz = (p) => { if (clubState().vib) try { navigator.vibrate?.(p); } catch (e) { /* non pris en charge */ } };

/** Joue 1 ou 2 mesures de la batterie d'un style (motifs 16 pas de l'Atlas). */
function playGenreBeat(g, t0, bars = 2, bpm = g.bpm) {
  const kit = kitForGenre(g.id);
  const sd = 60 / bpm / 4;
  for (let b = 0; b < bars; b++) {
    for (const [row, pat] of Object.entries(g.drums)) {
      [...pat].forEach((c, i) => {
        if (c === 'x' || c === 'o') playDrum(row, t0 + (b * 16 + i) * sd + (i % 2 ? (g.swing || 0) * sd * 0.66 : 0), c === 'x' ? 0.9 : 0.4, kit);
      });
    }
  }
  return bars * 16 * sd;
}

export function render(root, params = {}) {
  let stopGame = null;

  // ---------------- Menu ----------------
  function menu() {
    stopGame?.(); stopGame = null;
    document.body.classList.remove('rush-playing');
    const st = clubState();
    const silent = !!st.silent;
    const today = dayKey();
    const stars = totalStars(st.best, silent);
    const daily = dailyVenue(today);
    const dRec = silent ? st.dailySilent : st.daily;
    const doneToday = dRec?.day === today;
    const crateN = Object.keys(st.crate).length;
    const games = silent ? SILENT_GAMES : SOUND_GAMES;
    const setMode = (v) => { if (v !== silent) { setClub((c) => { c.silent = v; }); menu(); } };
    root.replaceChildren(
      header('🪩 Nuit au club', silent ? 'Sans le son : des mini-jeux à lire et à toucher, pour apprendre dans le métro, en salle d’attente ou en réunion.' : 'Le jeu du téléphone : 2-3 minutes, des mini-jeux express, et tu progresses sans y penser.'),
      el('div.club-mode', { role: 'group', 'aria-label': 'Mode de jeu' },
        [[false, '🔊 Avec le son'], [true, '🔇 Sans le son']].map(([v, label]) => el('button.club-mode-btn' + (v === silent ? '.on' : ''), { type: 'button', 'aria-pressed': String(v === silent), onclick: () => setMode(v) }, label))),
      silent ? el('p.small.muted.club-mode-note', 'Aucun son, jamais : grilles de rythme, accords au clavier, calculs, structures et réglages de synthé. Tes étoiles sans le son ont leur propre progression.') : null,
      el('section.card.glow.club-daily', { 'aria-labelledby': 'club-daily-t' },
        el('div.row.between',
          el('div', el('h2', { id: 'club-daily-t' }, silent ? '📅 Le set du jour · 🔇' : '📅 Le set du jour'), el('p.small.muted', doneToday ? `Fait aujourd’hui : ${dRec.score} pts. Rejoue pour battre ton score.` : `${silent ? 'Les mini-jeux sans le son' : 'Tous les mini-jeux'}, le même set pour tout le monde. XP ×2 la première fois aujourd’hui.`)),
          el('button.btn.primary.big', { onclick: () => play(daily, today, silent) }, doneToday ? '↻ Rejouer' : '▶ Jouer'))),
      el('h2.fam-title', `${silent ? '🔇 Les salles sans le son' : '🎧 Les salles'} · ${stars}/${MAX_STARS} ★`),
      el('div.club-venues', VENUES.map((v) => {
        const open = isOpen(v, st.best, silent);
        const b = st.best[starKey(v.id, silent)];
        return el('button.club-venue' + (open ? '' : '.locked'), {
          type: 'button', disabled: !open,
          'aria-label': open ? `${v.name}${silent ? ' sans le son' : ''}, ${v.length} manches, ${b?.stars || 0} étoiles sur 3. Jouer` : `${v.name}, verrouillé : ${v.need} étoiles nécessaires`,
          onclick: () => play(v, `${Date.now()}`, silent),
        },
        el('span.club-venue-emoji', { 'aria-hidden': 'true' }, v.emoji),
        el('span.club-venue-info', el('b', v.name), el('small', open ? (silent ? `${v.length} manches · niveau ${'●'.repeat(Math.min(4, 1 + Math.floor(v.diff)))}` : `${v.length} manches · dès ${v.bpm} BPM · ${v.games.length} mini-jeux`) : `🔒 ${v.need} ★ pour entrer (tu en as ${stars})`)),
        el('span.club-venue-stars', { 'aria-hidden': 'true' }, open ? starsTxt(b?.stars || 0) : '🔒'));
      })),
      el('div.row.gap.wrap', { style: { marginTop: '14px' } },
        el('button.btn', { onclick: crate }, `🎚️ Ma caisse de vinyles (${crateN}/${GENRES.length})`),
        el('button.btn.ghost', { 'aria-pressed': String(!!st.vib), onclick: () => { setClub((c) => { c.vib = !c.vib; }); menu(); } }, st.vib ? '📳 Vibrations : oui' : '📴 Vibrations : non')),
      card(el('details', el('summary', '❓ Comment jouer (et ce que ça t’apprend)'),
        el('p.small', silent
          ? 'Chaque manche dure quelques secondes : lis la consigne, regarde, touche. Si tu te trompes, la bonne réponse s’affiche. 3 erreurs et la soirée s’arrête. Toutes les 4 manches, ça se corse et le temps pour répondre diminue.'
          : 'Chaque manche dure quelques secondes : lis la consigne, écoute, réponds. 3 erreurs et la soirée s’arrête. Toutes les 4 manches, la salle s’échauffe : le tempo monte et le temps pour répondre diminue.'),
        el('ul.clean.small', games.map((id) => GAMES[id]).map((g) => el('li', el('b', `${g.emoji} ${g.title}`), ` — ${g.concept} (${SKILLS[g.skill].name})`))),
        el('p.small.muted', silent ? 'Sur PC : touches 1 à 6 pour répondre ou placer les blocs, clic sur la grille, touches ' + keyLabels(PIANO_CODES) + ' pour le piano.' : 'Sur PC : touches 1 à 4 pour répondre, Espace pour taper le temps.'))),
    );
  }

  // ---------------- Caisse de vinyles ----------------
  function crate() {
    const st = clubState();
    root.replaceChildren(
      el('div.page-head', el('button.back', { type: 'button', 'aria-label': 'Retour', onclick: menu }, '‹'),
        el('div', el('h1', '🎚️ Ma caisse de vinyles'), el('p.sub', 'Un vinyle à chaque soirée réussie. Touche un disque pour l’écouter.'))),
      el('div.crate', GENRES.map((g) => {
        const v = st.crate[g.id];
        return el('button.vinyl' + (v ? '.' + VINYL[v.kind].cls : '.empty'), {
          type: 'button',
          'aria-label': v ? `${g.name}, ${VINYL[v.kind].name}, ${v.n} exemplaire(s). Écouter` : `${g.name} : pas encore gagné`,
          onclick: () => {
            if (!v) { toast('Gagne ce style en finissant une soirée dans une salle qui le passe 🎧', 'info'); return; }
            if (!clubState().silent) { ensureAudio(); playGenreBeat(g, now() + 0.05, 2); }
            toast(`${g.emoji} ${g.name} · ${g.bpm} BPM — ${g.signature[0]}`, 'info', 4500);
          },
        }, el('span.vinyl-disc', { 'aria-hidden': 'true' }, el('span', g.emoji)), el('b', g.name), el('small', v ? `${VINYL[v.kind].name}${v.n > 1 ? ` ×${v.n}` : ''}` : '—'));
      })),
    );
  }

  // ---------------- Partie ----------------
  function play(venue, seed, silent = false) {
    if (!silent) ensureAudio(); // sans le son : aucun contexte audio, aucun son
    stopGame?.();
    const rounds = planNight(venue, seed, { silent });
    const daily = venue.id === 'daily';
    let idx = 0, lives = 3, score = 0, combo = 0, hype = 40, ended = false;
    const results = [];
    let roundCleanup = null, roundReveal = null, timer = 0, raf = 0;

    const livesEl = el('span.club-lives', { 'aria-label': '3 vies' });
    const scoreEl = el('b.club-score', '0');
    const bpmEl = el('span.club-bpm');
    const hypeFill = el('div.club-hype-fill');
    const hypeEmoji = el('span.club-hype-face', { 'aria-hidden': 'true' });
    const stage = el('div.club-stage', { 'aria-live': 'polite' });
    const timeFill = el('div.club-time-fill');

    const paintHud = () => {
      livesEl.textContent = '💿'.repeat(lives) + '·'.repeat(3 - lives);
      livesEl.setAttribute('aria-label', `${lives} vie${lives > 1 ? 's' : ''}`);
      scoreEl.textContent = score;
      hypeFill.style.width = `${hype}%`;
      hypeEmoji.textContent = hypeFace(hype);
      bpmEl.textContent = silent ? '🔇' : `${rounds[Math.min(idx, rounds.length - 1)].bpm} BPM`;
    };

    const game = el('div.club-game' + (silent ? '.silent' : ''), { 'data-venue': venue.id, 'data-seed': seed, 'data-silent': silent ? '1' : null },
      el('div.club-top',
        el('button.btn.small', { type: 'button', 'aria-label': 'Quitter la soirée', onclick: () => { stop(); menu(); } }, '✕'),
        el('span.club-venue-name', `${venue.emoji} ${venue.name}`), bpmEl, livesEl, scoreEl),
      el('div.club-hype', { role: 'meter', 'aria-label': 'Ambiance de la salle', 'aria-valuemin': 0, 'aria-valuemax': 100 }, hypeEmoji, el('div.club-hype-bar', hypeFill)),
      el('div.club-time', timeFill),
      stage);
    root.replaceChildren(game);
    if (silent) bpmEl.setAttribute('aria-label', 'Sans le son');
    document.body.classList.add('rush-playing');
    paintHud();

    function stop() {
      ended = true;
      cancelAnimationFrame(raf); clearTimeout(timer);
      roundCleanup?.(); roundCleanup = null;
      viewKeys({ space: null });
      if (!silent) restoreFx();
      document.body.classList.remove('rush-playing');
    }
    stopGame = stop;

    function next() {
      if (ended) return;
      if (idx >= rounds.length || lives <= 0) { finish(); return; }
      const r = rounds[idx];
      const G = GAMES[r.type];
      paintHud();
      // Annonce de la consigne
      stage.replaceChildren(el('div.club-intro', el('span.club-intro-emoji', { 'aria-hidden': 'true' }, G.emoji), el('b', G.title), el('small', `Manche ${idx + 1}/${rounds.length}`)));
      timeFill.style.width = '100%';
      timer = setTimeout(() => startRound(r), 750);
    }

    function startRound(r) {
      if (ended) return;
      const area = el('div.club-area');
      stage.replaceChildren(el('div.club-head', el('b', `${GAMES[r.type].emoji} ${GAMES[r.type].title}`)), area);
      let answered = false;
      const t0 = silent ? 0 : now() + 0.15;
      if (!silent) restoreFx(t0 - 0.02);
      const api = {
        t0,
        done(ok, why = '') {
          if (answered || ended) return;
          answered = true;
          cancelAnimationFrame(raf);
          const left = Math.max(0, 1 - (performance.now() - start) / (limit * 1000));
          resolve(r, ok, left, why);
        },
      };
      const { cleanup, minTime = 0, reveal } = ROUNDS[r.type](area, r, api) || {};
      roundCleanup = cleanup || null;
      roundReveal = reveal || null;
      const limit = Math.max(roundTime(r), minTime);
      const start = performance.now();
      const tick = () => {
        if (answered || ended) return;
        const f = 1 - (performance.now() - start) / (limit * 1000);
        timeFill.style.width = `${Math.max(0, f) * 100}%`;
        timeFill.classList.toggle('low', f < 0.3);
        if (f <= 0) { api.done(false, '⏰ Trop tard !'); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    function resolve(r, ok, left, why) {
      roundCleanup?.(); roundCleanup = null;
      if (!silent) muteFxTails(now());
      viewKeys({ space: null });
      results.push({ type: r.type, ok });
      hype = nextHype(hype, ok);
      if (silent) { game.classList.remove('flash-ok', 'flash-bad'); void game.offsetWidth; game.classList.add(ok ? 'flash-ok' : 'flash-bad'); }
      const bad = () => stage.replaceChildren(el('div.club-feedback.bad', el('b', '✗'), el('span', why || 'Raté !'), el('small', GAMES[r.type].concept)));
      // Mini-jeux sans le son : si c'est raté, la bonne réponse s'affiche un instant sur la grille, le clavier ou le schéma
      const shown = !ok && roundReveal && stage.querySelector('.club-area');
      if (ok) {
        const pts = roundPoints(combo, left);
        combo++; score += pts;
        buzz(15);
        if (!silent) { const t = now(); playSynth(dry('bell'), 84, t, 0.12, WIN_VEL, { send: 0 }); playSynth(dry('bell'), 91, t + 0.08, 0.2, WIN_VEL, { send: 0 }); }
        stage.replaceChildren(el('div.club-feedback.ok', el('b', '✓'), el('span', `+${pts}`), combo >= 3 ? el('small', `Combo ×${combo} 🔥`) : null));
      } else {
        combo = 0; lives--;
        buzz([40, 40, 60]);
        if (!silent) playSynth(dry('sawlead'), 40, now(), 0.25, 0.4, { send: 0 });
        if (shown) { roundReveal(); shown.classList.add('revealed'); shown.prepend(el('p.club-reveal', `${why === '⏰ Trop tard !' ? '⏰ Trop tard' : '✗ Raté'} : la bonne réponse est en vert`)); }
        else bad();
      }
      roundReveal = null;
      idx++;
      paintHud();
      if (shown) timer = setTimeout(() => { if (ended) return; bad(); timer = setTimeout(next, 1000); }, 1500);
      else timer = setTimeout(next, ok ? 650 : 1100);
    }

    function finish() {
      stop();
      const correct = results.filter((x) => x.ok).length;
      const survived = lives > 0;
      const stars = starsFor(survived, correct, rounds.length);
      const st = clubState();
      const today = dayKey();
      const key = starKey(venue.id, silent);
      const dKey = silent ? 'dailySilent' : 'daily'; // les deux sets du jour se jouent le même jour
      const firstDaily = daily && st[dKey]?.day !== today;
      const xp = nightXp(results, stars, firstDaily);
      const vinyl = pressVinyl(venue, silent ? `${seed}@silent` : seed, stars);
      const prevBest = st.best[key];
      const prevStars = totalStars(st.best, silent);
      setClub((c) => {
        c.nights = (c.nights || 0) + 1;
        if (silent) c.nightsSilent = (c.nightsSilent || 0) + 1;
        if (!daily) {
          const b = c.best[key] || { stars: 0, score: 0 };
          c.best = { ...c.best, [key]: { stars: Math.max(b.stars, stars), score: Math.max(b.score, score) } };
        } else {
          if (firstDaily) c.dailyCount = (c.dailyCount || 0) + 1;
          c[dKey] = { day: today, score: Math.max(c[dKey]?.day === today ? c[dKey].score : 0, score) };
        }
        c.crate = addToCrate(c.crate, vinyl);
      });
      const res = xp.total ? recordExercise({ key: 'club', title: `Nuit au club${silent ? ' sans le son' : ''} · ${venue.name}`, xp: xp.total, skills: xp.skills, score: Math.round((100 * correct) / rounds.length), success: stars >= 1 }) : null;
      if (res) showBadges(res.badges);
      if (stars === 3) confetti();
      const newlyOpen = VENUES.filter((v) => v.need > prevStars && v.need <= totalStars(clubState().best, silent));
      const concepts = nightConcepts(results);
      const record = !daily && (!prevBest || score > prevBest.score);

      root.replaceChildren(
        el('div.page-head', el('button.back', { type: 'button', 'aria-label': 'Retour aux salles', onclick: menu }, '‹'),
          el('div', el('h1', `${venue.emoji} ${venue.name}${silent ? ' · 🔇' : ''}`), el('p.sub', survived ? 'Fin du set 🎉' : 'La salle s’est vidée… 😅'))),
        el('section.card.glow.club-end', { 'aria-label': 'Résultat de la soirée' },
          el('div.rush-stars', { 'aria-label': `${stars} étoiles sur 3` }, starsTxt(stars)),
          el('div.stat-grid',
            el('div', el('b', score), el('span', record ? 'points · record !' : 'points')),
            el('div', el('b', `${correct}/${rounds.length}`), el('span', 'manches réussies')),
            el('div', el('b', `+${xp.total}`), el('span', firstDaily ? 'XP (×2 set du jour)' : 'XP'))),
          xp.total ? el('p.small.muted', 'Compétences entraînées : ', Object.entries(xp.skills).map(([k, v]) => `${SKILLS[k].emoji} ${SKILLS[k].name} +${v}`).join(' · ')) : null,
          vinyl ? el('div.club-vinyl-won', el('span.vinyl-disc.' + VINYL[vinyl.kind].cls, { 'aria-hidden': 'true' }, el('span', genreById(vinyl.genre).emoji)),
            el('div', el('b', `🎁 ${VINYL[vinyl.kind].name} : ${genreById(vinyl.genre).name}`), el('small.muted', `${genreById(vinyl.genre).bpm} BPM — ${genreById(vinyl.genre).signature[0]}`))) : el('p.small', 'Termine la soirée (3 erreurs max) pour gagner un vinyle.'),
          newlyOpen.length ? el('p', el('b', `🔓 Nouvelle salle${silent ? ' sans le son' : ''} : ${newlyOpen.map((v) => `${v.emoji} ${v.name}`).join(', ')} !`)) : null,
          res?.levelUp ? el('div.levelup', `🎉 Niveau ${res.level} !`) : null),
        card(el('h3', '🧠 Ce que tu as travaillé ce soir'),
          concepts.map((c) => {
            const G = GAMES[c.type];
            return el('div.club-concept',
              el('div.row.between', el('b', `${G.emoji} ${G.concept}`), el('span.small' + (c.ok === c.total ? '.good' : ''), `${c.ok}/${c.total}`)),
              el('p.small', G.lesson),
              el('a.small', { href: G.lab.href }, `Approfondir (sur PC) : ${G.lab.name} →`));
          })),
        el('div.row.gap.wrap.center',
          el('button.btn.primary.big', { 'data-key': 'enter', onclick: () => play(venue, daily ? seed : `${Date.now()}`, silent) }, '↻ Rejouer'),
          el('button.btn.big', { onclick: menu }, '🎧 Salles')),
      );
      window.scrollTo(0, 0);
    }

    next();
  }

  // #/club?silent=1 (ou 0) : ouvre le club directement dans ce mode (retenu pour la prochaine fois)
  if (params.silent != null) setClub((c) => { c.silent = params.silent === '1'; });
  // Lien direct vers une soirée précise (#/club?venue=berlin&seed=…[&silent=1]) : même enchaînement de manches pour tous
  const direct = params.venue && venueById(params.venue);
  const silentLink = params.silent === '1';
  if (direct && isOpen(direct, clubState().best, silentLink)) play(direct, params.seed || `${Date.now()}`, silentLink);
  else menu();
  return () => { stopGame?.(); restoreFx(); document.body.classList.remove('rush-playing'); }; // restoreFx : sans effet si l'audio n'a jamais démarré
}

// ---------------- Les mini-jeux ----------------
// Chaque mini-jeu dessine sa zone, joue ses sons et appelle api.done(ok, raison). Il peut demander un temps minimum
// (minTime) quand l'écoute elle-même prend du temps.

/** Boutons de réponse (touches 1-4 sur PC grâce à la classe .answer). */
function answers(labels, onPick, cls = '') {
  return el('div.answers.club-answers' + cls, labels.map((label, i) => el('button.answer.club-opt', { type: 'button', onclick: () => onPick(i) }, label)));
}
const replayBtn = (fn) => el('button.btn.small.ghost.club-replay', { type: 'button', onclick: () => { ensureAudio(); fn(now() + 0.05); } }, '🔊 Réécouter');

/** Points de comptage regroupés par mesure de 4 temps (on voit les blocs). */
const dotBars = (dots) => el('div.club-dots', Array.from({ length: Math.ceil(dots.length / 4) }, (_, b) => el('div.club-bar', dots.slice(b * 4, b * 4 + 4))));

/** Frappe : horodatage audio corrigé de la sortie et de la latence calibrée. */
const tapTime = (src) => now() - outputLatency() - inputLatency(getState().settings, src);

const ROUNDS = {
  pitch(area, r, api) {
    const piano = dry('piano');
    const playIt = (t) => { playSynth(piano, r.q.notes[0], t, 0.45, 0.8, Q_FX); playSynth(piano, r.q.notes[1], t + 0.6, 0.45, 0.8, Q_FX); };
    playIt(api.t0);
    area.append(el('p.club-hint', 'Deux notes. Laquelle est la plus aiguë ?'), answers(r.q.options, (i) => api.done(i === r.q.answer, `C’était la ${r.q.answer ? '2ᵉ' : '1ʳᵉ'}`)), replayBtn(playIt));
    return { minTime: 2.5 };
  },
  mood(area, r, api) {
    const ep = dry('epiano');
    const playIt = (t) => r.q.notes.forEach((n) => playSynth(ep, n, t, 1.1, 0.6, Q_FX));
    playIt(api.t0);
    area.append(el('p.club-hint', 'Cet accord sonne plutôt…'), answers(r.q.options, (i) => api.done(i === r.q.answer, `C’était un accord ${r.q.label}`)), replayBtn(playIt));
    return { minTime: 2.5 };
  },
  beat(area, r, api) {
    const spb = 60 / r.q.bpm;
    const clicks = Array.from({ length: r.q.count }, (_, k) => api.t0 + k * spb);
    const beats = Array.from({ length: r.q.taps }, (_, k) => api.t0 + (r.q.count + k) * spb);
    clicks.forEach((t, k) => playClick(t, k === 0));
    // Débutant : le kick continue pour guider ; ensuite il faut garder le tempo seul
    if (r.d < 1) beats.forEach((t) => playDrum('kick', t, 0.5));
    const dots = Array.from({ length: r.q.count + r.q.taps }, (_, k) => el('span.club-dot' + (k < r.q.count ? '.count' : '')));
    const taps = [];
    const pad = el('button.tap-pad.club-tap', { type: 'button' }, 'TAPE');
    const tap = (src) => {
      taps.push(tapTime(src));
      pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit');
      const filled = taps.length;
      if (dots[r.q.count + filled - 1]) dots[r.q.count + filled - 1].classList.add('on');
      if (filled >= r.q.taps) setTimeout(judge, 50);
    };
    let judged = false;
    const judge = () => {
      if (judged) return; judged = true;
      const { hits, offs } = judgeTaps(taps, beats, r.q.tol);
      const mean = offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : 0;
      api.done(hits >= r.q.need, hits >= r.q.need ? '' : taps.length < r.q.taps ? 'Pas assez de frappes' : mean > 0 ? 'Un peu en retard' : 'Un peu en avance');
    };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); tap('p' + e.pointerId); });
    viewKeys({ space: () => tap('kSpace') });
    const lit = setInterval(() => { const k = Math.floor((now() - api.t0) / spb); dots.forEach((d, i) => d.classList.toggle('now', i === k)); }, 50);
    const end = setTimeout(judge, ((r.q.count + r.q.taps) * spb + 0.5) * 1000);
    area.append(el('p.club-hint', r.d < 1 ? '4 clics, puis tape avec le kick sur les 4 temps suivants.' : '4 clics, puis continue seul·e : tape les 4 temps suivants.'), dotBars(dots), pad);
    return { minTime: (r.q.count + r.q.taps) * spb + 1.2, cleanup: () => { clearInterval(lit); clearTimeout(end); } };
  },
  hole(area, r, api) {
    const spb = 60 / r.q.bpm;
    const loop = (t) => {
      for (let bar = 0; bar < 2; bar++) {
        for (let b = 0; b < 4; b++) {
          const at = t + (bar * 4 + b) * spb;
          if (!(r.q.what === 'kick' && b === r.q.missing)) playDrum('kick', at, 0.9);
          if ((b === 1 || b === 3) && !(r.q.what === 'clap' && b === r.q.missing)) playDrum('clap', at, 0.8);
          playDrum('hat', at + spb / 2, 0.5);
        }
      }
    };
    loop(api.t0);
    const tiles = r.q.options.map((label, i) => el('button.answer.club-opt.club-beat', { type: 'button', onclick: () => api.done(i === r.q.answer, `Il manquait le ${r.q.what === 'clap' ? 'clap' : 'kick'} sur le ${r.q.answer + 1}`) }, el('span', `Temps ${label}`)));
    const lit = setInterval(() => { const k = Math.floor((now() - api.t0) / spb); tiles.forEach((d, i) => d.classList.toggle('now', k >= 0 && k < 8 && k % 4 === i)); }, 40);
    area.append(el('p.club-hint', r.q.what === 'clap' ? 'Le clap devrait tomber sur 2 et 4… sur quel temps manque-t-il ?' : 'Le kick devrait frapper les 4 temps… lequel manque ?'),
      el('div.answers.club-answers.four', tiles), replayBtn(loop));
    return { minTime: 8 * spb + 1.5, cleanup: () => clearInterval(lit) };
  },
  genre(area, r, api) {
    const g = genreById(r.q.genres[r.q.answer]);
    const playIt = (t) => playGenreBeat(g, t, 2);
    const dur = playIt(api.t0);
    area.append(el('p.club-hint', 'Écoute le beat. C’est quel style ?'),
      answers(r.q.genres.map((id) => `${genreById(id).emoji} ${genreById(id).name}`), (i) => api.done(i === r.q.answer, `C’était ${g.name} (${g.bpm} BPM)`)), replayBtn(playIt));
    return { minTime: Math.min(dur, 4) + 2 };
  },
  simon(area, r, api) {
    const pl = dry('pluck');
    const colors = ['#ff5d73', '#ffb84d', '#5ce1e6', '#b388ff'];
    let pos = 0, ready = false;
    const gap = 0.42 / Math.min(1.3, r.speed);
    const pads = r.q.pads.map((n, i) => el('button.answer.club-pad', {
      type: 'button', style: { '--c': colors[i] }, 'aria-label': `Pad ${i + 1}`,
      onclick: () => {
        playSynth(pl, n, now(), 0.3, 0.8, Q_FX);
        flash(i);
        if (!ready) return;
        if (i !== r.q.seq[pos]) { api.done(false, `Note ${pos + 1} : c’était le pad ${r.q.seq[pos] + 1}`); return; }
        pos++;
        status.textContent = `${pos}/${r.q.seq.length}`;
        if (pos >= r.q.seq.length) api.done(true);
      },
    }, String(i + 1)));
    const flash = (i) => { pads[i].classList.add('lit'); setTimeout(() => pads[i].classList.remove('lit'), Math.min(260, gap * 700)); };
    const timers = r.q.seq.map((p, k) => {
      playSynth(pl, r.q.pads[p], api.t0 + k * gap, 0.3, 0.8, Q_FX);
      return setTimeout(() => flash(p), (0.15 + k * gap) * 1000);
    });
    const status = el('p.club-hint', `Écoute et regarde les ${r.q.seq.length} notes…`);
    timers.push(setTimeout(() => { ready = true; status.textContent = 'À toi ! 0/' + r.q.seq.length; }, (0.15 + r.q.seq.length * gap) * 1000));
    area.append(status, el('div.answers.club-pads', pads));
    return { minTime: r.q.seq.length * gap + r.q.seq.length * 0.7 + 1.5, cleanup: () => timers.forEach(clearTimeout) };
  },
  note(area, r, api) {
    const keys = [];
    for (let m = 60; m < 72; m++) keys.push(el('span.club-key' + ([1, 3, 6, 8, 10].includes(m % 12) ? '.black' : '') + (m === r.q.midi ? '.target' : ''), { 'aria-hidden': 'true' }));
    playSynth(dry('piano'), r.q.midi, api.t0, 0.6, 0.7, Q_FX);
    area.append(el('p.club-hint', 'Comment s’appelle la touche allumée ?'), el('div.club-kb', keys),
      answers(r.q.options, (i) => api.done(i === r.q.answer, `C’était ${noteNameFr(r.q.midi)} (${noteNameEn(r.q.midi)})`)));
  },
  tempo(area, r, api) {
    const lamps = [el('span.club-lamp', '1'), el('span.club-lamp', '2')];
    const timers = [];
    const playIt = (t) => {
      let at = t;
      r.q.bpms.forEach((bpm, k) => {
        const spb = 60 / bpm;
        for (let b = 0; b < 4; b++) {
          playDrum('kick', at + b * spb, 0.9); playDrum('hat', at + b * spb + spb / 2, 0.45);
          timers.push(setTimeout(() => { lamps[k].classList.remove('lit'); void lamps[k].offsetWidth; lamps[k].classList.add('lit'); }, (at + b * spb - now()) * 1000));
        }
        at += 4 * spb + 0.5;
      });
      return at - t;
    };
    const dur = playIt(api.t0);
    area.append(el('p.club-hint', 'Deux boucles. Laquelle va le plus vite ?'), el('div.club-lamps', lamps),
      answers(r.q.options, (i) => api.done(i === r.q.answer, `${r.q.bpms[0]} BPM contre ${r.q.bpms[1]} BPM`)), replayBtn(playIt));
    return { minTime: dur + 2, cleanup: () => timers.forEach(clearTimeout) };
  },
  swing(area, r, api) {
    const spb = 60 / r.q.bpm;
    const loop = (t) => {
      for (let b = 0; b < 8; b++) {
        const at = t + b * spb;
        if (b % 2 === 0) playDrum('kick', at, 0.85);
        if (b % 4 === 1 || b % 4 === 3) playDrum('clap', at, 0.55);
        playDrum('hat', at, 0.55);
        playDrum('hat', at + spb / 2 + r.q.amount * spb / 6, 0.45);
      }
      return 8 * spb;
    };
    const dur = loop(api.t0);
    area.append(el('p.club-hint', 'Écoute les hi-hats : égaux (droit) ou « long-court » (swing) ?'),
      answers(r.q.options, (i) => api.done(i === r.q.answer, r.q.answer ? 'C’était swingué (long-court)' : 'C’était droit (croches égales)')), replayBtn(loop));
    return { minTime: Math.min(dur, 4) + 2 };
  },
  count(area, r, api) {
    const pl = dry('pluck');
    const playIt = (t) => r.q.notes.forEach((n, i) => playSynth(pl, n, t + i * r.q.gap, 0.12, 0.8, Q_FX));
    playIt(api.t0);
    area.append(el('p.club-hint', 'Combien de notes viens-tu d’entendre ?'),
      answers(r.q.options, (i) => api.done(i === r.q.answer, `Il y en avait ${r.q.notes.length}`), '.four'), replayBtn(playIt));
    return { minTime: 2.5 };
  },
  filter(area, r, api) {
    const base = presetParams('sawlead');
    const p = { ...base, delay: 0, filter: { ...base.filter, cutoff: r.q.cutoff, envAmt: 0, q: 1 } };
    const playIt = (t) => [0, 7, 12].forEach((iv) => playSynth(p, r.q.midi + iv, t, 1, 0.6, Q_FX));
    playIt(api.t0);
    area.append(el('p.club-hint', 'Ce son a-t-il le filtre ouvert (brillant) ou fermé (sourd) ?'),
      answers(r.q.options, (i) => api.done(i === r.q.answer, r.q.answer ? 'Filtre fermé : les aigus étaient coupés' : 'Filtre ouvert : tous les aigus passaient')), replayBtn(playIt));
    return { minTime: 2.5 };
  },
  contour(area, r, api) {
    const bass = dry('pluckbass');
    const playIt = (t) => r.q.notes.forEach((n, i) => playSynth(bass, n - 12, t + i * 0.32, 0.28, 0.85, Q_FX));
    playIt(api.t0);
    area.append(el('p.club-hint', 'Écoute la ligne de basse : quelle forme a-t-elle ?'),
      answers(r.q.options, (i) => api.done(i === r.q.answer, `Elle ${r.q.options[r.q.answer].replace(/^\S+ /, '').toLowerCase().replace('ça ', '')}`)), replayBtn(playIt));
    return { minTime: 2.5 };
  },
  drop(area, r, api) {
    const spb = 60 / r.q.bpm;
    const dropAt = api.t0 + r.q.beats * spb;
    for (let b = 0; b < r.q.beats; b++) {
      const t = api.t0 + b * spb;
      playDrum('hat', t, 0.35 + 0.4 * (b / r.q.beats));
      if (b >= r.q.beats / 2) playDrum('clap', t + (b >= r.q.beats - 2 ? spb / 2 : 0), 0.5);
      if (b >= r.q.beats - 2) playDrum('clap', t, 0.6);
    }
    playRiser(api.t0, r.q.beats * spb);
    for (let b = 0; b < 4; b++) playDrum('kick', dropAt + b * spb, 1);
    playDrum('crash', dropAt, 0.8);
    const dots = Array.from({ length: r.q.beats }, () => el('span.club-dot'));
    const lit = setInterval(() => {
      const k = Math.floor((now() - api.t0) / spb);
      dots.forEach((d, i) => d.classList.toggle('on', i <= k && k < r.q.showUntil));
      if (k >= r.q.showUntil) dots.forEach((d) => d.classList.add('hidden'));
    }, 40);
    let tapped = false;
    const tap = (src) => {
      if (tapped) return; tapped = true;
      const off = (tapTime(src) - dropAt) * 1000;
      api.done(Math.abs(off) <= r.q.tol, off < 0 ? `Trop tôt de ${Math.round(-off)} ms` : `Trop tard de ${Math.round(off)} ms`);
    };
    const pad = el('button.tap-pad.club-tap.drop', { type: 'button' }, '💥 DROP');
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); tap('p' + e.pointerId); });
    viewKeys({ space: () => tap('kSpace') });
    const late = setTimeout(() => { if (!tapped) { tapped = true; api.done(false, 'Le drop est passé !'); } }, (r.q.beats * spb + 0.15 + r.q.tol / 1000 + 0.3) * 1000);
    area.append(el('p.club-hint', r.q.showUntil < r.q.beats ? `Compte ${r.q.beats} temps (les points s’éteignent à mi-chemin) et tape pile sur le drop.` : `Tape pile sur le drop, juste après le ${r.q.beats}ᵉ temps.`), dotBars(dots), pad);
    return { minTime: r.q.beats * spb + 1.5, cleanup: () => { clearInterval(lit); clearTimeout(late); } };
  },

  // ---------- Sans le son : rien n'est joué, tout se lit et se touche. reveal() montre la solution si c'est raté ----------
  grid(area, r, api) {
    const q = r.q;
    let picked = null;
    const hint = el('p.club-hint', q.tell ? (q.added ? 'Un coup en trop s’est glissé : touche-le !' : 'Il manque un coup : touche la case vide où il devrait être !') : 'Une case est fausse (coup en trop ou manquant) : touche-la !');
    const rule = el('p.club-rule', `📏 ${q.rule}`);
    const half = (h) => el('div.club-grid-half',
      el('div.club-grid-row.head', { 'aria-hidden': 'true' }, el('span.club-grid-label'), [0, 1].map((b) => el('div.club-grid-beat', el('span', String(h * 2 + b + 1))))),
      q.rows.map((row, k) => el('div.club-grid-row', { 'data-row': k },
        el('span.club-grid-label', row.label),
        [0, 1].map((b) => el('div.club-grid-beat', [0, 1, 2, 3].map((j) => {
          const i = h * 8 + b * 4 + j;
          const on = row.cells[i] === 'x';
          const cell = el('button.club-cell' + (on ? '.on' : ''), {
            type: 'button', 'data-row': k, 'data-step': i, 'aria-label': `${row.label}, ${stepName(i)} : ${on ? 'coup' : 'vide'}`,
            onclick: () => { picked = cell; api.done(k === q.row && i === q.step, q.why); },
          });
          return cell;
        }))))));
    const grid = el('div.club-grid', half(0), half(1));
    area.append(el('p.club-question', q.name), hint, q.showRule ? rule : null, grid);
    return {
      reveal: () => {
        grid.querySelector(`.club-cell[data-row="${q.row}"][data-step="${q.step}"]`).classList.add('right');
        if (picked && !picked.classList.contains('right')) picked.classList.add('wrong');
        if (!q.showRule) hint.after(rule);
      },
    };
  },
  chordx(area, r, api) {
    const q = r.q;
    if (q.mode === 'name') {
      const { node, reveal } = choices(q, api);
      area.append(el('p.club-question', 'Quel accord est allumé ?'),
        el('p.club-hint', q.root != null ? 'Le point marque la fondamentale.' : 'Attention : la fondamentale n’est pas forcément la note la plus grave.'),
        piano({ lit: q.notes, root: q.root }).node, node);
      return { reveal };
    }
    const sel = new Set();
    const want = new Set(q.pcs);
    const count = el('b.club-count', `0/${q.size}`);
    const kb = piano({
      labels: q.labels,
      onKey: (m) => {
        if (sel.has(m)) sel.delete(m); else sel.add(m);
        kb.keys[m].classList.toggle('on', sel.has(m));
        kb.keys[m].setAttribute('aria-pressed', String(sel.has(m)));
        const got = new Set([...sel].map((x) => x % 12));
        count.textContent = `${got.size}/${q.size}`;
        if (got.size >= q.size) api.done([...got].every((p) => want.has(p)), q.why);
      },
    });
    area.append(el('p.club-chord', el('b', q.chord), q.fr ? el('small', q.fr) : null),
      el('p.club-hint', 'Touche ses notes, dans n’importe quel ordre et n’importe quelle octave · ', count), kb.node);
    return {
      cleanup: kb.destroy,
      reveal: () => {
        for (let m = 60; m < 72; m++) if (want.has(m % 12)) kb.keys[m].classList.add('right');
        sel.forEach((m) => { if (!want.has(m % 12)) kb.keys[m].classList.add('wrong'); });
      },
    };
  },
  calc(area, r, api) {
    const { node, reveal } = choices(r.q, api);
    area.append(el('p.club-question', r.q.text), node);
    return { reveal };
  },
  archi(area, r, api) {
    const q = r.q;
    if (q.mode === 'curve') {
      const { node, reveal } = choices(q, api, '.four');
      const fig = energySvg(q.zones);
      area.append(el('p.club-question', `${q.style} : où est ${ASK_LABEL[q.ask]} ?`), el('p.club-hint', 'L’énergie du morceau, du début (à gauche) à la fin (à droite).'), el('div.club-figure', fig.node), node);
      return { reveal: () => { reveal(); fig.show(q.answer); } };
    }
    const placed = [];
    const strip = el('ol.club-strip', { 'aria-label': 'Ton arrangement' });
    const toggle = (i) => {
      const k = placed.indexOf(i);
      if (k >= 0) placed.splice(k, 1); else placed.push(i);
      paint();
      if (placed.length === q.blocks.length) api.done(placed.map((j) => q.blocks[j].name).join('|') === q.solution.join('|'), q.why);
    };
    const pool = el('div.answers.club-blocks', q.blocks.map((b, i) => el('button.answer.club-opt.club-block', { type: 'button', 'data-i': i, 'data-kind': b.kind, 'aria-pressed': 'false', onclick: () => toggle(i) },
      el('b', b.name), q.bars ? el('small', ` · ${b.bars}`) : null)));
    const chip = (b, extra = {}) => el('button.club-chip', { type: 'button', 'data-kind': b.kind, ...extra }, b.name);
    const paint = () => {
      strip.replaceChildren(...q.blocks.map((_, k) => el('li', placed[k] == null ? el('span.club-slot', String(k + 1)) : chip(q.blocks[placed[k]], { 'aria-label': `Retirer ${q.blocks[placed[k]].name}`, onclick: () => toggle(placed[k]) }))));
      [...pool.children].forEach((b, i) => { b.classList.toggle('used', placed.includes(i)); b.setAttribute('aria-pressed', String(placed.includes(i))); });
    };
    paint();
    area.append(el('p.club-question', `${q.style} : remets les parties dans l’ordre`),
      el('p.club-hint', q.showTip ? `💡 ${q.tip[0].toUpperCase()}${q.tip.slice(1)}` : 'Du début à la fin. Touche un bloc placé pour le retirer.'), strip, pool);
    return {
      minTime: q.blocks.length * 1.6,
      reveal: () => strip.replaceChildren(...q.solution.map((name) => el('li', el('span.club-chip.right', { 'data-kind': q.blocks.find((b) => b.name === name).kind }, name)))),
    };
  },
  reglage(area, r, api) {
    const q = r.q;
    const fig = { env: envSvg, wave: waveSvg, filter: filterSvg, eq: eqSvg }[q.kind](q);
    const { node, reveal } = choices(q, api);
    area.append(el('p.club-question', q.text), el('div.club-figure', fig),
      q.kind === 'env' && q.values ? el('p.club-values', `A ${q.env.a} ms · D ${q.env.d} ms · S ${q.env.s} % · R ${q.env.r} ms`) : null, node);
    return { reveal };
  },
};

// ---------------- Dessins et commandes des mini-jeux sans le son ----------------

/** QCM sans le son (touches 1-4 sur PC) : si c'est raté, la bonne réponse s'allume. */
function choices(q, api, cls = '') {
  let chosen = -1;
  const node = answers(q.options, (i) => { chosen = i; api.done(i === q.answer, q.why); }, cls);
  return { node, reveal: () => { node.children[q.answer]?.classList.add('right'); if (chosen !== q.answer) node.children[chosen]?.classList.add('wrong'); } };
}

/** Mini-clavier Do4 → Do5. onKey : touches jouables (doigt, souris, clavier A W S E D…), sinon simple affichage. */
function piano({ labels = false, lit = [], root = null, onKey = null } = {}) {
  const keys = {};
  const whites = [];
  const node = el('div.club-piano' + (onKey ? '' : '.view'), { 'aria-label': onKey ? 'Clavier' : 'Clavier : touches allumées' });
  for (let m = 60; m <= 72; m++) {
    const black = [1, 3, 6, 8, 10].includes(m % 12);
    const cls = '.club-pk' + (black ? '.black' : '') + (lit.includes(m) ? '.lit' : '') + (root != null && lit.includes(m) && m % 12 === root ? '.root' : '');
    const props = onKey ? { type: 'button', 'data-midi': m, 'aria-label': `${noteNameFr(m)} (${noteNameEn(m)})`, 'aria-pressed': 'false', onclick: () => onKey(m) } : { 'aria-hidden': 'true' };
    if (black) props.style = { left: `${(whites.length / 8) * 100}%` };
    const k = el((onKey ? 'button' : 'span') + cls, props,
      labels ? (black ? el('small', noteNameEn(m).replace('#', '♯')) : [el('b', noteNameEn(m)), el('small', noteNameFr(m))]) : null);
    keys[m] = k;
    if (!black) whites.push(k);
    node.append(k);
  }
  const kd = (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const i = pianoIndex(e);
    if (i >= 0) { e.preventDefault(); onKey(60 + i); }
  };
  if (onKey) window.addEventListener('keydown', kd);
  return { node, keys, destroy: () => window.removeEventListener('keydown', kd) };
}

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  n.append(...kids);
  return n;
};
const svgBox = (W, H, name, ...kids) => svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'club-svg', role: 'img', 'aria-label': name }, ...kids);
const pathD = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
const fillD = (pts, base) => `${pathD(pts)}L${pts.at(-1)[0].toFixed(1)},${base}L${pts[0][0].toFixed(1)},${base}Z`;
const svgText = (x, y, txt, anchor = 'middle') => svgEl('text', { x, y, 'text-anchor': anchor }, txt);

/** Enveloppe ADSR sur 5 secondes (la touche est relâchée au trait pointillé). */
function envSvg({ env }) {
  const W = 320, H = 130, P = 10, T = 5000, top = 14, base = H - 18;
  const x = (ms) => P + (Math.min(ms, T) / T) * (W - 2 * P);
  const y = (v) => base - v * (base - top);
  const s = env.s / 100;
  const off = Math.max(env.a + env.d + 600, 1500);
  const pts = [[x(0), y(0)], [x(env.a), y(1)]];
  for (let i = 1; i <= 12; i++) pts.push([x(env.a + (env.d * i) / 12), y(s + (1 - s) * (1 - i / 12) ** 2.2)]);
  pts.push([x(off), y(s)]);
  for (let i = 1; i <= 12; i++) pts.push([x(off + (env.r * i) / 12), y(s * (1 - i / 12) ** 2.2)]);
  pts.push([x(T), y(0)]);
  return svgBox(W, H, 'Enveloppe ADSR',
    svgEl('path', { d: fillD(pts, base), class: 'fill' }), svgEl('path', { d: pathD(pts), class: 'stroke' }),
    svgEl('line', { x1: x(off), x2: x(off), y1: top - 6, y2: base, class: 'mark' }),
    svgText(x(off) + 4, top, 'touche relâchée', 'start'), svgText(P, H - 4, '0 s', 'start'), svgText(W - P, H - 4, '5 s', 'end'));
}

/** Forme d'onde : 1 ou 2 cycles. */
function waveSvg({ id, cycles }) {
  const W = 320, H = 120, P = 14, mid = H / 2;
  const f = { sine: (t) => Math.sin(2 * Math.PI * t), saw: (t) => 2 * (t % 1) - 1, square: (t) => (t % 1 < 0.5 ? 1 : -1), triangle: (t) => 1 - 4 * Math.abs(((t + 0.25) % 1) - 0.5) }[id];
  const N = 240;
  const pts = Array.from({ length: N + 1 }, (_, i) => [P + (i / N) * (W - 2 * P), mid - f((i / N) * cycles - (i === N ? 1e-6 : 0)) * (mid - P)]);
  return svgBox(W, H, 'Forme d’onde', svgEl('line', { x1: P, x2: W - P, y1: mid, y2: mid, class: 'axis' }), svgEl('path', { d: pathD(pts), class: 'stroke' }));
}

/** Axe des fréquences (20 Hz → 20 kHz, logarithmique). */
const freqX = (W, P) => (f) => P + (Math.log10(f / 20) / 3) * (W - 2 * P);
const freqTicks = (fx, y) => [[100, '100'], [1000, '1k'], [10000, '10k']].flatMap(([f, t]) => [svgEl('line', { x1: fx(f), x2: fx(f), y1: 8, y2: y - 12, class: 'grid' }), svgText(fx(f), y, t)]);
const sweep = (fx, fn) => Array.from({ length: 121 }, (_, i) => { const f = 20 * 10 ** ((3 * i) / 120); return [fx(f), fn(f)]; });

/** Courbe de réponse d'un filtre (2 pôles, résonance). */
function filterSvg({ id, cutoff, res }) {
  const W = 320, H = 130, P = 12, base = H - 16;
  const fx = freqX(W, P);
  const Q = 0.707 + res * 4;
  const y = (db) => 10 + ((12 - Math.max(-36, Math.min(12, db))) / 48) * (base - 10);
  const pts = sweep(fx, (f) => {
    const w = f / cutoff, den = Math.hypot(1 - w * w, w / Q);
    return y(20 * Math.log10(Math.max(1e-4, { lp: 1, hp: w * w, bp: w / Q, notch: Math.abs(1 - w * w) }[id] / den)));
  });
  return svgBox(W, H, 'Courbe de filtre', ...freqTicks(fx, H - 3), svgEl('line', { x1: P, x2: W - P, y1: y(0), y2: y(0), class: 'axis' }),
    svgEl('path', { d: fillD(pts, base), class: 'fill' }), svgEl('path', { d: pathD(pts), class: 'stroke' }));
}

/** Spectre d'un mix (analyseur) avec un défaut ; en pointillés, un spectre équilibré pour comparer. */
function eqSvg({ id, guide }) {
  const W = 320, H = 130, P = 12, base = H - 16;
  const fx = freqX(W, P);
  const ref = (f) => (f < 100 ? -4 * Math.log2(100 / f) : -3 * Math.log2(f / 100));
  const bell = (f, f0, g, q) => g * Math.exp(-(Math.log2(f / f0) ** 2) * q);
  const fault = { low: (f) => bell(f, 60, 13, 1.2), mud: (f) => bell(f, 300, 12, 2.2), harsh: (f) => bell(f, 4000, 13, 3), air: (f) => -18 / (1 + (6000 / f) ** 4) }[id];
  const y = (db) => 16 + ((14 - Math.max(-34, Math.min(14, db))) / 48) * (base - 16);
  const wig = (f) => 0.8 * Math.sin(Math.log2(f) * 7.3) + 0.5 * Math.sin(Math.log2(f) * 13.1);
  const pts = sweep(fx, (f) => y(ref(f) + fault(f) + wig(f)));
  return svgBox(W, H, 'Spectre', ...freqTicks(fx, H - 3), svgEl('path', { d: fillD(pts, base), class: 'fill' }), svgEl('path', { d: pathD(pts), class: 'stroke' }),
    guide ? svgEl('path', { d: pathD(sweep(fx, (f) => y(ref(f)))), class: 'guide' }) : null,
    guide ? svgText(W - P, 12, 'pointillés : mix équilibré', 'end') : null);
}

/** Courbe d'énergie d'un morceau en 4 zones A-D ; show(k) éclaire la zone k et nomme les parties. */
function energySvg(zones) {
  const W = 320, H = 150, top = 42, base = H - 8;
  const { pts, cuts } = energyCurve(zones);
  const p = pts.map(([x, v]) => [x * W, base - v * (base - top)]);
  const hl = svgEl('rect', { x: 0, y: 0, width: 0, height: H, class: 'zone-hl' });
  const names = svgEl('g', { class: 'zone-names' });
  const node = svgBox(W, H, 'Courbe d’énergie du morceau', hl,
    svgEl('path', { d: fillD(p, base), class: 'fill' }), svgEl('path', { d: pathD(p), class: 'stroke' }),
    ...cuts.slice(1, -1).map((c) => svgEl('line', { x1: c * W, x2: c * W, y1: 4, y2: base, class: 'mark' })),
    ...zones.map((_, k) => svgEl('text', { x: ((cuts[k] + cuts[k + 1]) / 2) * W, y: 16, 'text-anchor': 'middle', class: 'zone-letter' }, 'ABCD'[k])),
    names);
  return {
    node,
    show: (k) => {
      hl.setAttribute('x', cuts[k] * W); hl.setAttribute('width', (cuts[k + 1] - cuts[k]) * W);
      names.replaceChildren(...zones.map((z, i) => svgText(((cuts[i] + cuts[i + 1]) / 2) * W, 32, z.name)));
    },
  };
}
