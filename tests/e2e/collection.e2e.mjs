// 🏅 Collection : succès rattrapés au démarrage, cartes de légende, écran Collection, profil.
export const tests = {
  'mise à jour : succès déjà remplis et cartes attribués au démarrage, puis visibles dans la collection': async (t) => {
    const page = await t.open({ device: 'mobile' });
    // Un joueur qui avait déjà fini le chapitre 1 de Piano Rush et 2 soirées au club, avec 2 anciens badges sans cartes
    await page.store("s.badges = { first: '2026-10-01', streak3: '2026-10-02' }; s.rush = { best: { pulse: { stars: 3 }, lune: { stars: 2 }, marche: { stars: 1 }, joie: { stars: 1 }, cloches: { stars: 1 } } }; s.club = { nights: 2, crate: {}, best: {} };");
    await page.reload(); await page.waitForTimeout(3200);
    const toasts = (await page.locator('.toast').allInnerTexts()).join(' | ');
    t.assert.match(toasts, /Premières touches|nouveaux succès/);
    const st = await page.state();
    for (const id of ['rush1', 'rushCh1', 'club1']) t.assert.ok(st.badges[id], id);
    t.assert.equal(Object.keys(st.cards).length, Object.keys(st.badges).length, 'une carte par succès');
    await page.go('#/collection', 500);
    const head = await page.locator('.stat-grid').first().innerText();
    t.assert.match(head, new RegExp(`${Object.keys(st.badges).length}/\\d+\\s*succès`));
    t.assert.equal(await page.locator('.legend-card:not(.locked)').count(), Object.keys(st.cards).length);
    await page.locator('.legend-card:not(.locked) summary').first().click();
    t.assert.ok((await page.locator('.legend-card[open] p').innerText()).length > 40, 'anecdote affichée');
    t.assert.match(await page.locator('.ach-cat:has-text("Piano Rush")').innerText(), /Dans le temps[\s\S]*🥉/);
    // Profil : résumé + lien
    await page.go('#/profile', 500);
    t.assert.match(await page.locator('.card:has-text("Ma collection")').innerText(), /succès · \d+\/24 cartes/);
    await page.clickC('text=Voir toute la collection'); await page.waitForTimeout(300);
    t.assert.match(page.url(), /#\/collection/);
  },

  'un nouveau succès en jouant annonce aussi sa carte': async (t) => {
    const page = await t.open();
    await page.waitForTimeout(2800); // attribution du démarrage passée
    await page.evaluate(async () => {
      const store = await import('/src/store.js');
      const ui = await import('/src/ui.js');
      store.update((s) => { s.rush = { best: { pulse: { stars: 2 } } }; });
      ui.showBadges(store.recordExercise({ key: 'rush', xp: 10, skill: 'rythme', score: 90 }).badges);
    });
    await page.waitForTimeout(1600);
    const toasts = (await page.locator('.toast').allInnerTexts()).join(' | ');
    t.assert.match(toasts, /Succès débloqué : Premières touches/);
    t.assert.match(toasts, /Nouvelle carte/);
  },
};
