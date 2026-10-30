import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, VENUES, MAKERS, planNight, judgeTaps, roundPoints, nextHype, starsFor, totalStars, isOpen, nightXp, pressVinyl, addToCrate, nightConcepts, dailyVenue, roundTime, venueById, noteNameFr, MAX_STARS,
  SOUND_GAMES, SILENT_GAMES, starKey, silentStars, GROOVES, STRUCTURES, blocksOf, energyCurve, chordInfo, CHORD_POOL } from '../src/core/club.js';
import { rng } from '../src/core/daily.js';
import { GENRES } from '../src/data/genres.js';
import { SKILLS } from '../src/core/progress.js';

test('salles et mini-jeux cohérents', () => {
  const ids = GENRES.map((g) => g.id);
  for (const v of VENUES) {
    v.games.forEach((g) => assert.ok(GAMES[g], g));
    v.genres.forEach((g) => assert.ok(ids.includes(g), g));
  }
  for (const [id, g] of Object.entries(GAMES)) {
    assert.ok(SKILLS[g.skill], id);
    assert.ok(MAKERS[id] && g.lesson && g.lab.href.startsWith('#/'), id);
  }
  assert.deepEqual(VENUES.map((v) => v.need), [...VENUES.map((v) => v.need)].sort((a, b) => a - b));
  // Les salles déjà ouvertes avant la mise à jour restent ouvertes (mêmes seuils)
  assert.deepEqual(['bar', 'warehouse', 'beach', 'festival', 'berlin'].map((id) => venueById(id).need), [0, 2, 5, 8, 11]);
  assert.equal(VENUES.length, 9);
  assert.ok(VENUES.at(-1).need <= MAX_STARS - 6, 'la dernière salle reste atteignable');
  dailyVenue('2026-10-19').genres.forEach((g) => assert.ok(ids.includes(g), g));
});

test('nuit déterministe, sans répétition immédiate, difficulté et tempo qui montent', () => {
  const v = venueById('festival');
  const a = planNight(v, 'x'), b = planNight(v, 'x');
  assert.deepEqual(a, b);
  assert.equal(a.length, v.length);
  for (let i = 1; i < a.length; i++) assert.notEqual(a[i].type, a[i - 1].type);
  assert.ok(a.at(-1).bpm > a[0].bpm && a.at(-1).d > a[0].d);
  assert.ok(roundTime(a.at(-1)) < roundTime({ ...a.at(-1), speed: 1 }));
  assert.notDeepEqual(planNight(v, 'y').map((r) => r.type), a.map((r) => r.type));
});

test('générateurs : réponses valides sur beaucoup de tirages', () => {
  const v = venueById('berlin');
  for (let s = 0; s < 60; s++) {
    for (const r of planNight(v, s)) {
      const q = r.q;
      if (r.type === 'pitch') { assert.equal(q.notes[q.answer] > q.notes[1 - q.answer], true); assert.ok(q.gap >= 1); }
      if (r.type === 'mood') assert.equal(q.notes[1] - q.notes[0], q.answer === 0 ? 4 : 3);
      if (r.type === 'hole' && q.what === 'clap') assert.ok([1, 3].includes(q.missing));
      if (r.type === 'genre') { assert.ok(q.genres[q.answer]); assert.equal(new Set(q.genres).size, q.genres.length); }
      if (r.type === 'note') { assert.equal(q.options.length, 3); assert.ok(q.options[q.answer].startsWith(noteNameFr(q.midi) + ' '), q.options[q.answer]); }
      if (r.type === 'tempo') assert.equal(q.bpms[q.answer] > q.bpms[1 - q.answer], true);
      if (r.type === 'simon') assert.ok(q.seq.length >= 3 && q.seq.every((p) => p >= 0 && p < 4));
      if (r.type === 'swing') assert.equal(q.amount > 0, q.answer === 1);
      if (r.type === 'count') assert.equal(String(q.notes.length), q.options[q.answer]);
      if (r.type === 'filter') assert.equal(q.cutoff >= 2400, q.answer === 0);
      if (r.type === 'contour') {
        const dir = q.notes.slice(1).map((n, i) => Math.sign(n - q.notes[i]));
        const want = { up: [1, 1, 1], down: [-1, -1, -1], wave: [1, 1, -1] }[q.kind];
        assert.deepEqual(dir, want, q.kind);
        assert.match(q.options[q.answer], { up: /monte$/, down: /descend$/, wave: /Monte puis/ }[q.kind]);
      }
    }
  }
  const n = MAKERS.note(() => 0.01, 0);
  assert.match(n.options[n.answer], /^Do \(C\)$/);
});

test('notation : frappes, points, ambiance, étoiles, déblocages', () => {
  const beats = [1, 1.5, 2, 2.5];
  assert.deepEqual(judgeTaps([1.04, 1.48, 2.2, 2.51], beats, 100), { hits: 3, offs: [40, -20, 10] });
  assert.equal(judgeTaps([1.01, 1.02], beats, 100).hits, 1, 'un temps ne compte qu’une fois');
  assert.equal(roundPoints(0, 1), 150);
  assert.equal(roundPoints(20, 0), 200);
  assert.equal(nextHype(95, true), 100);
  assert.equal(nextHype(10, false), 0);
  assert.equal(starsFor(false, 10, 10), 0);
  assert.equal(starsFor(true, 9, 10), 3);
  assert.equal(starsFor(true, 8, 10), 2);
  assert.equal(starsFor(true, 7, 10), 1);
  const best = { bar: { stars: 2 } };
  assert.equal(totalStars(best), 2);
  assert.equal(isOpen(venueById('warehouse'), best), true);
  assert.equal(isOpen(venueById('beach'), best), false);
});

test('XP réparti par compétence, vinyles, récap', () => {
  const res = [{ type: 'pitch', ok: true }, { type: 'mood', ok: true }, { type: 'beat', ok: false }, { type: 'mood', ok: true }];
  const x = nightXp(res, 2);
  assert.deepEqual(x, { total: 29, skills: { oreille: 13, harmonie: 16 } });
  assert.equal(nightXp(res, 2, true).total, 49);
  assert.equal(nightXp(res, 0).total, 9);
  const v = venueById('bar');
  assert.equal(pressVinyl(v, 's', 0), null);
  const g = pressVinyl(v, 's', 3);
  assert.equal(g.kind, 'gold');
  assert.ok(v.genres.includes(g.genre));
  let crate = addToCrate({}, { genre: 'house', kind: 'color' });
  crate = addToCrate(crate, { genre: 'house', kind: 'black' });
  assert.deepEqual(crate.house, { n: 2, kind: 'color' });
  assert.deepEqual(nightConcepts(res).map((c) => c.type), ['beat', 'pitch', 'mood']);
});

// ---------------- Mode sans le son ----------------

test('sans le son : 5 mini-jeux muets, jamais mélangés aux nuits avec le son', () => {
  assert.deepEqual(SILENT_GAMES, ['grid', 'chordx', 'calc', 'archi', 'reglage']);
  assert.ok(SILENT_GAMES.every((id) => GAMES[id].silent && GAMES[id].time >= 8 && GAMES[id].time <= 12));
  assert.ok(SOUND_GAMES.every((id) => !GAMES[id].silent));
  assert.equal(SOUND_GAMES.length + SILENT_GAMES.length, Object.keys(GAMES).length);
  for (const v of [...VENUES, dailyVenue('2026-10-29')]) {
    v.games.forEach((g) => assert.ok(!GAMES[g].silent, `${v.id} : ${g}`));
    for (let s = 0; s < 25; s++) {
      planNight(v, s).forEach((r) => assert.ok(!GAMES[r.type].silent, `${v.id} : ${r.type}`));
      const night = planNight(v, s, { silent: true });
      assert.equal(night.length, v.length);
      night.forEach((r, i) => { assert.ok(GAMES[r.type].silent, r.type); if (i) assert.notEqual(r.type, night[i - 1].type); });
    }
  }
  const v = venueById('bar');
  assert.deepEqual(planNight(v, 'x', { silent: true }), planNight(v, 'x', { silent: true }), 'déterministe');
  assert.notDeepEqual(planNight(v, 'x', { silent: true }).map((r) => r.type), planNight(v, 'y', { silent: true }).map((r) => r.type));
  assert.equal(new Set(planNight(venueById('space'), 'z', { silent: true }).map((r) => r.type)).size, 5, 'une longue nuit passe par tous les jeux');
  // Même difficulté que la salle
  assert.deepEqual(planNight(v, 'x', { silent: true }).map((r) => r.d), planNight(v, 'x').map((r) => r.d));
});

test('sans le son : chaque générateur est déterministe', () => {
  for (const id of SILENT_GAMES) {
    for (const d of [0, 0.5, 1, 1.5, 2, 2.5, 3, 4]) {
      for (let s = 0; s < 20; s++) assert.deepEqual(MAKERS[id](rng(`${id}${s}`), d, 120, venueById('bar')), MAKERS[id](rng(`${id}${s}`), d, 120, venueById('bar')), `${id} d=${d}`);
    }
  }
});

/** Tous les tirages des mini-jeux muets, à toutes les difficultés. */
function* silentRounds(id, n = 120) {
  for (const d of [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]) for (let s = 0; s < n; s++) yield { d, q: MAKERS[id](rng(`t-${id}-${d}-${s}`), d, 120, venueById('bar')) };
}
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus4: [0, 5, 7], sus2: [0, 2, 7] };
/** Notes d'un accord, calculées indépendamment du moteur ('F♯m7' ou 'F#m7'). */
const pcsOf = (sym) => {
  const [, l, acc, q] = /^([A-G])([#b♯♭]?)(.*)$/.exec(sym);
  const root = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[l] + ('#♯'.includes(acc) && acc ? 1 : 'b♭'.includes(acc) && acc ? 11 : 0)) % 12;
  return new Set(QUAL[q].map((x) => (root + x) % 12));
};
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

test('Grid Puzzle : exactement une case fausse, là où le moteur le dit', () => {
  for (const { d, q } of silentRounds('grid')) {
    const g = GROOVES.find((x) => x.id === q.style);
    assert.equal(q.rows.length, d < 0.5 ? 2 : 3);
    assert.ok(g.d <= d);
    const diffs = [];
    q.rows.forEach((row, k) => { assert.equal(row.cells.length, 16); for (let i = 0; i < 16; i++) if (row.cells[i] !== row.ref[i]) diffs.push([k, i]); });
    assert.deepEqual(diffs, [[q.row, q.step]], q.style);
    assert.equal(q.answer, q.row * 16 + q.step);
    assert.equal(q.added, q.rows[q.row].cells[q.step] === 'x');
    assert.ok(g.rows[q.row][2], 'jamais d’erreur sur une ligne libre');
    if (d < 1) assert.ok(q.step % 4 === 0 || !q.added, 'débutant : coup en trop seulement sur un temps');
    assert.match(q.why, q.added ? /^Coup en trop/ : /^Coup manquant/);
  }
  assert.ok(GROOVES.every((g) => g.rows.every(([, ref]) => /^[x.]{16}$/.test(ref))));
});

test('Accord Express : les notes demandées sont celles de l’accord', () => {
  CHORD_POOL.flat().forEach((sym) => assert.ok(sameSet(new Set(chordInfo(sym).pcs), pcsOf(sym)), sym));
  assert.deepEqual(chordInfo('Bb'), { sym: 'B♭', fr: 'Si♭ majeur', root: 10, pcs: [10, 2, 5] });
  let names = 0;
  for (const { d, q } of silentRounds('chordx')) {
    assert.ok(sameSet(new Set(q.pcs), pcsOf(q.chord)), q.chord);
    if (q.mode === 'build') {
      assert.equal(q.size, q.pcs.length);
      assert.equal(q.labels, d < 1.5);
      if (d < 1) assert.ok(CHORD_POOL[0].includes(q.chord), 'débutant : accords de base');
    } else {
      names++;
      assert.ok(d >= 1.5);
      assert.equal(q.options[q.answer], q.chord);
      assert.ok(sameSet(new Set(q.notes.map((m) => m % 12)), pcsOf(q.chord)));
      assert.ok(q.notes.every((m) => m >= 60 && m < 72), 'sur le mini-clavier');
      assert.equal(new Set(q.options).size, q.options.length);
      q.options.forEach((o, i) => { if (i !== q.answer) assert.ok(!sameSet(pcsOf(o), pcsOf(q.chord)), `${o} = ${q.chord} ?`); });
    }
  }
  assert.ok(names > 50, 'le sens inverse apparaît aux difficultés hautes');
});

test('Calcul de producteur : la bonne réponse est juste et parmi les choix', () => {
  const fr = (x) => String(x).replace('.', ',');
  const kinds = new Set();
  for (const { d, q } of silentRounds('calc', 200)) {
    kinds.add(q.kind);
    assert.equal(new Set(q.options).size, q.options.length, q.text);
    assert.ok(q.options.length >= 3 && q.options.length <= 4);
    const good = q.options[q.answer];
    const check = {
      bar1: () => good === `${fr(Math.round(2400 / q.bpm) / 10)} s`,
      bar4: () => good === `${fr(Math.round(9600 / q.bpm) / 10)} s`,
      bars30: () => good === String(q.bpm / 8) && Number.isInteger(q.bpm / 8),
      ms4: () => good === `${Math.round(60000 / q.bpm)} ms`,
      ms8: () => good === `${Math.round(30000 / q.bpm)} ms`,
      ms8d: () => good === `${Math.round(45000 / q.bpm)} ms`,
      ms16: () => good === `${Math.round(15000 / q.bpm)} ms`,
      fifth: () => q.value === (q.root + 7) % 12,
      fourth: () => q.value === (q.root + 5) % 12,
      relmin: () => q.value === (q.root + 9) % 12 && / mineur /.test(good),
      relmaj: () => q.value === (q.root + 3) % 12 && / majeur /.test(good),
      semis: () => good === String(q.value),
      sig: () => good === ({ 0: 'Aucune', 7: '1 ♯', 2: '2 ♯', 9: '3 ♯', 4: '4 ♯', 5: '1 ♭', 10: '2 ♭', 3: '3 ♭', 8: '4 ♭' })[q.root],
    }[q.kind];
    assert.ok(check(), `${q.text} → ${good}`);
    if (d < 1) assert.ok(['bar1', 'fifth', 'relmin', 'semis'].includes(q.kind), q.kind);
  }
  assert.equal(kinds.size, 13, [...kinds].join(' '));
  const semis = { 'une quinte juste': 7, 'une octave': 12, 'un triton': 6, 'une tierce majeure': 4 };
  let n = 0;
  for (const { q } of silentRounds('calc', 80)) {
    const name = q.kind === 'semis' && /dans (.+) \?$/.exec(q.text)[1];
    if (semis[name]) { n++; assert.equal(q.value, semis[name], name); }
  }
  assert.ok(n > 10);
});

/** Règles de l'Architecte : intro au début, outro à la fin, groove juste après l'intro, montée juste avant chaque drop,
 *  break entre deux drops, chaque couplet suivi du hook, numérotation respectée. */
function follows(b) {
  const at = (k) => b.findIndex((x) => x.name === k);
  if (at('Intro') > 0 || (at('Outro') >= 0 && at('Outro') !== b.length - 1) || (at('Groove') >= 0 && at('Groove') !== 1)) return false;
  for (let i = 0; i < b.length; i++) {
    const k = b[i].kind;
    if (k === 'build' && b[i + 1]?.kind !== 'drop') return false;
    if (k === 'drop' && b[i - 1]?.kind !== 'build') return false;
    if (k === 'break' && !(b.slice(0, i).some((x) => x.kind === 'drop') && b.slice(i + 1).some((x) => x.kind === 'drop'))) return false;
    if (k === 'verse' && b[i + 1]?.kind !== 'hook') return false;
    if (k === 'hook' && b[i - 1]?.kind !== 'verse') return false;
  }
  const before = (a, z) => at(a) < 0 || at(z) < 0 || at(a) < at(z);
  return before('Montée', 'Re-montée') && before('Drop', 'Drop 2') && before('Drop', 'Drop final');
}
const perms = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));

test('L’Architecte : chaque structure n’a qu’un seul ordre possible, les blocs sont bien mélangés', () => {
  for (const s of STRUCTURES) {
    s.forms.forEach((f, k) => {
      if (!f) return;
      const b = blocksOf(f);
      assert.equal(b.length, k + 4, f);
      assert.ok(b.every((x) => x.kind && x.bars >= 4), f);
      const ok = new Set(perms(b).filter(follows).map((p) => p.map((x) => x.name).join('|')));
      assert.deepEqual([...ok], [b.map((x) => x.name).join('|')], `${s.id} : ${f}`);
    });
  }
  let curves = 0;
  for (const { d, q } of silentRounds('archi')) {
    if (q.mode === 'order') {
      assert.equal(q.blocks.length, d < 1 ? 4 : d < 2 ? 5 : 6);
      assert.deepEqual(q.blocks.map((b) => b.name).sort(), [...q.solution].sort(), 'une permutation des blocs');
      assert.notEqual(q.blocks.map((b) => b.name).join('|'), q.solution.join('|'), 'jamais déjà rangé');
      assert.equal(q.bars, d < 1.5);
    } else {
      curves++;
      assert.ok(d >= 1);
      assert.equal(q.zones.length, 4);
      assert.deepEqual(q.zones.map((z, i) => (z.kind === q.ask ? i : -1)).filter((i) => i >= 0), [q.answer]);
      assert.equal(q.options[q.answer], 'ABCD'[q.answer]);
      const { pts, cuts } = energyCurve(q.zones);
      assert.ok(pts.every(([x, y]) => x >= 0 && x <= 1 && y > 0 && y <= 1));
      assert.equal(cuts.length, 5);
      assert.ok(cuts.every((c, i) => !i || c > cuts[i - 1]) && cuts.at(-1) === 1);
      // La zone demandée se repère à l'énergie : le drop est la plus haute, le break la plus basse après un drop
      const mean = (i) => { const p = pts.filter(([x]) => x > cuts[i] && x < cuts[i + 1]); return p.reduce((a, [, y]) => a + y, 0) / p.length; };
      if (q.ask === 'drop') assert.ok(q.zones.every((_, i) => i === q.answer || mean(i) < mean(q.answer)));
    }
  }
  assert.ok(curves > 50);
});

test('Le Bon Réglage : réponses valides et cohérentes avec le schéma', () => {
  const kinds = new Set();
  for (const { d, q } of silentRounds('reglage')) {
    kinds.add(q.kind + (q.ask ? '/' + q.ask : ''));
    assert.ok(q.answer >= 0 && q.answer < q.options.length, q.kind);
    assert.equal(new Set(q.options).size, q.options.length);
    assert.ok(q.text && q.why);
    if (q.kind === 'env') {
      assert.match(q.options[q.answer], { pluck: /Pluck/, pad: /Pad/, bass: /Basse tenue/, stab: /Stab/ }[q.id]);
      if (q.id === 'pad') assert.ok(q.env.a >= 700 && q.env.r >= 1200);
      if (q.id === 'pluck' || q.id === 'stab') assert.ok(q.env.a <= 5 && q.env.s <= 8);
      if (q.id === 'pluck') assert.ok(q.env.d >= 500, 'un pluck décroît plus lentement qu’un stab');
      if (q.id === 'stab') assert.ok(q.env.d <= 180);
      if (q.id === 'bass') assert.ok(q.env.s >= 85);
    }
    if (q.kind === 'wave') assert.equal(q.options[q.answer], { sine: 'Sinus', saw: 'Dent de scie', square: 'Carré', triangle: 'Triangle' }[q.id]);
    if (q.kind === 'filter' && q.ask === 'type') assert.match(q.options[q.answer], { lp: /Passe-bas/, hp: /Passe-haut/, bp: /Passe-bande/, notch: /notch/ }[q.id]);
    if (q.kind === 'filter' && q.ask === 'open') assert.equal(q.cutoff >= 6000, q.answer === 0);
    if (q.kind === 'eq') assert.match(q.options[q.answer], { low: /bas/, mud: /300\sHz/, harsh: /4\skHz/, air: /air/ }[q.id]);
    if (d < 1) assert.ok(q.kind !== 'eq' && q.options.length >= 2 && (q.kind === 'filter' || q.options.length === 3));
  }
  assert.deepEqual([...kinds].sort(), ['env', 'eq', 'filter/open', 'filter/type', 'wave']);
});

test('sans le son : progression séparée, XP et récap', () => {
  const best = { bar: { stars: 3 }, 'bar@silent': { stars: 1 }, 'warehouse@silent': { stars: 2 } };
  assert.equal(starKey('bar', true), 'bar@silent');
  assert.equal(totalStars(best), 3, 'les étoiles sans le son ne comptent pas avec le son');
  assert.equal(totalStars(best, true), 3);
  assert.equal(isOpen(venueById('beach'), { ...best, 'beach@silent': { stars: 2 } }, true), true);
  assert.equal(isOpen(venueById('beach'), best), false);
  assert.deepEqual(silentStars({ best, nightsSilent: 4, dailySilent: { day: '2026-10-29', score: 900 } }, '2026-10-29'), { stars: 3, max: MAX_STARS, nights: 4, dailyDone: true });
  assert.deepEqual(silentStars(), { stars: 0, max: MAX_STARS, nights: 0, dailyDone: false });
  const res = [{ type: 'grid', ok: true }, { type: 'chordx', ok: true }, { type: 'calc', ok: false }, { type: 'reglage', ok: true }];
  assert.deepEqual(Object.keys(nightXp(res, 1).skills).sort(), ['harmonie', 'rythme', 'sound']);
  assert.deepEqual(nightConcepts(res).map((c) => c.type), ['calc', 'grid', 'chordx', 'reglage']);
});
