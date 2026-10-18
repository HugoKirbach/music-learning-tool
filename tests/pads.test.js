import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPadChart, assignPads, hasRolls, judgeVelocity, padForNote, padCount, LAYOUTS } from '../src/core/padgame.js';
import { TileGame, LearnSession, DIFFS } from '../src/core/tiles.js';
import { PAD_LEVELS, PAD_CHAPTERS } from '../src/data/pads.js';

test('tous les niveaux : motifs valides, mesures complètes, 8 pads max, jouables en 2×4 et 4×4', () => {
  const ids = new Set();
  for (const l of PAD_LEVELS) {
    assert.ok(!ids.has(l.id)); ids.add(l.id);
    assert.ok(PAD_CHAPTERS.some((c) => c.id === l.ch), l.id);
    assert.ok(l.intro && l.outro && l.studio && l.points.length >= 2, l.id);
    assert.ok(l.pads.length <= 8, l.id);
    for (const layout of Object.keys(LAYOUTS)) {
      const c = buildPadChart(l, DIFFS.normal, { layout });
      assert.ok(Number.isInteger(c.baseBeats / 4 + 1e-9 - 1e-9) || Math.abs(c.baseBeats % 4) < 1e-9, `${l.id} : ${c.baseBeats} temps`);
      assert.ok(c.notes.length >= 8, l.id);
      const idx = c.pads.map((p) => p.idx);
      assert.equal(new Set(idx).size, idx.length, `${l.id} : deux sons sur le même pad`);
      assert.ok(idx.every((i) => i < padCount(layout)));
      for (const id of Object.keys(l.pattern)) assert.ok(l.pads.some((p) => p.id === id), `${l.id} : ${id}`);
    }
  }
});

test('placement : kick en bas à gauche, mélodique dans l\'ordre', () => {
  const l = PAD_LEVELS.find((x) => x.id === 'hats8');
  const p = assignPads(l, '2x4');
  assert.equal(p.find((x) => x.id === 'kick').idx, 0);
  assert.equal(p.find((x) => x.id === 'hat').idx, 2);
  const m = assignPads(PAD_LEVELS.find((x) => x.id === 'gamme'), '4x4');
  assert.deepEqual(m.map((x) => x.idx), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('roulements désactivés : au plus une croche par pad', () => {
  const trap = PAD_LEVELS.find((x) => x.id === 'trap');
  assert.ok(hasRolls(trap));
  assert.ok(!hasRolls(PAD_LEVELS.find((x) => x.id === 'house')));
  const full = buildPadChart(trap, DIFFS.normal);
  const thin = buildPadChart(trap, DIFFS.normal, { rolls: false });
  assert.ok(thin.notes.length < full.notes.length && thin.thinned > 0);
  const byPad = {};
  for (const n of thin.notes) { if (byPad[n.midi] != null) assert.ok(n.beat - byPad[n.midi] >= 0.5 - 1e-6); byPad[n.midi] = n.beat; }
});

test('jeu et apprentissage avec le moteur commun', () => {
  const l = { bpm: 60, pads: [{ id: 'kick' }, { id: 'snare' }], pattern: { kick: 'x...x...', snare: '..x...x.' } };
  const c = buildPadChart(l, DIFFS.normal);
  assert.equal(c.beats, 2);
  const g = new TileGame(c, DIFFS.normal);
  assert.equal(g.press(0, 0).grade, 'perfect');
  assert.equal(g.press(1, 0.51).grade, 'perfect');
  assert.equal(g.press(0, 0.7).type, 'wrong');
  const s = new LearnSession(c);
  assert.equal(s.steps.length, 4);
});

test('vélocité et notes MIDI', () => {
  assert.equal(judgeVelocity('acc', 0.9), true);
  assert.equal(judgeVelocity('acc', 0.4), false);
  assert.equal(judgeVelocity('ghost', 0.3), true);
  assert.equal(judgeVelocity(null, 0.3), null);
  assert.equal(judgeVelocity('acc', null), null);
  assert.equal(padForNote(36), 0);
  assert.equal(padForNote(43, {}, '2x4'), 7);
  assert.equal(padForNote(44, {}, '2x4'), null);
  assert.equal(padForNote(51, {}, '4x4'), 15);
  assert.equal(padForNote(60, { 60: 3 }, '2x4'), 3);
});

test('mode gaucher : grille inversée gauche ↔ droite', () => {
  const l = PAD_LEVELS.find((x) => x.id === 'hats8');
  const p = assignPads(l, '2x4', { lefty: true });
  assert.equal(p.find((x) => x.id === 'kick').idx, 3);
  assert.equal(p.find((x) => x.id === 'snare').idx, 2);
  const m = assignPads(PAD_LEVELS.find((x) => x.id === 'gamme'), '4x4', { lefty: true });
  assert.deepEqual(m.map((x) => x.idx), [3, 2, 1, 0, 7, 6, 5, 4]);
});
