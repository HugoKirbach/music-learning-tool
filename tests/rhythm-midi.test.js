import { test } from 'node:test';
import assert from 'node:assert/strict';
import { euclid, parsePattern, compareGrids, gridFromPatterns, shiftRow } from '../src/core/rhythm.js';
import { buildMidi, parseMidi } from '../src/core/midi.js';
import { GENRES } from '../src/data/genres.js';
import { projectToSong, voiceProgression, eventsAt, CHORD_RHYTHMS, BASS_RHYTHMS } from '../src/core/arrange.js';

test('euclidien : tresillo E(3,8)', () => {
  assert.deepEqual(euclid(3, 8), [1, 0, 0, 1, 0, 0, 1, 0]);
  assert.equal(euclid(5, 16).filter(Boolean).length, 5);
  assert.deepEqual(euclid(3, 8, 1), [0, 1, 0, 0, 1, 0, 0, 1]);
});

test('parsing de pattern', () => {
  assert.deepEqual(parsePattern('x.o.'), [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

test('comparaison de grilles', () => {
  const t = gridFromPatterns({ kick: 'x...x...x...x...' });
  assert.equal(compareGrids(t, t).score, 100);
  const u = gridFromPatterns({ kick: 'x...x...........' });
  const r = compareGrids(t, u);
  assert.equal(r.rows.kick.miss, 2);
  assert.ok(r.score > 50 && r.score < 100);
  assert.deepEqual(shiftRow([1, 0, 0, 0], 1), [0, 1, 0, 0]);
});

test('tous les styles sont valides', () => {
  for (const g of GENRES) {
    for (const [k, p] of Object.entries(g.drums)) assert.ok(p.length === 0 || p.length === 16, `${g.id}.${k} longueur ${p.length}`);
    assert.ok(CHORD_RHYTHMS[g.chordStyle], `${g.id} chordStyle`);
    assert.ok(BASS_RHYTHMS[g.bassStyle], `${g.id} bassStyle`);
    assert.equal(g.prog.length, 4);
  }
  assert.equal(GENRES.length, 22);
});

test('MIDI : aller-retour', () => {
  const bytes = buildMidi({ bpm: 124, tracks: [{ name: 'Test', notes: [{ pitch: 60, start: 0, dur: 1, vel: 100 }, { pitch: 64, start: 1.5, dur: 0.25 }] }] });
  const m = parseMidi(bytes);
  assert.equal(m.format, 1);
  assert.equal(m.tracks.length, 2);
  assert.equal(m.tracks[0].tempo, 124);
  assert.deepEqual(m.tracks[1].notes.map((n) => [n.pitch, n.start, n.dur]), [[60, 0, 1], [64, 1.5, 0.25]]);
});

test('export d’une idée complète', () => {
  const g = GENRES.find((x) => x.id === 'house');
  const project = {
    genre: 'house', bpm: 124, rootPc: g.rootPc, scale: g.scale, chords: g.prog, ext: 3, voicing: 'lead',
    chordStyle: g.chordStyle, bassStyle: g.bassStyle, drums: gridFromPatterns(g.drums),
    melody: Array.from({ length: 64 }, (_, i) => (i % 8 === 0 ? { n: 69, len: 2 } : null)),
  };
  const song = projectToSong(project);
  assert.deepEqual(song.tracks.map((t) => t.name), ['Drums', 'Accords', 'Basse', 'Melodie']);
  assert.equal(song.tracks[3].notes.length, 8);
  const bytes = buildMidi(song);
  assert.equal(parseMidi(bytes).tracks.length, 5);
  const v = voiceProgression(project);
  assert.equal(v.length, 4);
  const ev = eventsAt(project, v, 0);
  assert.ok(ev.drums.some((d) => d.id === 'kick'));
});
