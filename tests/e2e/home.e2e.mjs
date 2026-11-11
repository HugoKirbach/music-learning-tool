// Accueil et onglets : jeux d'abord sur téléphone, studio d'abord sur PC, onglets Jouer / Créer / Profil / Réglages, accessibilité.
export const tests = {
  'téléphone : les jeux d’abord, en accès direct, sans défiler': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.store("s.rush = { best: { pulse: { stars: 3, acc: 95 } } }; s.club = { best: { bar: { stars: 2 } }, crate: {}, nights: 1 };");
    await page.go('#/home', 500);
    t.assert.deepEqual(await page.locator('h2.home-h2').allInnerTexts(), ['🎮 Jouer', '☀️ Aujourd’hui', '🎛️ Créer']);
    for (const name of ['Nuit au club', 'Piano Rush', 'Pad Rush', 'Sans le son']) {
      const box = await page.locator(`.htile:has-text("${name}")`).boundingBox();
      t.assert.ok(box && box.y + box.height <= 844 - 64, `${name} visible sans défiler (${box?.y})`);
    }
    t.assert.match(await page.locator('.htile:has-text("Piano Rush")').innerText(), /1\/\d+\u00a0niveaux · 3\u00a0★/);
    t.assert.match(await page.locator('.htile:has-text("Nuit au club")').innerText(), /2\/\d+ ★/);
    await page.click('.htile:has-text("Pad Rush")'); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/pads$/);
    t.assert.equal(await page.locator('.nav-item.active .nav-label').innerText(), 'Extras', 'onglet Extras allumé dans un jeu');
    await page.click('.page-head .back'); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/play$/, 'le retour mène à l’onglet du jeu');
    await page.go('#/home', 400);
    await page.click('.htile:has-text("Sans le son")'); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/club\?silent=1$/);
  },

  'PC : la session et le studio d’abord, puis les jeux': async (t) => {
    const page = await t.open();
    await page.go('#/home', 400);
    t.assert.deepEqual(await page.locator('h2.home-h2').allInnerTexts(), ['☀️ Aujourd’hui', '🎛️ Créer', '🎮 Jouer']);
    t.assert.match(await page.locator('.home-live').innerText(), /Brancher la sortie MIDI/);
    t.assert.ok(await page.locator('text=⚡ Lancer une session').count());
    await page.click('text=Tous les ateliers →'); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/create$/);
    t.assert.deepEqual(await page.locator('.nav-item .nav-label').allInnerTexts(), ['Extras', 'Apprendre', 'Profil', 'Rechercher', 'Raccourcis']);
  },

  'onglets : Jouer, Créer, Profil et Réglages bien rangés': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/play', 400);
    t.assert.ok(await page.locator('.play-feature:has-text("Nuit au club") >> text=🔇 Sans le son').count());
    t.assert.ok(await page.locator('.htile:has-text("Piano Rush")').count() && await page.locator('.htile:has-text("Quiz d’oreille")').count());
    await page.go('#/create', 400);
    await page.click('.idea-step:has-text("Accords")'); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/chords$/);
    t.assert.equal(await page.locator('.nav-item.active .nav-label').innerText(), 'Extras');
    await page.go('#/profile', 400);
    t.assert.equal(await page.locator('text=Diagnostic en direct').count(), 0, 'les réglages ne sont plus dans le profil');
    await page.click('.profile-link:has-text("Réglages")'); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/settings$/);
    t.assert.equal(await page.locator('.nav-item.active .nav-label').innerText(), 'Profil');
    await page.click('.set-jump >> text=Audio'); await page.waitForTimeout(600);
    const top = await page.locator('#set-audio').evaluate((n) => n.getBoundingClientRect().top);
    t.assert.ok(top < 200, `rubrique Audio amenée en haut (${top})`);
    // l'ancienne adresse du compte mène aux réglages
    await page.go('#/profile?account=1', 600);
    t.assert.match(page.url(), /#\/settings\?sec=account$/);
  },

  'accessibilité : sections nommées, cibles tactiles, liens explicites': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/home', 400);
    const a11y = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('section.home-section')].map((s) => document.getElementById(s.getAttribute('aria-labelledby'))?.textContent);
      const small = [...document.querySelectorAll('#view a, #view button')].filter((n) => n.offsetParent && !n.closest('.quest-chips'))
        .map((n) => { const r = n.getBoundingClientRect(); return { t: (n.getAttribute('aria-label') || n.textContent).trim().slice(0, 30), h: Math.round(r.height) }; })
        .filter((x) => x.h < 40);
      const unnamed = [...document.querySelectorAll('#view a, #view button')].filter((n) => !(n.getAttribute('aria-label') || n.textContent).trim()).length;
      return { sections, small, unnamed, h1: document.querySelectorAll('#view h1').length };
    });
    t.assert.equal(a11y.h1, 1);
    t.assert.ok(a11y.sections.every(Boolean) && a11y.sections.length === 3, JSON.stringify(a11y.sections));
    t.assert.deepEqual(a11y.small, [], 'cibles tactiles d’au moins 40 px');
    t.assert.equal(a11y.unnamed, 0);
  },
};
