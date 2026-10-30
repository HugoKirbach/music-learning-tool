// 🪩 Nuit au club : une soirée complète jouée par un robot (réponses, frappes en rythme, mélodies), défaites, vinyles,
// et le mode « sans le son » (grilles, accords, calculs, structures, réglages) sans aucun son joué.

/** Joue la soirée affichée. wrongAt = manches à rater exprès. Renvoie le plan joué. */
export function robot(page, wrongAt = []) {
  return page.evaluate(async (wrongAt) => {
    const C = await import('/src/core/club.js');
    const A = await import('/src/core/audio.js');
    const game = document.querySelector('.club-game');
    const vid = game.dataset.venue, seed = game.dataset.seed;
    const venue = vid === 'daily' ? C.dailyVenue(seed) : C.venueById(vid);
    const silent = game.dataset.silent === '1';
    const plan = C.planNight(venue, seed, { silent });
    window.__revealed = 0;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const waitFor = async (fn, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(4); } throw new Error('robot : attente trop longue'); };
    const tapAt = async (sel, audioTime) => { await sleep(Math.max(0, (audioTime - A.now()) * 1000)); document.querySelector(sel).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 })); };
    const played = [];
    for (let i = 0; i < plan.length; i++) {
      const area = await waitFor(() => document.querySelector('.club-area:not([data-robot])') || document.querySelector('.club-end'));
      if (area.classList.contains('club-end')) break;
      area.dataset.robot = '1';
      const t0 = A.now() + 0.15, out = A.outputLatency();
      const r = plan[i], q = r.q, wrong = wrongAt.includes(i);
      played.push(r.type);
      const opts = () => [...area.querySelectorAll('.answer')];
      if (['pitch', 'mood', 'note', 'genre', 'tempo', 'hole', 'swing', 'count', 'filter', 'contour', 'calc', 'reglage'].includes(r.type) || q.mode === 'name' || q.mode === 'curve') {
        await sleep(150);
        opts()[wrong ? (q.answer + 1) % opts().length : q.answer].click();
      } else if (r.type === 'grid') {
        await sleep(100);
        area.querySelector(`.club-cell[data-row="${q.row}"][data-step="${wrong ? (q.step + 1) % 16 : q.step}"]`).click();
      } else if (r.type === 'chordx') {
        for (const p of q.pcs) { await sleep(40); area.querySelector(`.club-pk[data-midi="${60 + (wrong ? (p + 1) % 12 : p)}"]`).click(); }
      } else if (r.type === 'archi') {
        const used = new Set();
        const order = wrong ? q.blocks.map((_, k) => k) : q.solution.map((name) => { const k = q.blocks.findIndex((b, j) => b.name === name && !used.has(j)); used.add(k); return k; });
        for (const k of order) { await sleep(40); area.querySelector(`.club-block[data-i="${k}"]`).click(); }
      } else if (r.type === 'simon') {
        await waitFor(() => /À toi/.test(area.querySelector('.club-hint').textContent));
        const seq = wrong ? [(q.seq[0] + 1) % 4] : q.seq;
        for (const p of seq) { opts()[p].click(); await sleep(60); }
      } else if (r.type === 'beat') {
        const spb = 60 / q.bpm;
        for (let k = 0; k < q.taps; k++) await tapAt('.club-tap', t0 + (q.count + k) * spb + out + (wrong ? -0.3 : 0));
      } else if (r.type === 'drop') {
        await tapAt('.club-tap', t0 + q.beats * 60 / q.bpm + out + (wrong ? -0.5 : 0));
      }
      // Sans le son : une manche ratée montre la bonne réponse (en vert) avant le verdict
      if (silent && wrong) { await waitFor(() => area.querySelector('.club-reveal')); if (area.querySelector('.right')) window.__revealed++; }
    }
    await waitFor(() => document.querySelector('.club-end'));
    return played;
  }, wrongAt);
}

export const tests = {
  'soirée parfaite au bar : 3 étoiles, disque d’or, salle suivante débloquée': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/club', 500);
    t.assert.match(await page.locator('.club-venue').nth(1).getAttribute('aria-label'), /verrouillé : 2 étoiles/);
    await page.click('.club-venue >> nth=0');
    t.assert.ok(await page.evaluate(() => document.body.classList.contains('rush-playing')), 'plein écran de jeu');
    const played = await robot(page);
    t.assert.equal(played.length, 10);
    t.assert.ok(new Set(played).size >= 3, played.join(' '));
    const end = await page.locator('.club-end').innerText();
    t.assert.match(end, /★★★/);
    t.assert.match(end, /10\/10/);
    t.assert.match(end, /Disque d’or/);
    t.assert.match(await page.locator('#view').innerText(), /Ce que tu as travaillé ce soir[\s\S]*Approfondir/);
    const st = await page.state();
    t.assert.equal(st.club.best.bar.stars, 3);
    t.assert.equal(Object.values(st.club.crate)[0].kind, 'gold');
    t.assert.ok(st.xp > 0);
    t.assert.ok(Object.values(st.days)[0].skills, 'XP réparti par compétence');
    t.assert.equal(st.log.at(-1).key, 'club');
    await page.click('text=🎧 Salles'); await page.waitForTimeout(300);
    t.assert.equal(await page.locator('.club-venue').nth(1).isDisabled(), false, 'warehouse ouverte');
    t.assert.ok(!(await page.evaluate(() => document.body.classList.contains('rush-playing'))));
  },

  'résidence à Berlin : tous les mini-jeux en difficulté maximale, tous réussis': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.store("s.club = { best: { bar: { stars: 3 }, warehouse: { stars: 3 }, beach: { stars: 3 }, festival: { stars: 2 } }, crate: {}, nights: 4, vib: false };");
    // Une soirée qui passe par tous les mini-jeux
    const { planNight, venueById, SOUND_GAMES } = await import('../../src/core/club.js');
    let seed = 0;
    while (new Set(planNight(venueById('berlin'), `t${seed}`).map((r) => r.type)).size < SOUND_GAMES.length) seed++;
    await page.go(`#/club?venue=berlin&seed=t${seed}`, 300);
    const played = await robot(page);
    t.assert.equal(played.length, 18);
    t.assert.equal(new Set(played).size, SOUND_GAMES.length, `mini-jeux joués : ${[...new Set(played)].join(' ')}`);
    t.assert.match(await page.locator('.club-end').innerText(), /18\/18/);
  },

  'son : effets coupés entre les manches, rétablis pendant la question et à la sortie': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/club', 400);
    await page.click('.club-venue >> nth=0');
    await page.waitForSelector('.club-area', { timeout: 5000 });
    await page.waitForTimeout(300);
    const fx = () => page.evaluate(async () => (await import('/src/core/audio.js')).audioInfo().fxReturn);
    t.assert.ok(await fx() > 0.9, 'réverbe active pendant la question');
    if (await page.locator('.club-area .answer').count()) await page.locator('.club-area .answer').first().click();
    else if (await page.locator('.club-tap').count()) await page.locator('.club-tap').dispatchEvent('pointerdown');
    await page.waitForSelector('.club-feedback', { timeout: 15000 });
    await page.waitForTimeout(400);
    t.assert.ok(await fx() < 0.1, 'traîne coupée après la réponse');
    await page.waitForSelector('.club-area', { timeout: 5000 }); await page.waitForTimeout(300);
    t.assert.ok(await fx() > 0.9, 'rétablie à la manche suivante');
    await page.click('button[aria-label="Quitter la soirée"]'); await page.waitForTimeout(200);
    t.assert.ok(await fx() > 0.9, 'rétablie en quittant');
  },

  'set du jour raté : la salle se vide après 3 erreurs, pas de vinyle': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/club', 500);
    await page.click('.club-daily >> text=▶ Jouer');
    const played = await robot(page, [0, 1, 2]);
    t.assert.equal(played.length, 3);
    const end = await page.locator('#view').innerText();
    t.assert.match(end, /La salle s’est vidée/);
    t.assert.match(end, /☆☆☆/);
    t.assert.match(end, /Termine la soirée/);
    const st = await page.state();
    t.assert.equal(Object.keys(st.club.crate).length, 0);
    t.assert.ok(st.club.daily.day);
    await page.click('text=🎧 Salles'); await page.waitForTimeout(300);
    t.assert.match(await page.locator('.club-daily').innerText(), /Fait aujourd’hui/);
  },

  'caisse de vinyles, vibrations, sortie en cours de partie, clavier sur PC': async (t) => {
    const page = await t.open();
    await page.store("s.club = { best: { bar: { stars: 2, score: 900 } }, crate: { house: { n: 3, kind: 'color' } }, nights: 3, vib: true };");
    await page.go('#/club', 500);
    await page.click('text=/Ma caisse de vinyles \\(1\\//');
    t.assert.equal(await page.locator('.vinyl.color').count(), 1);
    t.assert.equal(await page.locator('.vinyl.empty').count(), 21);
    await page.click('.vinyl.color'); await page.waitForTimeout(200);
    t.assert.match(await page.locator('.toast').last().innerText(), /House · 124 BPM/);
    await page.click('button[aria-label="Retour"]'); await page.waitForTimeout(200);
    await page.click('text=📳 Vibrations : oui'); await page.waitForTimeout(150);
    t.assert.equal((await page.state()).club.vib, false);
    // Raccourci clavier vers le jeu, partie quittée en cours
    await page.go('#/home');
    await page.keyboard.press('Shift+N'); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/club/);
    await page.click('.club-venue >> nth=0'); await page.waitForTimeout(1200);
    // Touche 1 sur PC : répond (ou la manche n'a pas de boutons) sans erreur
    await page.keyboard.press('Digit1'); await page.waitForTimeout(300);
    await page.click('button[aria-label="Quitter la soirée"]'); await page.waitForTimeout(300);
    t.assert.ok(await page.locator('.club-venues').count());
    t.assert.equal((await page.state()).club.nights, 3, 'partie abandonnée : non comptée');
  },

  'sans le son : bascule, soirée parfaite au bar sans aucun son, progression à part': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/club', 500);
    // Espions : le moindre son (synthé, batterie, clic, riser) crée un oscillateur ou une source ; les vibrations restent
    await page.evaluate(() => {
      window.__sounds = 0; window.__vib = 0;
      for (const m of ['createOscillator', 'createBufferSource']) {
        const orig = BaseAudioContext.prototype[m];
        BaseAudioContext.prototype[m] = function (...a) { window.__sounds++; return orig.apply(this, a); };
      }
      navigator.vibrate = () => { window.__vib++; return true; };
    });
    const audioState = () => page.evaluate(async () => (await import('/src/core/audio.js')).audioInfo().state);
    const before = await audioState();
    t.assert.equal(await page.locator('.club-mode-btn[aria-pressed="true"]').innerText(), '🔊 Avec le son');
    await page.click('.club-mode-btn:has-text("Sans le son")'); await page.waitForTimeout(200);
    t.assert.equal((await page.state()).club.silent, true);
    t.assert.equal(await page.locator('.club-mode-btn[aria-pressed="true"]').innerText(), '🔇 Sans le son');
    t.assert.match(await page.locator('#view').innerText(), /Les salles sans le son · 0\/27 ★/);
    t.assert.match(await page.locator('.club-venue').nth(1).getAttribute('aria-label'), /verrouillé : 2 étoiles/);
    await page.click('.club-venue >> nth=0');
    t.assert.equal(await page.getAttribute('.club-game', 'data-silent'), '1');
    t.assert.equal(await page.locator('.club-bpm').innerText(), '🔇');
    const played = await robot(page);
    t.assert.equal(played.length, 10);
    t.assert.ok(played.every((x) => ['grid', 'chordx', 'calc', 'archi', 'reglage'].includes(x)), played.join(' '));
    t.assert.ok(new Set(played).size >= 3, played.join(' '));
    const end = await page.locator('.club-end').innerText();
    t.assert.match(end, /★★★/);
    t.assert.match(end, /10\/10/);
    t.assert.match(end, /Disque d’or/);
    t.assert.match(await page.locator('#view').innerText(), /Ce que tu as travaillé ce soir[\s\S]*Approfondir/);
    const st = await page.state();
    t.assert.equal(st.club.best['bar@silent'].stars, 3);
    t.assert.ok(!st.club.best.bar, 'aucune étoile avec le son');
    t.assert.equal(st.club.nightsSilent, 1);
    t.assert.equal(st.club.nights, 1);
    t.assert.equal(Object.values(st.club.crate)[0].kind, 'gold');
    t.assert.ok(st.badges.silent1, 'succès « Mode avion »');
    t.assert.ok(st.badges.silent3, 'succès « Lecture à vue »');
    t.assert.equal(st.log.at(-1).key, 'club');
    t.assert.equal(await page.evaluate(() => window.__sounds), 0, 'aucun son joué pendant la soirée muette');
    t.assert.equal(await audioState(), before, 'moteur audio non touché');
    t.assert.ok(await page.evaluate(() => window.__vib) >= 10, 'vibrations gardées');
    await page.click('text=🎧 Salles'); await page.waitForTimeout(300);
    t.assert.equal(await page.locator('.club-venue').nth(1).isDisabled(), false, 'warehouse ouverte sans le son');
    await page.click('.club-mode-btn:has-text("Avec le son")'); await page.waitForTimeout(200);
    t.assert.equal(await page.locator('.club-venue').nth(1).isDisabled(), true, 'toujours fermée avec le son');
    t.assert.equal((await page.state()).club.silent, false);
  },

  'sans le son : lien #/club?silent=1, set du jour muet à part, la bonne réponse s’affiche': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/club?silent=1', 500);
    t.assert.equal((await page.state()).club.silent, true, 'mode retenu');
    t.assert.equal(await page.locator('.club-mode-btn[aria-pressed="true"]').innerText(), '🔇 Sans le son');
    t.assert.match(await page.locator('.club-daily').innerText(), /Le set du jour · 🔇/);
    await page.evaluate(() => { window.__sounds = 0; const o = BaseAudioContext.prototype.createOscillator; BaseAudioContext.prototype.createOscillator = function (...a) { window.__sounds++; return o.apply(this, a); }; });
    await page.click('.club-daily >> text=▶ Jouer');
    const played = await robot(page, [0, 1, 2]);
    t.assert.equal(played.length, 3);
    t.assert.equal(await page.evaluate(() => window.__revealed), 3, 'solution montrée à chaque erreur');
    t.assert.match(await page.locator('#view').innerText(), /La salle s’est vidée/);
    t.assert.equal(await page.evaluate(() => window.__sounds), 0);
    const st = await page.state();
    t.assert.ok(st.club.dailySilent.day);
    t.assert.ok(!st.club.daily, 'le set du jour avec le son reste à jouer');
    await page.click('text=🎧 Salles'); await page.waitForTimeout(300);
    t.assert.match(await page.locator('.club-daily').innerText(), /Fait aujourd’hui/);
    await page.click('.club-mode-btn:has-text("Avec le son")'); await page.waitForTimeout(200);
    t.assert.match(await page.locator('.club-daily').innerText(), /XP ×2 la première fois/);
    // Lien direct vers une soirée muette précise
    await page.go('#/club?venue=bar&seed=lien&silent=1', 500);
    t.assert.equal(await page.getAttribute('.club-game', 'data-silent'), '1');
    await page.click('button[aria-label="Quitter la soirée"]'); await page.waitForTimeout(200);
    t.assert.equal(await page.locator('.club-mode-btn[aria-pressed="true"]').innerText(), '🔇 Sans le son');
  },

  'sans le son sur PC : clavier pour le piano, chiffres pour les blocs et les réponses': async (t) => {
    const page = await t.open();
    const { planNight, venueById } = await import('../../src/core/club.js');
    // Une soirée qui commence par un accord à construire puis une structure à ranger
    let seed = 0;
    const plan = (s) => planNight(venueById('bar'), `pc${s}`, { silent: true });
    while (!(plan(seed)[0].type === 'chordx' && plan(seed)[1].type === 'archi')) seed++;
    const [r0, r1] = plan(seed);
    await page.go(`#/club?venue=bar&seed=pc${seed}&silent=1`, 300);
    await page.waitForSelector('.club-pk', { timeout: 5000 });
    for (const p of r0.q.pcs) { await page.keyboard.press('Key' + 'AWSEDFTGYHUJK'[p]); await page.waitForTimeout(60); }
    await page.waitForSelector('.club-feedback.ok', { timeout: 3000 });
    await page.waitForSelector('.club-block', { timeout: 5000 });
    const used = new Set();
    for (const name of r1.q.solution) {
      const k = r1.q.blocks.findIndex((b, j) => b.name === name && !used.has(j));
      used.add(k);
      await page.keyboard.press(`Digit${k + 1}`); await page.waitForTimeout(80);
    }
    await page.waitForSelector('.club-feedback.ok', { timeout: 3000 });
    t.assert.match(await page.locator('.club-score').innerText(), /^[1-9]\d+$/);
    await page.click('button[aria-label="Quitter la soirée"]'); await page.waitForTimeout(200);
  },
};
