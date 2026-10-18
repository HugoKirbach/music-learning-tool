// Parcours d'une session express et des Labs principaux.
export const tests = {
  'session express : enchaîner les étapes': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.click('text=⚡ Lancer une session'); await page.waitForTimeout(600);
    t.assert.match(page.url(), /#\/(ear|beat|chords|melody|synth|callresponse)/);
    for (let i = 0; i < 14; i++) {
      const a = page.locator('button.answer').first();
      if (!(await a.count())) break;
      await a.click(); await page.waitForTimeout(120);
      const next = page.locator('[data-key="enter"]').first();
      if (await next.count()) { await next.click(); await page.waitForTimeout(120); }
    }
    t.assert.ok(await page.locator('.modal-card, .result, .card').count());
  },
  'labs : lecture, export MIDI, validation': async (t) => {
    const page = await t.open();
    for (const r of ['beat', 'chords', 'melody?genre=trap&load=1', 'atlas?g=bossa']) {
      await page.go('#/' + r, 250);
      await page.locator('button.play').first().click(); await page.waitForTimeout(700);
      await page.locator('button.play').first().click();
    }
    await page.go('#/beat');
    await page.locator('.cell').nth(20).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=⬇ MIDI')]);
    t.assert.match(dl.suggestedFilename(), /\.mid$/);
    await page.click('text=✓ Valider'); await page.waitForTimeout(300);
    t.assert.ok(await page.locator('.xp-gain').count());
    await page.click('.modal-card >> text=Continuer');
    await page.go('#/melody');
    await page.click('text=🌱 Graine'); await page.click('text=AABA');
    await page.click('text=✓ Valider'); await page.waitForTimeout(300);
    t.assert.ok(await page.locator('.result-score').count());
  },
  'fredonne : micro simulé → notes transcrites': async (t) => {
    const page = await t.open({ device: 'mobile', route: '#/home' });
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const ac = new AudioContext();
        const o = ac.createOscillator(); o.type = 'triangle';
        const notes = [69, 72, 76, 74];
        for (let i = 0; i < 80; i++) o.frequency.setValueAtTime(440 * 2 ** ((notes[i % 4] - 69) / 12), ac.currentTime + i * 0.48);
        const d = ac.createMediaStreamDestination(); o.connect(d); o.start();
        return d.stream;
      };
    });
    await page.go('#/hum');
    await page.click('text=🎤 Activer le micro'); await page.waitForTimeout(700);
    await page.click('text=/Enregistrer/');
    await page.waitForSelector('text=/notes transcrites|Pas assez/', { timeout: 30000 });
    t.assert.ok(await page.locator('text=/notes transcrites/').count(), 'des notes doivent être transcrites');
  },
};
