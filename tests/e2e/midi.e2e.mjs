// Clavier MIDI simulé (MPC Key 37) : détection, testeur, synthé, pads.
export const tests = {
  'détection, branchement et testeur': async (t) => {
    const page = await t.open({ midi: true, midiConnected: false });
    await page.evaluate(() => window.__plug()); await page.waitForTimeout(300);
    t.assert.match(await page.locator('.chip.midi').getAttribute('class'), /connected/);
    await page.go('#/profile');
    await page.evaluate(() => window.__midi(0x90, 36, 90)); await page.waitForTimeout(150);
    t.assert.ok(await page.locator('text=/note 36/').count());
    await page.go('#/synth');
    await page.evaluate(() => window.__midi(0xb0, 74, 20)); await page.waitForTimeout(150);
    t.assert.ok(await page.locator('[data-param="cutoff"] .slider-val').count());
    await page.evaluate(() => window.__unplug()); await page.waitForTimeout(300);
    t.assert.doesNotMatch(await page.locator('.chip.midi').getAttribute('class'), /connected/);
  },
  'oreille : répondre en jouant les notes': async (t) => {
    const page = await t.open({ midi: true });
    await page.go('#/ear?mode=intervals&n=2', 500);
    const notes = await page.evaluate(() => [...document.querySelectorAll('.answer')].length);
    t.assert.ok(notes > 1);
  },
};
