// Styles : Hard Trance / Hard House, top 3 des styles préférés, Analyse de référence désactivée.
export const tests = {
  'hard trance et hard house : fiches, démo, références': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/atlas', 400);
    const atlas = await page.locator('#view').innerText();
    t.assert.match(atlas, /Hard Trance[\s\S]*155 BPM/);
    t.assert.match(atlas, /Hard House[\s\S]*145 BPM/);
    t.assert.match(atlas, /\/22 styles/);
    await page.go('#/atlas?g=hardtrance', 400);
    t.assert.match(await page.locator('#view').innerText(), /Fenrick · L\.Zwo · Kichta · 2HOT2PLAY/);
    await page.locator('button.play').first().click(); await page.waitForTimeout(1200);
    await page.locator('button.play').first().click();
    await page.go('#/atlas?g=hardhouse', 400);
    t.assert.match(await page.locator('#view').innerText(), /Marlon Hoffstadt · Malugi · Kettama/);
  },

  'top 3 des styles préférés : profil, atlas, remplacement du 3e': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/profile', 500);
    const sel = (i) => page.locator(`select[aria-label="Style préféré n°${i}"]`);
    t.assert.ok(await sel(2).isDisabled(), 'on remplit dans l’ordre');
    await sel(1).selectOption('hardtrance'); await page.waitForTimeout(150);
    await sel(2).selectOption('hardhouse'); await page.waitForTimeout(150);
    await sel(3).selectOption('techno'); await page.waitForTimeout(150);
    t.assert.deepEqual((await page.state()).settings.favGenres, ['hardtrance', 'hardhouse', 'techno']);
    t.assert.equal(await sel(2).locator('option[value="hardtrance"]').count(), 0, 'pas deux fois le même style');
    await page.go('#/atlas', 400);
    t.assert.match(await page.locator('#view').innerText(), /Tes styles préférés\s*⚡\s*Hard Trance/);
    // Ajout depuis une fiche quand le top est plein : remplace le 3e
    await page.go('#/atlas?g=house', 400);
    await page.click('text=❤️ Ajouter à mes favoris'); await page.waitForTimeout(150);
    t.assert.deepEqual((await page.state()).settings.favGenres, ['hardtrance', 'hardhouse', 'house']);
    t.assert.equal(await page.locator('button[aria-pressed="true"]:has-text("Retirer de mes favoris")').count(), 1);
    await page.click('text=💔 Retirer de mes favoris'); await page.waitForTimeout(150);
    t.assert.deepEqual((await page.state()).settings.favGenres, ['hardtrance', 'hardhouse']);
    // Retirer le 1er depuis le profil fait remonter les autres
    await page.go('#/profile', 500);
    await sel(1).selectOption(''); await page.waitForTimeout(150);
    t.assert.deepEqual((await page.state()).settings.favGenres, ['hardhouse']);
  },

  'analyse de référence désactivée : plus de lien, l’ancienne adresse revient à l’accueil': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.store('s.xp = 5000; s.settings.allModules = true;');
    for (const r of ['#/labs', '#/studio']) {
      await page.go(r, 400);
      t.assert.equal(await page.locator('text=Analyse de référence').count(), 0, r);
    }
    await page.goto(page.url().split('#')[0] + '#/analyze'); await page.waitForTimeout(600);
    t.assert.ok(await page.locator('text=⚡ Lancer une session').count(), 'redirigé vers l’accueil');
  },
};
