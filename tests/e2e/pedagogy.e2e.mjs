// Arbre de compétences, test de la semaine, projet de la semaine, critique de prod.
import { encodeWav } from '../../src/core/wav.js';

function wavBuffer(freqs, seconds = 12, amp = 0.3, stereo = 0) {
  const sr = 44100, n = sr * seconds, l = new Float32Array(n), r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0; for (const f of freqs) v += Math.sin((2 * Math.PI * f * i) / sr);
    const beat = i % 22050 < 3000 ? 1.6 : 1;
    l[i] = (v / freqs.length) * amp * beat;
    r[i] = l[i] * (1 - stereo) + Math.sin(i / 7) * amp * stereo * 0.3;
  }
  return Buffer.from(encodeWav({ numberOfChannels: 2, length: n, sampleRate: sr, getChannelData: (c) => (c ? r : l) }));
}

export const tests = {
  'arbre de compétences : les jeux valident les compétences': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/skills');
    t.assert.match(await page.locator('.card.glow').innerText(), /0\/\d+ compétences/);
    await page.store("s.rush = { best: { lune: { stars: 2, acc: 85 } }, learn: {} }; s.pads = { best: { otf: { stars: 1, acc: 70 } }, learn: {} };");
    await page.go('#/skills');
    t.assert.match(await page.locator('.card.glow').innerText(), /1\/\d+ compétences/);
    t.assert.ok(await page.locator('.skill-node.acquired:has-text("Pulsation")').count());
    t.assert.ok(await page.locator('.skill-node.available:has-text("Croches")').count());
  },
  'test de la semaine : complet, résultats, focus, une fois par semaine': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/home');
    t.assert.ok(await page.locator('text=Test de la semaine').count(), 'proposé sur l’accueil');
    await page.go('#/placement');
    await page.click('text=▶ Commencer le test');
    for (let i = 0; i < 15; i++) {
      await page.waitForSelector('button.answer', { timeout: 5000 });
      await page.locator('button.answer').first().click();
      await page.waitForTimeout(950);
    }
    await page.waitForSelector('.tap-pad');
    const pad = page.locator('.tap-pad');
    await page.waitForTimeout(600 + 4 * 600 - 100);
    for (let k = 0; k < 8; k++) { await pad.dispatchEvent('pointerdown'); await page.waitForTimeout(600); }
    await page.waitForSelector('.placement-bars', { timeout: 8000 });
    const s = await page.state();
    const week = Object.keys(s.placement)[0];
    t.assert.ok(s.placement[week].scores.rythme >= 0 && s.placement[week].global >= 0);
    t.assert.ok(await page.locator('text=Focus de la semaine').count());
    await page.go('#/home');
    t.assert.equal(await page.locator('.card >> text=Passer le test').count(), 0, 'plus proposé cette semaine');
  },
  'projet de la semaine : démarrage, étapes, exports MIDI et WAV': async (t) => {
    const page = await t.open();
    await page.go('#/project');
    await page.click('text=🚀 Démarrer le projet'); await page.waitForTimeout(300);
    t.assert.match(await page.locator('.big-val').innerText(), /0\/7/);
    t.assert.ok((await page.state()).notebook.some((n) => /avant le projet/.test(n.title)));
    await page.go('#/beat');
    await page.click('text=✓ Valider'); await page.waitForTimeout(300);
    await page.click('.modal-card >> text=Continuer');
    await page.go('#/project');
    t.assert.match(await page.locator('.big-val').innerText(), /1\/7/);
    const [mid] = await Promise.all([page.waitForEvent('download'), page.click('text=⬇ MIDI (boucle)')]);
    t.assert.match(mid.suggestedFilename(), /\.mid$/);
    const [z] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('text=⬇ Pistes audio (WAV)')]);
    t.assert.match(z.suggestedFilename(), /\.zip$/);
    const fs = await import('node:fs');
    const bytes = fs.readFileSync(await z.path());
    t.assert.ok(bytes.length > 1_000_000, `ZIP de ${bytes.length} octets`);
    t.assert.equal(bytes.readUInt32LE(0), 0x04034b50);
    await page.waitForTimeout(400);
    t.assert.match(await page.locator('.big-val').innerText(), /2\/7/);
  },
  'critique de prod : import, 3 actions, mesures': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/critique');
    const inputs = page.locator('input[type=file]');
    await inputs.nth(0).setInputFiles({ name: 'ma-prod.wav', mimeType: 'audio/wav', buffer: wavBuffer([60, 120], 12, 0.15) });
    await page.waitForSelector('.crit-table', { timeout: 15000 });
    t.assert.ok(await page.locator('.crit-tips li').count() >= 1);
    await inputs.nth(1).setInputFiles({ name: 'reference.wav', mimeType: 'audio/wav', buffer: wavBuffer([60, 120, 1000, 6000, 9000], 12, 0.4, 0.5) });
    await page.waitForTimeout(1500);
    t.assert.match(await page.locator('.card.glow').innerText(), /reference\.wav/);
    t.assert.ok(await page.locator('.crit-tips li').count() === 3);
    t.assert.ok((await page.state()).log.some((e) => e.key === 'critique'));
  },
  'critique : mesures réalistes sur un vrai mix de l’app (calibrage)': async (t) => {
    const page = await t.open();
    const res = await page.evaluate(async () => {
      const { renderProject } = await import('/src/stems.js');
      const { analyzeTrack } = await import('/src/core/critique.js');
      const { projectFromGenre } = await import('/src/store.js');
      const out = {};
      for (const g of ['house', 'trap', 'lofi']) {
        const buf = await renderProject(projectFromGenre(g), { drums: true, bass: true, chords: true, melody: true }, { loops: 2 });
        out[g] = analyzeTrack(buf.getChannelData(0), buf.getChannelData(1), buf.sampleRate);
      }
      return out;
    });
    console.log('    mesures :', JSON.stringify(res));
    for (const a of Object.values(res)) {
      t.assert.ok(a.loudness > -30 && a.loudness < 0, `niveau ${a.loudness}`);
      t.assert.ok(a.peak <= 0.5, `pas d'écrêtage (${a.peak})`);
      t.assert.ok(a.width > -40 && a.width < 0, `largeur ${a.width}`);
    }
  },
};
