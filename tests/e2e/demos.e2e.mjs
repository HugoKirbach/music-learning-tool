// Mini-maquettes Hard Trance / Hard House dans l'Atlas, et correctif audio (pas de courant continu avant les notes).
export const tests = {
  'maquette hard trance : lecture, frise des sections, export MIDI': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/atlas?g=hardtrance', 500);
    t.assert.equal(await page.locator('text=Écouter la démo').count(), 0, 'l’ancienne boucle est remplacée');
    t.assert.deepEqual(await page.locator('.demo-sec b').allInnerTexts(), ['🥁 Intro', '🔁 Groove', '🌌 Break', '🚀 Montée', '💥 Drop', '🌅 Outro']);
    t.assert.match(await page.locator('.card:has-text("Mini-maquette")').innerText(), /155 BPM · 34 mesures[\s\S]*Kichta[\s\S]*2HOT2PLAY[\s\S]*Fenrick/);
    await page.click('text=/Écouter la maquette/'); await page.waitForTimeout(1200);
    t.assert.ok(await page.evaluate(async () => { const a = await import('/src/core/audio.js'); return a.transport.playing && a.transport.owner === 'demo'; }));
    t.assert.match(await page.locator('.demo-sec.on').innerText(), /Intro/);
    t.assert.match(await page.locator('.demo-desc').innerText(), /Intro — Kick saturé/);
    await page.click('text=■ Stop'); await page.waitForTimeout(200);
    t.assert.equal(await page.evaluate(async () => (await import('/src/core/audio.js')).transport.playing), false);
    await page.click('.demo-sec:has-text("Drop")');
    t.assert.match(await page.locator('.demo-desc').innerText(), /Drop — Tout explose/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=⬇ MIDI multipiste (Live)')]);
    t.assert.equal(dl.suggestedFilename(), 'maquette-hardtrance-155bpm.mid');
    // Les autres styles gardent leur démo en boucle
    await page.go('#/atlas?g=house', 400);
    t.assert.ok(await page.locator('text=Écouter la démo').count());
  },

  'maquette hard house : sections, références, lecture jusqu’au drop': async (t) => {
    const page = await t.open();
    await page.go('#/atlas?g=hardhouse', 500);
    t.assert.deepEqual(await page.locator('.demo-sec b').allInnerTexts(), ['🥁 Intro', '🔨 Drop 1', '🌫️ Break', '🚀 Montée', '💥 Drop 2', '🌅 Outro']);
    t.assert.match(await page.locator('.card:has-text("Mini-maquette")').innerText(), /148 BPM[\s\S]*Marlon Hoffstadt[\s\S]*KETTAMA[\s\S]*Kickin’ Hard/);
    await page.click('text=/Écouter la maquette/');
    await page.waitForTimeout(7000); // l'intro dure 4 mesures (~6,5 s)
    t.assert.match(await page.locator('.demo-sec.on').innerText(), /Drop 1/);
    t.assert.ok(await page.locator('.demo-sec.past').count() >= 1);
    await page.go('#/atlas', 300);
    t.assert.equal(await page.evaluate(async () => (await import('/src/core/audio.js')).transport.playing), false, 'la maquette s’arrête en quittant la fiche');
  },

  'audio : niveau stable sur des notes saturées en rafale, silence parfait avant une note programmée': async (t) => {
    const page = await t.open();
    const r = await page.evaluate(async () => {
      const { createSong } = await import('/src/core/demosong.js');
      const { renderDemo } = await import('/src/demoplayer.js');
      const roll = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
      const song = createSong({ title: 't', bpm: 155, kit: 'harddance' }, ({ section }) => section('X', '', 8, '', (s) => {
        s.bass('B', 'trancebass', [41], roll, { to: 2 }); // 2 mesures, silence, puis 2 mesures
        s.bass('B', 'acid', [41], roll, { from: 6 });
      }));
      const buf = await renderDemo(song, { tail: 0 });
      const L = buf.getChannelData(0), sr = buf.sampleRate, bar = 4 * 60 / 155;
      const rms = (b) => { let q = 0, n = 0; for (let i = Math.floor((b + 0.5) * bar * sr); i < (b + 1) * bar * sr; i++) { q += L[i] * L[i]; n++; } return 20 * Math.log10(Math.sqrt(q / n) + 1e-9); };
      return { notes: [rms(0), rms(1)], silence: [rms(3), rms(4)] };
    });
    t.assert.ok(Math.abs(r.notes[0] - r.notes[1]) < 1, `niveau stable : ${r.notes}`);
    t.assert.ok(r.silence.every((x) => x < -45), `silence entre les notes : ${r.silence}`);
  },
};
