// Studio : sortie MIDI (canaux par instrument, son de l'app coupé), suivi du tempo de Live (horloge MIDI), pack Live.
export const tests = {
  'sortie MIDI : canaux par instrument, son de l’app coupé': async (t) => {
    const page = await t.open({ midi: true });
    await page.go('#/profile', 600);
    await page.clickC('.card:has-text("Studio : jouer avec tes vrais sons") >> text=Activer'); await page.waitForTimeout(500);
    t.assert.match(await page.locator('.card:has-text("Studio : jouer")').innerText(), /Envoi vers « loopMIDI BeatForge »/);
    await page.clickC('text=Couper (seulement Live)'); await page.waitForTimeout(300);
    await page.go('#/melody');
    await page.store('s.project.melody[0] = { n: 72, len: 4 }; s.project.melody[16] = { n: 74, len: 4 };');
    await page.click('.mini-play'); await page.waitForTimeout(2500); await page.click('.mini-play');
    const sent = await page.evaluate(() => window.__sent);
    const status = new Set(sent.map((m) => m[0]));
    t.assert.ok(status.has(0x99), 'batterie sur le canal 10');
    t.assert.ok(status.has(0x91), 'accords sur le canal 2');
    t.assert.ok(status.has(0x92), 'basse sur le canal 3');
    t.assert.ok(status.has(0x90), 'mélodie sur le canal 1');
    t.assert.ok(sent.some((m) => m[0] === 0x99 && m[1] === 36), 'kick = note 36');
    const info = await page.evaluate(async () => (await import('/src/core/audio.js')).audioInfo());
    t.assert.equal(info.voices, 0, 'son de l’app coupé : aucune voix de synthé');
  },
  'suivre le tempo de Live : horloge, Start, Stop': async (t) => {
    const page = await t.open({ midi: true });
    await page.go('#/profile', 600);
    await page.clickC('text=Suivre l’horloge MIDI'); await page.waitForTimeout(200);
    await page.go('#/beat');
    await page.evaluate(() => new Promise((res) => {
      const per = 60000 / 128 / 24;
      let i = 0;
      const t0 = performance.now();
      window.__midi(0xfa);
      // comme un vrai port MIDI : chaque top porte son horodatage exact
      const id = setInterval(() => { window.__midiAt(t0 + i * per, 0xf8); if (++i > 80) { clearInterval(id); res(); } }, 15);
    }));
    await page.waitForTimeout(300);
    const s = await page.state();
    t.assert.ok(Math.abs(s.project.bpm - 128) <= 2, `tempo suivi : ${s.project.bpm}`);
    t.assert.equal(await page.locator('.mini-play').innerText(), '■', 'Start dans Live lance l’idée');
    await page.evaluate(() => window.__midi(0xfc)); await page.waitForTimeout(200);
    t.assert.equal(await page.locator('.mini-play').innerText(), '▶', 'Stop dans Live l’arrête');
  },
  'pack Live : MIDI + WAV + lisez-moi dans un ZIP': async (t) => {
    const page = await t.open();
    await page.go('#/melody');
    await page.click('.mini-info'); await page.waitForTimeout(200);
    const [z] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.click('text=📦 Pack Live')]);
    const fs = await import('node:fs');
    const bytes = fs.readFileSync(await z.path());
    const names = [];
    for (let o = 0; o + 30 < bytes.length && bytes.readUInt32LE(o) === 0x04034b50;) {
      const size = bytes.readUInt32LE(o + 18), nlen = bytes.readUInt16LE(o + 26);
      names.push(bytes.slice(o + 30, o + 30 + nlen).toString());
      o += 30 + nlen + size;
    }
    t.assert.ok(names.some((n) => n.endsWith('.mid')), names.join(', '));
    t.assert.equal(names.filter((n) => n.endsWith('.wav')).length, 5);
    t.assert.ok(names.includes('LISEZ-MOI.txt'));
  },
};
