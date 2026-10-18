// Piano Rush et Pad Rush : parties jouées par un robot, apprentissage, défi à l'oreille, assistant MIDI.
export const tests = {
  'piano rush : partie complète + conclusion': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/rush?level=lune');
    await page.click('text=▶ Jouer');
    for (let i = 0; i < 60 && !(await page.locator('.rush-result').count()); i++) {
      const b = await page.locator('canvas').boundingBox();
      if (b) await page.touchscreen.tap(b.x + 20, b.y + b.height - 30);
      await page.waitForTimeout(450);
    }
    await page.waitForSelector('.rush-result', { timeout: 20000 });
    t.assert.ok(await page.locator('text=Ce que tu as travaillé').count());
  },
  'piano rush : apprentissage note par note + répétitions': async (t) => {
    const page = await t.open();
    await page.go('#/rush?level=lune');
    await page.click('text=🎓 Apprentissage'); await page.waitForTimeout(400);
    const K = { C: 'KeyA', D: 'KeyS', E: 'KeyD' };
    const seq = 'C C C D E D C E D D C C C C D E D C E D D C'.split(' ');
    for (let loop = 0; loop < 2; loop++) for (const n of seq) { await page.keyboard.down(K[n]); await page.waitForTimeout(25); await page.keyboard.up(K[n]); }
    await page.waitForTimeout(300);
    t.assert.match(await page.locator('.rush-hud').innerText(), /🔁 2/);
    t.assert.equal((await page.state()).rush.learn.lune, 2);
  },
  'pad rush : robot MIDI au bon tempo': async (t) => {
    const page = await t.open({ device: 'mobile', midi: true });
    await page.go('#/pads?level=house&mode=libre');
    await page.evaluate(() => {
      const spb = 60 / 122, lead = 4 * spb, t0 = performance.now() + (0.2 + lead) * 1000;
      const hits = [];
      for (let bar = 0; bar < 4; bar++) for (let beat = 0; beat < 4; beat++) {
        const tt = (bar * 4 + beat) * spb;
        hits.push([tt, 36]); if (beat % 2) hits.push([tt, 41]); hits.push([tt + spb / 2, 39]);
      }
      [...document.querySelectorAll('button')].find((x) => x.textContent.includes('▶ Jouer')).click();
      for (const [tt, n] of hits) setTimeout(() => { window.__midi(0x90, n, 100); setTimeout(() => window.__midi(0x80, n, 0), 50); }, t0 + tt * 1000 - performance.now());
    });
    await page.waitForSelector('.rush-result', { timeout: 20000 });
    const acc = Number((await page.locator('.rush-result .big').innerText()).replace(/\D/g, ''));
    t.assert.ok(acc >= 70, `précision ${acc} %`);
  },
  'pad rush : défi à l’oreille, apprentissage, assistant': async (t) => {
    const page = await t.open({ midi: true });
    await page.go('#/pads?level=boombap&mode=libre');
    await page.click('text=🎧 Défi à l’oreille'); await page.waitForTimeout(600);
    t.assert.match(await page.locator('.pads-overlay').innerText(), /Écoute/);
    t.assert.equal(await page.evaluate(() => [...document.querySelectorAll('.pad-ring')].some((r) => +r.style.opacity > 0)), false, 'aucun repère visuel pendant l’écoute');
    await page.click('.rush-hud >> text=✕');
    await page.go('#/pads?level=backbeat');
    await page.click('text=🎓 Apprentissage'); await page.waitForTimeout(300);
    const pads = page.locator('.pad');
    for (let k = 0; k < 2; k++) for (const i of [4, 5]) { await pads.nth(i).dispatchEvent('pointerdown', { pointerId: 1 }); await pads.nth(i).dispatchEvent('pointerup', { pointerId: 1 }); await page.waitForTimeout(50); }
    await page.waitForTimeout(250);
    t.assert.match(await page.locator('.rush-hud').innerText(), /🔁 1/);
    await page.click('.rush-hud >> text=✕');
    await page.go('#/pads');
    await page.click('text=🎛️ Assistant pads MIDI'); await page.waitForTimeout(300);
    for (let i = 0; i < 8; i++) await page.evaluate((n) => window.__midi(0x90, n, 90), 60 + i);
    await page.click('text=Enregistrer'); await page.waitForTimeout(200);
    t.assert.equal(Object.keys((await page.state()).pads.map).length, 8);
  },
};
