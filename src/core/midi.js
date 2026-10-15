// Écriture de fichiers MIDI standard (SMF type 1). Module pur.
// Les positions/durées sont exprimées en temps (noires) : 0.25 = une double-croche.

export const PPQ = 480;

function vlq(n) {
  n = Math.max(0, Math.round(n));
  const bytes = [n & 0x7f];
  while ((n >>= 7) > 0) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}

const str = (s) => [...s].map((c) => c.charCodeAt(0) & 0x7f);
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n) => [(n >> 8) & 255, n & 255];

function chunk(type, data) {
  return [...str(type), ...u32(data.length), ...data];
}

function trackData(events) {
  // events: {tick, data:number[], order}
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const out = [];
  let last = 0;
  for (const e of events) {
    out.push(...vlq(e.tick - last), ...e.data);
    last = e.tick;
  }
  out.push(...vlq(0), 0xff, 0x2f, 0x00);
  return out;
}

/**
 * @param {{bpm:number, tracks:{name:string, channel?:number, notes:{pitch:number,start:number,dur:number,vel?:number}[]}[]}} song
 * @returns {Uint8Array}
 */
export function buildMidi({ bpm = 120, tracks = [], timeSig = [4, 4] }) {
  const mpq = Math.round(60000000 / bpm);
  const tempoTrack = trackData([
    { tick: 0, order: 0, data: [0xff, 0x03, ...vlq(5), ...str('Tempo')] },
    { tick: 0, order: 1, data: [0xff, 0x51, 0x03, (mpq >> 16) & 255, (mpq >> 8) & 255, mpq & 255] },
    { tick: 0, order: 2, data: [0xff, 0x58, 0x04, timeSig[0], Math.log2(timeSig[1]), 24, 8] },
  ]);
  const chunks = [chunk('MTrk', tempoTrack)];
  for (const t of tracks) {
    const ch = (t.channel ?? 0) & 15;
    const name = str(t.name || 'Track');
    const ev = [{ tick: 0, order: 0, data: [0xff, 0x03, ...vlq(name.length), ...name] }];
    for (const n of t.notes) {
      const on = Math.round(n.start * PPQ);
      const off = Math.max(on + 1, Math.round((n.start + n.dur) * PPQ));
      const p = Math.max(0, Math.min(127, n.pitch));
      const v = Math.max(1, Math.min(127, Math.round(n.vel ?? 100)));
      ev.push({ tick: on, order: 2, data: [0x90 | ch, p, v] });
      ev.push({ tick: off, order: 1, data: [0x80 | ch, p, 0] });
    }
    chunks.push(chunk('MTrk', trackData(ev)));
  }
  const header = chunk('MThd', [...u16(1), ...u16(chunks.length), ...u16(PPQ)]);
  return new Uint8Array([...header, ...chunks.flat()]);
}

/** Relit un fichier produit par buildMidi (utilisé par les tests). */
export function parseMidi(bytes) {
  let p = 0;
  const rd = (n) => { const v = bytes.slice(p, p + n); p += n; return v; };
  const num = (n) => [...rd(n)].reduce((s, b) => s * 256 + b, 0);
  const readVlq = () => { let v = 0, b; do { b = bytes[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  if (String.fromCharCode(...rd(4)) !== 'MThd') throw new Error('Pas un fichier MIDI');
  num(4);
  const format = num(2), ntracks = num(2), ppq = num(2);
  const tracks = [];
  for (let t = 0; t < ntracks; t++) {
    rd(4); const len = num(4); const end = p + len;
    let tick = 0; const notes = []; const open = {}; let tempo = null;
    while (p < end) {
      tick += readVlq();
      const st = bytes[p++];
      if (st === 0xff) {
        const type = bytes[p++]; const l = readVlq(); const d = rd(l);
        if (type === 0x51) tempo = Math.round(60000000 / ((d[0] << 16) | (d[1] << 8) | d[2]));
      } else if ((st & 0xf0) === 0x90 && bytes[p + 1] > 0) {
        open[bytes[p]] = { pitch: bytes[p], start: tick / ppq, vel: bytes[p + 1] }; p += 2;
      } else if ((st & 0xf0) === 0x80 || (st & 0xf0) === 0x90) {
        const n = open[bytes[p]]; if (n) { n.dur = tick / ppq - n.start; notes.push(n); delete open[bytes[p]]; } p += 2;
      } else p += 2;
    }
    tracks.push({ notes, tempo });
  }
  return { format, ppq, tracks };
}
