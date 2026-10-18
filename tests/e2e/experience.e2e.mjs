// Navigation progressive, thème, accessibilité, mode gaucher, partage par lien, « Quoi de neuf » et visite guidée.
export const tests = {
  'labs progressifs puis « tout afficher »': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/labs');
    t.assert.ok(await page.locator('text=/ateliers avancés se débloquent/').count());
    t.assert.equal(await page.locator('.tile:has-text("Mixdown express")').count(), 0);
    await page.store('s.xp = 5000;');
    await page.go('#/labs');
    t.assert.ok(await page.locator('.tile:has-text("Mixdown express")').count(), 'débloqué avec le niveau');
  },
  'thème clair, animations réduites, focus clavier, libellés': async (t) => {
    const page = await t.open();
    await page.go('#/profile');
    await page.click('.ctrl-row:has-text("Thème") >> text=☀️ Clair'); await page.waitForTimeout(150);
    t.assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    t.assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(244, 244, 250)');
    await page.click('.ctrl-row:has-text("Animations") >> text=Réduites'); await page.waitForTimeout(150);
    t.assert.equal(await page.evaluate(() => document.documentElement.dataset.motion), 'reduce');
    // tous les boutons ont un nom accessible
    const unnamed = await page.evaluate(() => [...document.querySelectorAll('button, a')].filter((b) => b.offsetParent && !(b.getAttribute('aria-label') || b.textContent.trim())).map((b) => b.outerHTML.slice(0, 80)));
    t.assert.deepEqual(unnamed, []);
    t.assert.equal(await page.evaluate(() => document.querySelector('meta[name=viewport]').content.includes('user-scalable=no')), false, 'le zoom reste possible');
  },
  'mode gaucher : la disposition des pads est inversée': async (t) => {
    const page = await t.open();
    await page.store("s.pads = { lefty: true, best: {}, learn: {} };");
    await page.go('#/pads?level=backbeat');
    const cells = await page.locator('.pad-mini span').allInnerTexts();
    t.assert.match(cells[7], /Kick/, `bas à droite : ${cells[7]}`);
  },
  'partage par lien : copier, ouvrir, écouter, ajouter au carnet': async (t) => {
    const page = await t.open({ permissions: ['clipboard-read', 'clipboard-write'] });
    await page.store('s.project.bpm = 133;');
    await page.go('#/melody');
    await page.click('.mini-info'); await page.waitForTimeout(200);
    await page.click('text=🔗 Partager'); await page.waitForTimeout(400);
    const url = await page.evaluate(() => navigator.clipboard.readText());
    t.assert.match(url, /#\/listen\?i=z/);
    const friend = await t.open({ device: 'mobile', name: 'ami' });
    await friend.goto(url); await friend.waitForTimeout(700);
    t.assert.match(await friend.locator('.card.glow').innerText(), /133 BPM/);
    await friend.click('text=▶ Écouter'); await friend.waitForTimeout(500);
    t.assert.match(await friend.locator('button.play').innerText(), /Stop/);
    await friend.click('text=📓 Ajouter au Carnet'); await friend.waitForTimeout(200);
    t.assert.equal((await friend.state()).notebook[0].project.bpm, 133);
  },
  'quoi de neuf (mise à jour) et visite guidée': async (t) => {
    const page = await t.open({ onboard: false });
    await page.evaluate(() => localStorage.setItem('beatforge.v1', JSON.stringify({ v: 2, xp: 50, days: {}, settings: { onboarded: true } })));
    await page.reload(); await page.waitForTimeout(1200);
    t.assert.ok(await page.locator('.modal-card >> text=Quoi de neuf').count());
    await page.click('text=🧭 Visite guidée'); await page.waitForTimeout(300);
    const seen = [];
    for (let i = 0; i < 10; i++) {
      seen.push(new URL(page.url()).hash);
      const next = page.locator('.tour-bubble >> text=/Suivant|C’est parti/');
      if (!(await next.count())) break;
      await next.click(); await page.waitForTimeout(350);
    }
    t.assert.ok(seen.length >= 6, seen.join(' '));
    t.assert.equal(await page.locator('.tour-bubble').count(), 0);
    await page.reload(); await page.waitForTimeout(1000);
    t.assert.equal(await page.locator('.modal-card >> text=Quoi de neuf').count(), 0, 'affiché une seule fois');
  },
};
