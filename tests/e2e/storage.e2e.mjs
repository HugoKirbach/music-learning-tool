// Sauvegarde locale : ancien format mis à jour, sauvegarde illisible conservée, copie de secours.
export const tests = {
  'ancien format v1 : mis à jour sans perte': async (t) => {
    const page = await t.open({ onboard: false });
    await page.evaluate(() => {
      localStorage.setItem('beatforge.v1', JSON.stringify({ v: 1, xp: 777, days: { '2026-10-01': { xp: 77, sessions: 1, exercises: 2 } }, notebook: [{ id: 5, type: 'idea', title: 'Vieille idée', date: 1 }], settings: { onboarded: true }, streak: { count: 2, last: '2026-10-01', best: 5 } }));
    });
    await page.reload(); await page.waitForTimeout(600);
    const s = await page.state();
    t.assert.equal(s.v, 2);
    t.assert.equal(s.xp, 777);
    t.assert.equal(s.notebook[0].title, 'Vieille idée');
    t.assert.ok(await page.evaluate(() => !!localStorage.getItem('beatforge.v1.avant-v2')), 'copie avant mise à jour');
    await page.go('#/notebook');
    t.assert.ok(await page.locator('text=Vieille idée').count());
  },
  'sauvegarde illisible : mise de côté, jamais effacée': async (t) => {
    const page = await t.open({ onboard: false });
    await page.evaluate(() => localStorage.setItem('beatforge.v1', '{"xp": "cassé"'));
    await page.reload(); await page.waitForTimeout(600);
    t.assert.equal(await page.evaluate(() => localStorage.getItem('beatforge.v1.illisible')), '{"xp": "cassé"');
  },
  'réinitialiser puis restaurer la copie de secours': async (t) => {
    const page = await t.open();
    await page.store('s.xp = 321;');
    await page.go('#/profile');
    page.on('dialog', (d) => d.accept());
    await page.clickC('text=♻️ Réinitialiser'); await page.waitForTimeout(800);
    t.assert.equal((await page.state()).xp, 0);
    await page.click('text=C’est parti'); await page.waitForTimeout(200); // l'accueil réapparaît après une réinitialisation
    await page.go('#/profile');
    await page.clickC('.card:has-text("Sauvegarde en fichier") >> text=Restaurer'); await page.waitForTimeout(400);
    t.assert.equal((await page.state()).xp, 321);
  },
  'export puis import d’un fichier de sauvegarde': async (t) => {
    const page = await t.open();
    await page.store('s.xp = 55;');
    await page.go('#/profile');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=⬇ Exporter')]);
    const path = await dl.path();
    await page.store('s.xp = 1;');
    await page.go('#/profile');
    await page.setInputFiles('input[type=file]', path); await page.waitForTimeout(500);
    t.assert.equal((await page.state()).xp, 55);
  },
};
