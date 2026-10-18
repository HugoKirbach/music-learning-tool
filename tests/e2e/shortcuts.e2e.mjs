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
  'reprendre + familles des Labs': async (t) => {
    const page = await t.open({ device: 'mobile' });
    for (const r of ['beat', 'chords', 'melody']) await page.go('#/' + r, 200);
    await page.go('#/labs');
    t.assert.ok(await page.locator('text=⏱️ Reprendre').count());
    t.assert.ok(await page.locator('.fam-title').count() >= 4);
  },
};
