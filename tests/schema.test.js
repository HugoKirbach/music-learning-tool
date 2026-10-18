import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA, migrate, looksValid } from '../src/core/schema.js';

test('migration v1 → courante : rien n\'est perdu, champs manquants ajoutés', () => {
  const v1 = { v: 1, xp: 420, days: { '2026-10-01': { xp: 40 } }, notebook: [{ id: 1, title: 'A' }, null], project: { genre: 'house' }, rush: { best: { lune: { stars: 2 } } } };
  const { state, from, newer } = migrate(JSON.parse(JSON.stringify(v1)));
  assert.equal(from, 1);
  assert.equal(newer, false);
  assert.equal(state.v, SCHEMA);
  assert.equal(state.xp, 420);
  assert.deepEqual(state.days, v1.days);
  assert.deepEqual(state.notebook, [{ id: 1, title: 'A' }]);
  assert.deepEqual(state.recent, []);
  assert.deepEqual(state.project.mutes, {});
  assert.deepEqual(state.rush.learn, {});
  assert.deepEqual(state.rush.best, v1.rush.best);
});

test('version plus récente : laissée telle quelle et signalée', () => {
  const s = { v: SCHEMA + 3, xp: 1, days: {} };
  const r = migrate(s);
  assert.equal(r.newer, true);
  assert.equal(r.state.v, SCHEMA + 3);
});

test('détection des sauvegardes invalides', () => {
  assert.ok(looksValid({ v: 1, xp: 0, days: {} }));
  assert.ok(looksValid({ xp: 3 }));
  assert.ok(!looksValid(null));
  assert.ok(!looksValid({ xp: 'beaucoup' }));
  assert.ok(!looksValid({ xp: -1 }));
  assert.ok(!looksValid({ v: 0, xp: 1 }));
});
