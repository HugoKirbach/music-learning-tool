import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMOS, HARD_TRANCE_DEMO, HARD_HOUSE_DEMO } from '../src/data/demos.js';
import { demoToSong, sectionAt, DEMO_DRUM_MIDI } from '../src/core/demosong.js';
import { PRESETS } from '../src/data/presets.js';
import { KITS } from '../src/core/audio.js';
import { buildMidi } from '../src/core/midi.js';

const kicksOn = (song, sec) => song.events.filter((e) => e.kind === 'drum' && e.id === 'kick' && e.t >= sec.start * 16 && e.t < (sec.start + sec.bars) * 16);

for (const [id, d] of Object.entries(DEMOS)) {
  test(`maquette ${id} : structure, sons, durée`, () => {
    const s = d.song;
    assert.ok(KITS[s.kit], s.kit);
    assert.equal(s.sections.reduce((a, x) => a + x.bars, 0), s.bars);
    assert.ok(s.seconds >= 40 && s.seconds <= 60, `${s.seconds} s`);
    const names = s.sections.map((x) => x.name).join(' ');
    assert.match(names, /Intro.*(Break).*Montée.*Drop.*Outro/);
    for (const e of s.events) {
      assert.ok(e.t >= 0 && e.t < s.steps, `événement hors morceau à ${e.t}`);
      if (e.kind === 'note') { assert.ok(PRESETS[e.preset], e.preset); assert.ok(e.len > 0 && e.midi >= 24 && e.midi <= 96); }
      if (e.kind === 'drum') assert.ok(DEMO_DRUM_MIDI[e.id], e.id);
    }
    // Le kick tient chaque temps dans les drops ; pas de kick pendant le break ni la montée
    for (const sec of s.sections) {
      const k = kicksOn(s, sec);
      if (/^Drop/.test(sec.name)) assert.equal(k.length, sec.bars * 4, `${sec.name} : ${k.length} kicks`);
      if (/Break|Montée/.test(sec.name)) assert.equal(k.length, 0, sec.name);
    }
    // Silence (pas de batterie) sur le dernier temps de la montée : la respiration avant le drop
    const build = s.sections.find((x) => x.name === 'Montée');
    const end = (build.start + build.bars) * 16;
    assert.equal(s.events.filter((e) => e.kind === 'drum' && e.t >= end - 4 && e.t < end).length, 0);
    assert.ok(d.refs.length >= 3 && d.listen);
    assert.equal(sectionAt(s, 0), 0);
    assert.equal(sectionAt(s, s.steps - 1), s.sections.length - 1);
  });
}

test('hard trance : basse roulante entre les kicks, mélodie en Fa mineur', () => {
  const s = HARD_TRANCE_DEMO;
  const drop = s.sections.find((x) => x.name === 'Drop');
  const bass = s.events.filter((e) => e.track === 'Basse' && e.t >= drop.start * 16 && e.t < (drop.start + 1) * 16);
  assert.deepEqual(bass.map((e) => e.t % 4), [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3]);
  const FMIN = new Set([5, 7, 8, 10, 0, 1, 3]);
  s.events.filter((e) => e.kind === 'note').forEach((e) => assert.ok(FMIN.has(e.midi % 12), `${e.track} ${e.midi}`));
  assert.equal(s.bpm, 155);
});

test('hard house : donk sur les contretemps, en Sol mineur, hoover glissé', () => {
  const s = HARD_HOUSE_DEMO;
  const donk = s.events.filter((e) => e.track === 'Donk');
  assert.ok(donk.length > 50);
  assert.ok(donk.every((e) => [2, 3].includes(e.t % 4) || e.t % 16 === 15), 'donk entre les kicks');
  const GMIN = new Set([7, 9, 10, 0, 2, 3, 5]);
  s.events.filter((e) => e.kind === 'note').forEach((e) => assert.ok(GMIN.has(e.midi % 12), `${e.track} ${e.midi}`));
  assert.ok(s.events.some((e) => e.track === 'Hoover' && e.glide));
  assert.equal(s.bpm, 148);
});

test('export MIDI : une piste par instrument, batterie canal 10, sections en marqueurs', () => {
  for (const d of Object.values(DEMOS)) {
    const m = demoToSong(d.song);
    assert.ok(m.tracks.length >= 4);
    assert.equal(m.tracks.find((t) => t.name === 'Batterie').channel, 9);
    assert.ok(m.tracks.filter((t) => t.name !== 'Batterie').every((t) => t.channel !== 9));
    assert.equal(m.markers.length, d.song.sections.length);
    const bytes = buildMidi(m);
    assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'MThd');
  }
});
