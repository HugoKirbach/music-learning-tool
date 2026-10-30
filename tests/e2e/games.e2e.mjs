// Piano Rush et Pad Rush : parties jouées par un robot, apprentissage, défi à l'oreille, assistant MIDI.
export const tests = {
  'piano rush : partie complète + conclusion': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/rush?level=lune');
    await page.click('text=▶ Jouer');
    for (let i = 0; i < 60 && !(await page.locator('.rush-result').count()); i++) {
      const b = await page.locator('canvas').boundingBox({ timeout: 1000 }).catch(() => null); // la partie peut finir entre deux tapes
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
    await page.click('.game-opts > summary'); await page.waitForTimeout(150);
    await page.click('text=🎛️ Assistant pads MIDI'); await page.waitForTimeout(300);
    for (let i = 0; i < 8; i++) await page.evaluate((n) => window.__midi(0x90, n, 90), 60 + i);
    await page.click('text=Enregistrer'); await page.waitForTimeout(200);
    t.assert.equal(Object.keys((await page.state()).pads.map).length, 8);
  },
  'pad rush : défi à l’oreille réussi → solution en vert et niveau validé dans le parcours': async (t) => {
    const page = await t.open({ midi: true });
    await page.go('#/pads?level=otf');
    // Frappes calées sur l'horloge audio du jeu (et non sur performance.now, qui dérive par rapport à elle)
    await page.evaluate(async () => {
      const { now, outputLatency } = await import('./src/core/audio.js');
      const spb = 0.6, base = 4 * spb, t0 = now() + 0.2 + 2 * base + 4 * spb;
      [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Défi à l’oreille')).click();
      let b = 0;
      const id = setInterval(() => {
        if (now() - outputLatency() < t0 + b * spb) return;
        window.__midi(0x90, 36, 100); setTimeout(() => window.__midi(0x80, 36, 0), 50);
        if (++b >= 8) clearInterval(id);
      }, 2);
    });
    await page.waitForSelector('.rush-result', { timeout: 25000 });
    const acc = Number((await page.locator('.rush-result .big').innerText()).replace(/\D/g, ''));
    t.assert.ok(acc >= 80, `précision ${acc} %`);
    t.assert.ok(await page.locator('.ps-cells i.hit').count() >= 4, 'coups trouvés en vert');
    t.assert.equal(await page.locator('.ps-cells i.missed').count(), 0, 'aucun coup marqué manqué');
    const best = (await page.state()).pads.best;
    t.assert.ok(best.otf?.stars >= 1, 'niveau validé dans le parcours');
    t.assert.ok(best['otf@ear']?.stars >= 1);
  },
  'menus : niveau à jouer en tête, chapitres et options repliés, interrupteurs sans re-rendu': async (t) => {
    const page = await t.open({ device: 'mobile' });
    // Profil neuf : « Commencer » sur le 1er niveau, seul le chapitre 1 est ouvert
    await page.go('#/pads', 400);
    t.assert.match(await page.locator('.game-hero').innerText(), /Premier niveau[\s\S]*1\. Four on the floor/i);
    t.assert.equal(await page.locator('.game-hero button.primary').innerText(), '▶ Commencer');
    t.assert.deepEqual(await page.locator('details.game-ch[open] .gc-txt b').allInnerTexts(), ['Chapitre 1 · Les bases']);
    t.assert.equal(await page.locator('details.game-ch').count(), 6);
    t.assert.doesNotMatch(await page.locator('#view').innerText(), /\brolls\b/);
    // Joueur en cours : le niveau suivant est en tête, chapitre en cours ouvert, chapitre terminé replié
    await page.store("s.rush = { best: { pulse: { stars: 3 }, lune: { stars: 2 }, marche: { stars: 1 }, joie: { stars: 1 }, cloches: { stars: 2 }, jacques: { stars: 1 } } };");
    await page.go('#/rush', 400);
    t.assert.match(await page.locator('.game-hero').innerText(), /Prochain niveau[\s\S]*7\. /i);
    t.assert.equal(await page.locator('.game-hero button.primary').innerText(), '▶ Continuer');
    t.assert.deepEqual(await page.locator('details.game-ch[open] .gc-txt b').allInnerTexts(), ['Chapitre 2 · Croches & silences']);
    t.assert.match(await page.locator('details.game-ch').first().locator('summary').innerText(), /9\/15 ★[\s\S]*terminé/);
    t.assert.equal(await page.locator('.rush-level.next').count(), 1);
    t.assert.equal(await page.locator('.rush-level').evaluateAll((bs) => bs.filter((b) => /🥁 Rythme|🎼 Accords/.test(b.textContent)).length), 0, 'plus d’étiquette de compétence répétée');
    // Options repliées ; un interrupteur change l'état sans refermer le volet
    t.assert.equal(await page.locator('details.game-opts[open]').count(), 0);
    await page.click('.game-opts > summary'); await page.waitForTimeout(150);
    const metro = page.locator('.opt-toggle:has-text("Métronome")');
    t.assert.equal(await metro.getAttribute('aria-pressed'), 'true');
    t.assert.ok(!(await metro.evaluate((b) => b.classList.contains('primary'))), 'pas le style du bouton principal');
    await metro.click(); await page.waitForTimeout(150);
    t.assert.equal(await metro.getAttribute('aria-pressed'), 'false');
    t.assert.equal((await page.state()).rush.metro, false);
    t.assert.equal(await page.locator('details.game-opts[open]').count(), 1, 'le volet reste ouvert');
    t.assert.doesNotMatch(await page.locator('.game-opts summary').innerText(), /métronome/);
    // Un chapitre ouvert à la main reste ouvert après une partie (retour au menu)
    await page.locator('details.game-ch').first().locator('summary').click();
    await page.locator('details.game-ch').first().locator('.rush-level').first().click(); await page.waitForTimeout(200);
    await page.click('.page-head .back'); await page.waitForTimeout(200);
    t.assert.equal(await page.locator('details.game-ch[open]').count(), 2);
    t.assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'pas de débordement');
  },
  'nouveaux niveaux : chaque partition se lance et s’affiche sans erreur': async (t) => {
    const page = await t.open({ device: 'mobile' });
    const NEW_RUSH = ['marche', 'cloches', 'saints', 'galop', 'mineurs', 'arpeges', 'contretemps', 'anticipation', 'triolets', 'doubles', 'anniversaire', 'sus', 'dorien', 'synthwave', 'ragtime'];
    const NEW_PADS = ['htgroove', 'hhdonk', 'offhat', 'rock', 'techno', 'halftime', 'crescendo', 'offaccent', 'neosoul', 'buildup', 'triplethats', 'shuffle', 'dnb', 'arpege', 'hookpads', 'poppads'];
    for (const [route, ids] of [['rush', NEW_RUSH], ['pads', NEW_PADS]]) {
      for (const id of ids) {
        await page.go(`#/${route}?level=${id}`, 250);
        t.assert.ok(await page.locator('text=▶ Jouer').count(), `${route}/${id} : intro`);
        await page.click('text=▶ Jouer'); await page.waitForTimeout(700);
        t.assert.ok(await page.evaluate(() => document.body.classList.contains('rush-playing')), `${route}/${id} : partie lancée`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        t.assert.ok(overflow <= 2, `${route}/${id} : débordement ${overflow}px`);
      }
    }
  },
};
