// Stabilité du son : les notes finies sont nettoyées (pas d'accumulation boucle après boucle).
export const tests = {
  'boucle chargée : pas d’accumulation, mode Stable sur mobile': async (t) => {
    const page = await t.open({ device: 'mobile' });
    const info = () => page.evaluate(async () => (await import('/src/core/audio.js')).audioInfo());
    await page.store("s.project.sounds.melody = 'supersaw'; s.project.sounds.chords = 'pad';");
    await page.go('#/melody');
    await page.click('.mini-play');
    const pending = [];
    for (let i = 0; i < 4; i++) { await page.waitForTimeout(3000); pending.push((await info()).pending); }
    const a = await info();
    t.assert.equal(a.mode, 'stable');
    t.assert.ok(Math.max(...pending) < 120, `sons en attente : ${pending}`);
    t.assert.ok(pending[3] <= pending[0] + 15, `doit rester stable : ${pending}`);
    t.assert.ok(a.late <= 3, `notes en retard : ${a.late}`); // tolérance : démarrage à froid du navigateur de test
    await page.click('.mini-play'); await page.waitForTimeout(2600);
    t.assert.equal((await info()).pending, 0);
  },
  'profil : mode audio et diagnostic': async (t) => {
    const page = await t.open();
    await page.go('#/profile');
    await page.click('text=🔧 Diagnostic en direct'); await page.waitForTimeout(600);
    t.assert.ok(await page.locator('.diag-row').count() >= 6);
    await page.click('.card:has-text("Moteur audio") >> text=🛡️ Stable'); await page.waitForTimeout(200);
    t.assert.equal(await page.evaluate(async () => (await import('/src/core/audio.js')).audioMode().stable), true);
  },
};
