// Boîte à idées téléphone → PC, erreurs récurrentes + exercice ciblé, parcours de style.
export const tests = {
  'boîte à idées : noté sur le téléphone, retrouvé et fini sur le PC': async (t) => {
    const phone = await t.open({ device: 'mobile' });
    t.assert.match(await phone.locator('.home-capture').innerText(), /Une idée qui passe/);
    await phone.clickC('.home-capture >> text=📝 Une note'); await phone.waitForTimeout(400);
    await phone.fill('.modal-card input[type=text]', 'Hook dans le métro');
    await phone.click('.modal-card >> text=Enregistrer'); await phone.waitForTimeout(200);
    await phone.store("s.notebook.unshift({ id: 42, type: 'beat', title: 'Beat du bus', date: Date.now(), genre: 'house', bpm: 124, swing: 0, drums: s.project.drums });");
    const st = await phone.state();
    t.assert.deepEqual(st.notebook.slice(0, 2).map((n) => [n.title, n.inbox]), [['Beat du bus', true], ['Hook dans le métro', true]]);
    await phone.go('#/notebook', 300);
    t.assert.equal(await phone.locator('.inbox-tag').count(), 2);
    // Même progression sur le PC (comme après une synchro)
    const pc = await t.open();
    await pc.evaluate((data) => localStorage.setItem('beatforge.v1', data), JSON.stringify(st));
    await pc.reload(); await pc.waitForTimeout(500);
    t.assert.match(await pc.locator('.home-inbox').innerText(), /Idées du téléphone à finir \(2\)[\s\S]*Beat du bus[\s\S]*Hook dans le métro/);
    const [dl] = await Promise.all([pc.waitForEvent('download'), pc.click('.inbox-item:has-text("Beat du bus") >> text=⬇ MIDI')]);
    t.assert.match(dl.suggestedFilename(), /\.mid$/);
    await pc.click('.inbox-item:has-text("Beat du bus") >> text=✓ Fait'); await pc.waitForTimeout(200);
    t.assert.match(await pc.locator('.home-inbox').innerText(), /\(1\)/);
    // Une idée créée sur PC ne part pas dans la boîte
    await pc.store("s.notebook.unshift({ id: 43, type: 'note', title: 'Note PC', date: Date.now() });");
    t.assert.equal((await pc.state()).notebook[0].inbox, undefined);
  },

  'erreurs récurrentes : repérées, proposées, réglées par un exercice ciblé': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.evaluate(async () => {
      const m = await import('/src/store.js');
      for (let i = 0; i < 3; i++) m.recordReview('intervals:4', false, false, 5);
      m.recordGameReview('rush:pulse', false); m.recordGameReview('rush:pulse', false);
    });
    await page.go('#/progress', 500);
    const card = await page.locator('.card:has-text("Tes erreurs récurrentes")').innerText();
    t.assert.match(card, /Tu confonds souvent Tierce majeure et Quarte juste/);
    t.assert.match(card, /« Rondes et blanches » raté 2 fois/);
    await page.go('#/home', 400);
    t.assert.match(await page.locator('#view').innerText(), /Tu confonds souvent Tierce majeure et Quarte juste/);
    await page.go('#/ear?mode=drill&k=intervals%3A4', 500);
    t.assert.match(await page.locator('#view').innerText(), /Exercice ciblé/);
    const plan = ['4', '5', '4', '5', '4', '5'];
    for (const v of plan) {
      await page.waitForSelector('button.answer', { timeout: 4000 });
      const labels = await page.locator('button.answer').evaluateAll((bs) => bs.map((b) => b.dataset.v));
      t.assert.ok(labels.includes('4') && labels.includes('5'), `les deux notions proposées : ${labels}`);
      await page.click(`button.answer[data-v="${v}"]`); await page.waitForTimeout(150);
      await page.click('[data-key="enter"]'); await page.waitForTimeout(250);
    }
    await page.waitForSelector('.modal-card .result-score', { timeout: 4000 });
    t.assert.equal((await page.state()).errors['intervals:4'].cleared, await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }));
    await page.go('#/progress', 400);
    t.assert.doesNotMatch(await page.locator('.card:has-text("Tes erreurs récurrentes")').innerText(), /Tierce majeure/);
  },

  'parcours Hard Trance : démarrage, étapes auto et manuelles, accueil': async (t) => {
    const page = await t.open();
    await page.store("s.settings.favGenres = ['hardtrance'];");
    await page.go('#/atlas?g=hardtrance', 400);
    await page.click('text=/Parcours Hard Trance \\(6 étapes\\)/'); await page.waitForTimeout(300);
    await page.click('text=▶ Commencer le parcours'); await page.waitForTimeout(300);
    let st = await page.state();
    t.assert.equal(st.project.genre, 'hardtrance');
    t.assert.equal(st.project.bpm, 155);
    t.assert.ok(st.paths.hardtrance.start);
    // Étape 1 validée en faisant l'exercice dans le style
    await page.evaluate(async () => { const m = await import('/src/store.js'); m.recordExercise({ key: 'beat:free', xp: 15, skill: 'rythme', genre: 'hardtrance' }); });
    await page.go('#/path?g=hardtrance', 300);
    t.assert.match(await page.locator('.path-step').first().innerText(), /✅/);
    // Étape 2 (Pad Rush) cochée à la main
    await page.click('.path-step.current >> text=✓ J’ai fait cette étape'); await page.waitForTimeout(200);
    t.assert.match(await page.locator('#view').innerText(), /2\/6 étapes faites/);
    t.assert.match(await page.locator('.path-step.current').innerText(), /La basse roulante/);
    await page.go('#/home', 400);
    t.assert.match(await page.locator('.htile:has-text("Parcours Hard Trance")').innerText(), /2\/6 étapes · La basse roulante/);
  },
};
