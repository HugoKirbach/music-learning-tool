// Accueil : sections titrées, mode Jouer (téléphone) / Studio (PC), jeux en accès direct, accessibilité.
export const tests = {
  'téléphone : mode Jouer d’abord, jeux en accès direct, sans défiler': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.store("s.rush = { best: { pulse: { stars: 3, acc: 95 } } }; s.club = { best: { bar: { stars: 2 } }, crate: {}, nights: 1 };");
    await page.go('#/home', 500);
    t.assert.equal(await page.locator('.home-mode-btn[aria-pressed="true"]').innerText(), '🎮 Jouer');
    const heads = await page.locator('h2.home-h2').allInnerTexts();
    t.assert.deepEqual(heads, ['🎮 Jouer', '☀️ Aujourd’hui', '🎛️ Studio', '📈 Mon suivi']);
    for (const name of ['Nuit au club', 'Piano Rush', 'Pad Rush']) {
      const box = await page.locator(`.htile:has-text("${name}")`).boundingBox();
      t.assert.ok(box && box.y + box.height <= 844 - 64, `${name} visible sans défiler (${box?.y})`);
    }
    t.assert.match(await page.locator('.htile:has-text("Piano Rush")').innerText(), /1\/19\u00a0niveaux · 3\u00a0★/);
    t.assert.match(await page.locator('.htile:has-text("Nuit au club")').innerText(), /2\/15 ★/);
    await page.click('.htile:has-text("Pad Rush")'); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/pads$/);
    await page.go('#/home', 400);
    await page.click('.htile:has-text("Nuit au club")'); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/club$/);
  },

  'PC : mode Studio d’abord, bascule mémorisée': async (t) => {
    const page = await t.open();
    await page.go('#/home', 400);
    t.assert.equal(await page.locator('.home-mode-btn[aria-pressed="true"]').innerText(), '🎛️ Studio');
    t.assert.deepEqual(await page.locator('h2.home-h2').allInnerTexts(), ['☀️ Aujourd’hui', '🎛️ Studio', '🎮 Jouer', '📈 Mon suivi']);
    t.assert.match(await page.locator('.home-live').innerText(), /Brancher la sortie MIDI/);
    await page.click('.home-mode-btn:has-text("Jouer")'); await page.waitForTimeout(200);
    t.assert.equal((await page.state()).settings.homeMode, 'play');
    t.assert.equal(await page.locator('h2.home-h2').first().innerText(), '🎮 Jouer');
    await page.reload(); await page.waitForTimeout(500);
    t.assert.equal(await page.locator('.home-mode-btn[aria-pressed="true"]').innerText(), '🎮 Jouer', 'choix mémorisé');
    // La session express reste là, quel que soit le mode
    t.assert.ok(await page.locator('text=⚡ Lancer une session').count());
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
    t.assert.ok(a11y.sections.every(Boolean) && a11y.sections.length === 4);
    t.assert.deepEqual(a11y.small, [], 'cibles tactiles d’au moins 40 px');
    t.assert.equal(a11y.unnamed, 0);
  },
};
