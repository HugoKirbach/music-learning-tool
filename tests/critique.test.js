import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTrack, compareTracks, TARGETS } from '../src/core/critique.js';
import { crc32, zip, encodeWav } from '../src/core/wav.js';

const sr = 44100;
function tone(freqs, seconds = 20, amp = 0.3) {
  const n = sr * seconds, l = new Float32Array(n), r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0; for (const f of freqs) v += Math.sin((2 * Math.PI * f * i) / sr);
    l[i] = r[i] = (v / freqs.length) * amp * (i % 22050 < 2000 ? 1.5 : 1);
  }
  return [l, r];
}

test('analyse : la bande dominante est bien détectée, mono = largeur nulle', () => {
  const [l, r] = tone([100]);
  const a = analyzeTrack(l, r, sr);
  assert.ok(a.bands.bass > -1, `basses ${a.bands.bass}`);
  assert.ok(a.bands.air < -30);
  assert.ok(a.width < -60, 'signal mono');
  assert.ok(a.correlation > 0.99);
  assert.ok(a.loudness < 0 && a.loudness > -30);
});

test('comparaison : rien à dire face à soi-même, conseils ciblés sinon', () => {
  const [l, r] = tone([100, 1000, 8000]);
  const a = analyzeTrack(l, r, sr);
  assert.deepEqual(compareTracks(a, a), []);
  const quieter = { ...a, loudness: a.loudness - 6, bands: { ...a.bands, sub: a.bands.sub + 8 } };
  const tips = compareTracks(quieter, a);
  assert.match(tips[0].title, /Sub|Moins fort/);
  assert.ok(tips.some((t) => /Moins fort/.test(t.title)) && tips.some((t) => /Sub/.test(t.title)));
  assert.ok(compareTracks(a, TARGETS.club).length > 0);
});

test('export : CRC32, WAV et ZIP valides', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const buf = { numberOfChannels: 2, length: 4, sampleRate: 44100, getChannelData: () => new Float32Array([0, 0.5, -0.5, 1]) };
  const wav = encodeWav(buf);
  assert.equal(new TextDecoder().decode(wav.slice(0, 4)), 'RIFF');
  assert.equal(wav.length, 44 + 4 * 2 * 2);
  const z = zip([{ name: 'a.wav', data: wav }, { name: 'b.txt', data: new TextEncoder().encode('ok') }]);
  const dv = new DataView(z.buffer);
  assert.equal(dv.getUint32(0, true), 0x04034b50);
  assert.equal(dv.getUint32(z.length - 22, true), 0x06054b50);
  assert.equal(dv.getUint16(z.length - 22 + 10, true), 2);
});
