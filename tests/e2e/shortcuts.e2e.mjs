// Raccourcis clavier et mini-lecteur global.
export const tests = {
  'raccourcis clavier': async (t) => {
    const page = await t.open();
    const mp = () => page.locator('.mini-play').innerText();
    await page.keyboard.press('Shift+B'); await page.waitForTimeout(300);
    t.assert.match(page.url(), /#\/beat/);
    await page.keyboard.press('Space'); await page.waitForTimeout(300);
    t.assert.equal(await mp(), '■');
    await page.keyboard.press('Shift+A'); await page.waitForTimeout(400);
    t.assert.equal(await mp(), '■', 'la boucle continue entre les Labs');
    await page.keyboard.press('Digit2'); await page.waitForTimeout(100);
    t.assert.equal((await page.state()).project.mutes.bass, true);
    const bpm = (await page.state()).project.bpm;
    await page.keyboard.press('Equal'); await page.waitForTimeout(100);
    t.assert.equal((await page.state()).project.bpm, bpm + 1);
    await page.keyboard.press('Shift+?'); await page.waitForTimeout(300);
    t.assert.ok(await page.locator('text=Raccourcis clavier').count());
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await page.keyboard.press('Shift+O'); await page.waitForTimeout(500);
    t.assert.equal(await page.locator('#miniplayer').isHidden(), true, 'le mini-lecteur se cache dans les exercices');
    await page.go('#/ear?mode=intervals');
    await page.keyboard.press('Space'); await page.keyboard.press('Digit1'); await page.waitForTimeout(200);
    t.assert.ok(await page.locator('.answer.right, .answer.wrong').count());
  },
  'reprendre + rubriques de Créer': async (t) => {
    const page = await t.open({ device: 'mobile' });
    for (const r of ['beat', 'chords', 'melody']) await page.go('#/' + r, 200);
    await page.go('#/create');
    t.assert.match(await page.locator('.recent-row').innerText(), /Lab Mélodie[\s\S]*Lab Accords[\s\S]*Lab Beat/);
    t.assert.deepEqual(await page.locator('.sec-head h2').allInnerTexts(), ['✍️ Écrire', '🔊 Son & mix', '🧱 Développer', '🎛️ Dans ton studio']);
  },

  'recherche rapide : Ctrl+K, « / », flèches et Entrée': async (t) => {
    const page = await t.open();
    await page.keyboard.press('Control+k'); await page.waitForTimeout(300);
    t.assert.ok(await page.locator('.search-box').count(), 'ouverte par Ctrl+K');
    await page.keyboard.type('camelot'); await page.waitForTimeout(150);
    t.assert.match(await page.locator('.search-item.on').innerText(), /Boîte à outils/);
    await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    t.assert.match(page.url(), /#\/tools$/);
    t.assert.equal(await page.locator('.search-box').count(), 0, 'fermée après le choix');
    await page.keyboard.press('/'); await page.waitForTimeout(300);
    await page.keyboard.type('hard trance'); await page.waitForTimeout(150);
    const items = await page.locator('.search-item').allInnerTexts();
    t.assert.ok(items.some((x) => /Hard Trance[\s\S]*Style/.test(x)), items.join(' | '));
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    t.assert.equal(await page.locator('.search-box').count(), 0, 'Échap ferme');
    // au doigt : le bouton 🔍 des onglets Jouer et Créer
    const phone = await t.open({ device: 'mobile', name: 'tel' });
    await phone.go('#/play');
    await phone.tap('.hub-search'); await phone.waitForTimeout(300);
    await phone.fill('.search-input', 'donk'); await phone.waitForTimeout(150);
    await phone.tap('.search-item >> nth=0'); await phone.waitForTimeout(500);
    t.assert.match(phone.url(), /#\/(pads\?level=hhdonk|atlas\?g=hardhouse|path\?g=hardhouse)/);
  },
};
