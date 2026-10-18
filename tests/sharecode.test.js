import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeProject, decodeProject, sanitizeProject } from '../src/core/sharecode.js';

const base = () => ({ genre: 'house', bpm: 124, swing: 0, rootPc: 9, scale: 'minor', ext: 3, voicing: 'lead', chordStyle: 'stab', bassStyle: 'offbeat', kit: 'club', pump: 0.5,
  chords: [{ deg: 0 }], sounds: { chords: 'stab', bass: 'sub', lead: 'pluck' }, drums: { kick: Array(16).fill(0), snare: Array(16).fill(0) }, melody: Array(64).fill(null), mutes: {} });

test('partage : aller-retour fidèle (compressé)', async () => {
  const p = { ...base(), bpm: 137, rootPc: 2, melody: base().melody.map((x, i) => (i % 8 ? null : { n: 64 + (i % 5), len: 2 })) };
  p.drums.kick[0] = 1; p.drums.snare[4] = 2;
  const code = await encodeProject(p);
  assert.match(code, /^z[\w-]+$/);
  assert.ok(code.length < 600, `code de ${code.length} caractères`);
  const back = await decodeProject(code, base());
  assert.equal(back.bpm, 137);
  assert.equal(back.drums.snare[4], 2);
  assert.deepEqual(back.melody[8], { n: 67, len: 2 }); // 64 + (8 % 5)
});

test('partage : un lien modifié ne peut rien injecter', () => {
  const evil = { genre: '<img onerror=alert(1)>', bpm: 99999, rootPc: -4, scale: 'pirate', kit: 'a b<script>', sounds: { lead: '../../x' }, drums: { kick: ['x', 5] }, melody: [{ n: 500, len: -3 }, 'oops'], chords: [{ deg: 1, evil: { a: 1 } }], __proto__: { hacked: true } };
  const p = sanitizeProject(evil, base());
  assert.equal(p.genre, 'house');
  assert.equal(p.bpm, 200);
  assert.equal(p.rootPc, 0);
  assert.equal(p.scale, 'minor');
  assert.equal(p.kit, 'club');
  assert.equal(p.sounds.lead, 'pluck');
  assert.deepEqual(p.drums.kick.slice(0, 2), [0, 2]);
  assert.deepEqual(p.melody[0], { n: 127, len: 1 });
  assert.equal(p.melody[1], null);
  assert.deepEqual(p.chords[0], { deg: 1 });
  assert.equal(p.hacked, undefined);
});
