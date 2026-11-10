// Parcours « Apprendre » : carte, leçons de bout en bout, erreurs qui reviennent, cœurs, test de saut, MIDI, maquette de Live.

/** Débloque le parcours jusqu'au nœud `id` (exclu). */
const unlockTo = (page, id) => page.evaluate(async (stop) => {
  const m = await import('/src/store.js');
  const c = await import('/src/core/course.js');
  const done = {};
  for (const n of c.NODES) { if (n.id === stop) break; if (c.isRequired(n)) done[n.id] = { d: '2026-11-01', n: 1, best: 90 }; }
  m.update((s) => { s.course = { done }; s.settings.seenVersion = '4.0'; });
}, id);

const item = (page) => page.evaluate(() => window.__bfLesson?.item() || null);
const footBtn = (page) => page.locator('.lf-btn:visible');

/** Répond juste à l'exercice affiché (les exercices en temps réel, eux, sont passés). */
async function answer(page, it, { wrong = false } = {}) {
  switch (it.t) {
    case 'card': await footBtn(page).click(); return 'card';
    case 'mcq': case 'shortcut': await page.locator('.ex-choices .choice3d').nth(wrong ? (it.a + 1) % it.choices.length : it.a).click(); break;
    case 'number': await page.fill('.ex-num', String(wrong ? it.a + 1 : it.a).replace('.', ',')); break;
    case 'live': await page.locator(wrong ? `.lm [data-zone]:not([data-zone="${it.target}"]):visible` : `.lm [data-zone="${[].concat(it.target)[0]}"]:visible`).first().click(); break;
    case 'order': for (const w of it.items) await page.locator('.ex-bank .chip3d:not(.used)', { hasText: w }).first().click(); break;
    case 'blank': for (const w of it.answers) await page.locator('.ex-bank .chip3d:not(.used)', { hasText: w }).first().click(); break;
    case 'pairs':
      for (let i = 0; i < it.pairs.length; i++) { await page.click(`.pair3d[data-side="L"][data-idx="${i}"]`); await page.click(`.pair3d[data-side="R"][data-idx="${i}"]`); }
      await page.waitForTimeout(500);
      return 'self';
    case 'roll': {
      if (!it.target) { await page.locator('.lf-skip').click(); return 'skip'; }
      for (const [st, m] of it.target) await page.locator('.ex-roll .rx-row:not(.rx-head)').nth(it.hi - m).locator('.rx-cell').nth(st).click();
      break;
    }
    case 'keys': {
      const notes = it.exact ? it.target : it.target.map((pc) => 60 + pc);
      for (const m of notes) {
        // fenêtre du clavier : boutons Octave − / + jusqu'à voir la note
        for (let k = 0; k < 8 && !(await page.locator(`.pk[data-midi="${m}"]`).count()); k++) {
          const lo = Number(await page.locator('.pk').first().getAttribute('data-midi'));
          await page.locator('.ex-oct button', { hasText: m < lo ? 'Octave −' : 'Octave +' }).click();
        }
        await page.locator(`.pk[data-midi="${m}"]`).first().click({ timeout: 4000 });
      }
      if (it.mode === 'seq') { await page.waitForTimeout(450); return 'self'; }
      break;
    }
    case 'grid': {
      if (it.rules) { await page.locator('.lf-skip').click(); return 'skip'; }
      for (const r of it.rows) {
        const want = [...(it.target[r] || '')];
        for (let s = 0; s < 16; s++) {
          const cell = page.locator('.ex-grid .gx-row').nth(it.rows.indexOf(r)).locator('.gx-cell').nth(s);
          const cls = await cell.getAttribute('class');
          const cur = cls.includes(' on') ? 1 : cls.includes('ghost') ? 2 : 0;
          const tgt = want[s] === 'x' ? 1 : want[s] === 'g' ? 2 : 0;
          const clicks = it.vel ? (tgt - cur + 3) % 3 : cur !== tgt ? 1 : 0;
          for (let k = 0; k < clicks; k++) await cell.click();
        }
      }
      break;
    }
    default:
      await page.locator('.lf-skip').click();
      return 'skip';
  }
  await footBtn(page).click(); // Vérifier
  return 'checked';
}

/** Joue toute la leçon en répondant juste ; renvoie le nombre d'exercices notés. */
async function playLesson(page, t, { wrongFirst = false } = {}) {
  let graded = 0, wronged = false;
  for (let k = 0; k < 80; k++) {
    if (await page.locator('.lesson-end').count()) return graded;
    const it = await item(page);
    if (!it) { // retour (vert / rouge) affiché : on continue
      await footBtn(page).click();
      await page.waitForTimeout(120);
      continue;
    }
    const wrong = wrongFirst && !wronged && ['mcq', 'number'].includes(it.t);
    if (wrong) wronged = true;
    const r = await answer(page, it, { wrong });
    if (r === 'checked' || r === 'self') {
      graded++;
      await page.waitForSelector('.lesson-foot.good, .lesson-foot.bad', { timeout: 3000 });
      t.assert.equal(await page.locator('.lesson-foot.good').count(), wrong ? 0 : 1, `réponse ${wrong ? 'fausse' : 'juste'} attendue pour ${it.t} : ${it.q}`);
    }
    await page.waitForTimeout(80);
  }
  throw new Error('leçon sans fin');
}

export const tests = {
  'parcours : carte, première leçon réussie de bout en bout (PC)': async (t) => {
    const page = await t.open({ route: '#/learn' });
    t.assert.equal(await page.locator('.nav-item.active .nav-label').innerText(), 'Apprendre');
    t.assert.equal(await page.locator('.unit-banner').count(), 18);
    t.assert.ok(await page.locator('.pnode-wrap.current .pn-bubble').isVisible(), 'bulle « Commencer » sur la première leçon');
    // Popover d'un nœud verrouillé, puis du nœud en cours
    await page.locator('.pnode[data-node="u1-l2"]').click();
    t.assert.match(await page.locator('.ppop').innerText(), /Termine les étapes précédentes/);
    await page.locator('.pnode[data-node="u1-l1"]').click();
    await page.locator('.ppop a', { hasText: 'Commencer' }).click();
    await page.waitForTimeout(400);
    t.assert.equal(await page.evaluate(() => document.body.dataset.route), 'lesson');
    t.assert.equal(await page.locator('.nav').isVisible(), false, 'la barre de navigation se cache pendant la leçon');
    const xp0 = (await page.state()).xp;
    await playLesson(page, t);
    t.assert.match(await page.locator('.lesson-end h1').innerText(), /Leçon/);
    t.assert.match(await page.locator('.le-tile.xp').innerText(), /\+\d+/);
    await page.locator('.lesson-end a', { hasText: 'Continuer' }).click();
    await page.waitForTimeout(500);
    const s = await page.state();
    t.assert.ok(s.course.done['u1-l1'], 'leçon enregistrée');
    t.assert.ok(s.xp > xp0, 'XP gagnée');
    t.assert.ok((s.log || []).some((e) => e.key === 'course:lesson'));
    t.assert.equal(await page.locator('.pnode-wrap.current .pnode').getAttribute('data-node'), 'u1-l2');
  },

  'parcours : une erreur revient en fin de leçon, puis la leçon se termine (mobile)': async (t) => {
    const page = await t.open({ device: 'mobile', route: '#/learn' });
    await unlockTo(page, 'u2-l1');
    await page.go('#/lesson?id=u2-l1');
    let sawRetry = false;
    const watch = setInterval(async () => { try { if (await page.evaluate(() => window.__bfLesson?.retry())) sawRetry = true; } catch (e) { /* page fermée */ } }, 100);
    await playLesson(page, t, { wrongFirst: true });
    clearInterval(watch);
    t.assert.ok(sawRetry, 'la question ratée est revenue');
    t.assert.match(await page.locator('.lesson-end').innerText(), /précision/i);
    const s = await page.state();
    t.assert.ok(s.course.done['u2-l1'] && !s.course.done['u2-l1'].perfect, 'terminée, mais pas sans faute');
    t.assert.ok(s.course.miss['u2-l1'] >= 1, 'erreur retenue pour l’entraînement');
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    t.assert.ok(ov <= 2, `débordement horizontal ${ov}px`);
  },

  'parcours : contrôle à 3 cœurs (échec) puis test de saut réussi': async (t) => {
    const page = await t.open({ route: '#/learn' });
    await unlockTo(page, 'u1-cp');
    await page.go('#/lesson?id=u1-cp');
    t.assert.equal(await page.locator('.lp-hearts span').count(), 3);
    for (let k = 0; k < 40 && !(await page.locator('.lesson-end').count()); k++) {
      const it = await item(page);
      if (!it) { await footBtn(page).click(); await page.waitForTimeout(120); continue; }
      if (['mcq', 'number', 'live', 'shortcut'].includes(it.t)) { await answer(page, it, { wrong: true }); await page.waitForSelector('.lesson-foot.bad'); }
      else await answer(page, it);
      await page.waitForTimeout(80);
    }
    t.assert.match(await page.locator('.lesson-end h1').innerText(), /Plus de cœurs/);
    t.assert.equal((await page.state()).course.done['u1-cp'], undefined);
    // Test pour sauter à l'unité 4 : tout est juste
    await page.go('#/learn');
    await page.locator('#unit-u4 .ub-btn.jump').click();
    await page.locator('.modal-card a', { hasText: 'Passer le test' }).click();
    await page.waitForTimeout(400);
    await playLesson(page, t);
    t.assert.match(await page.locator('.lesson-end h1').innerText(), /Bienvenue plus loin/);
    const s = await page.state();
    t.assert.ok(s.course.done['u3-cp']?.skipped, 'unités précédentes validées');
    await page.locator('.lesson-end a', { hasText: 'Continuer' }).click();
    await page.waitForTimeout(400);
    t.assert.equal(await page.locator('.pnode-wrap.current .pnode').getAttribute('data-node'), 'u4-l1');
  },

  'parcours : clavier MIDI (accords, vélocité, potard) et maquette de Live au clavier': async (t) => {
    const page = await t.open({ route: '#/learn', midi: true });
    await unlockTo(page, 'u18-cp');
    // Accord joué au clavier MIDI : validé dès que les bonnes notes sont tenues
    await page.go('#/lesson?id=u8-l1');
    for (let k = 0; k < 20; k++) {
      const it = await item(page);
      if (it?.t === 'keys' && it.mode === 'chord') {
        for (const pc of it.target) await page.evaluate((n) => window.__midi(0x90, n, 90), 48 + pc + (pc < 5 ? 12 : 0));
        await page.waitForSelector('.lesson-foot.good', { timeout: 2000 });
        break;
      }
      if (!it) await footBtn(page).click(); else await answer(page, it);
      await page.waitForTimeout(100);
    }
    t.assert.equal(await page.locator('.lesson-foot.good').count(), 1, 'accord MIDI reconnu');
    // Vélocité : doux puis fort
    await page.go('#/lesson?id=u3-l3');
    await footBtn(page).click();
    await page.evaluate(() => window.__midi(0x90, 60, 30));
    await page.waitForSelector('.lesson-foot.good', { timeout: 2000 });
    await footBtn(page).click();
    await page.evaluate(() => window.__midi(0x90, 62, 120));
    await page.waitForSelector('.lesson-foot.good', { timeout: 2000 });
    // Potard : un CC du contrôleur tenu sur la cible
    await page.go('#/lesson?id=u3-l5');
    for (let k = 0; k < 6 && (await item(page))?.t !== 'knob'; k++) { const it = await item(page); if (!it) await footBtn(page).click(); else await answer(page, it); await page.waitForTimeout(100); }
    const knob = await item(page);
    t.assert.equal(knob.t, 'knob');
    await page.evaluate((v) => window.__midi(0xb0, 74, v), knob.target);
    await page.waitForSelector('.lesson-foot.good', { timeout: 3000 });
    t.assert.match(await page.locator('.bk-val').innerText(), new RegExp(String(knob.target)));
    // Maquette de Live et raccourci tapé au clavier
    await page.go('#/lesson?id=u4-l1');
    await footBtn(page).click();
    const live = await item(page);
    t.assert.equal(live.t, 'live');
    await page.locator(`[data-zone="${live.target}"]`).first().click();
    await footBtn(page).click();
    await page.waitForSelector('.lesson-foot.good');
    await footBtn(page).click();
    const sc = await item(page);
    t.assert.equal(sc.t, 'shortcut');
    await page.keyboard.press('Tab');
    await page.waitForSelector('.lesson-foot.good', { timeout: 2000 });
  },

  'parcours : atelier bonus validé tout seul, mission studio cochée, guide et entraînement': async (t) => {
    const page = await t.open({ route: '#/learn' });
    await unlockTo(page, 'u2-l1');
    await page.go('#/learn');
    // L'atelier Pad Rush « four on the floor » : réussi dans le jeu → validé au retour sur le parcours
    await page.locator('.pnode[data-node="u1-lab-otf"]').click();
    t.assert.match(await page.locator('.ppop').innerText(), /Ouvrir l’atelier/);
    await page.store("s.pads = { ...(s.pads || {}), best: { otf: { stars: 2, acc: 90 } } };");
    await page.go('#/learn');
    t.assert.ok((await page.state()).course.done['u1-lab-otf'], 'atelier validé');
    // Mission studio : cocher toutes les étapes
    await unlockTo(page, 'u4-cp');
    await page.go('#/learn');
    await page.locator('.pnode[data-node="u3-st"]').click();
    await page.locator('.ppop button', { hasText: 'Voir la mission' }).click();
    const boxes = page.locator('.mission-steps input');
    t.assert.equal(await page.locator('.mission3d button', { hasText: 'Mission accomplie' }).isDisabled(), true);
    for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
    await page.locator('.mission3d button', { hasText: 'Mission accomplie' }).click();
    await page.waitForTimeout(300);
    t.assert.ok((await page.state()).course.done['u3-st'], 'mission accomplie');
    // Guide d'unité
    await page.locator('#unit-u2 .ub-btn', { hasText: 'Guide' }).click();
    t.assert.match(await page.locator('.modal-card').innerText(), /C3 = 60/);
    await page.locator('.modal-card button', { hasText: 'Fermer' }).click();
    // Entraînement : des exercices des leçons déjà faites
    await page.go('#/lesson?practice=1');
    t.assert.ok(await item(page), 'un exercice d’entraînement');
    t.assert.match(await page.locator('.lsn-title').innerText(), /Entraînement/i);
    // Signaler une erreur : rangé dans le Carnet
    await page.locator('.ex-report').click();
    await page.fill('.modal-card textarea', 'La réponse attendue me semble fausse');
    await page.locator('.modal-card button', { hasText: 'Envoyer au Carnet' }).click();
    await page.waitForTimeout(200);
    const note = (await page.state()).notebook[0];
    t.assert.match(note.title, /Erreur signalée/);
    t.assert.match(note.note, /me semble fausse[\s\S]*Référence : /);
    // Bulle « Commencer » : elle reste centrée sur son nœud (l'animation ne la déplace que verticalement)
    await page.go('#/learn');
    const xs = [];
    for (let i = 0; i < 6; i++) { xs.push(await page.locator('.pnode-wrap.current .pn-bubble').evaluate((b) => { const r = b.getBoundingClientRect(); return Math.round(r.left + r.width / 2); })); await page.waitForTimeout(150); }
    const nodeX = await page.locator('.pnode-wrap.current .pnode').evaluate((b) => { const r = b.getBoundingClientRect(); return Math.round(r.left + r.width / 2); });
    t.assert.ok(xs.every((x) => Math.abs(x - nodeX) <= 2), `bulle décentrée : ${xs} / nœud ${nodeX}`);
  },
};
