// Parcours « Apprendre » : carte, leçons de bout en bout, erreurs qui reviennent, cœurs, test de saut, MIDI, maquette de Live.

/** Débloque le parcours jusqu'au nœud `id` (exclu). */
const unlockTo = (page, id) => page.evaluate(async (stop) => {
  const m = await import('/src/store.js');
  const c = await import('/src/core/course.js');
  const done = {};
  for (const n of c.NODES) { if (n.id === stop) break; if (c.isRequired(n)) done[n.id] = { d: '2026-11-01', n: 1, best: 90 }; }
  m.update((s) => { s.course = { done }; s.settings.seenVersion = '4.1'; });
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

  'parcours 4.1 : aujourd’hui (objectif, série, révisions), décors par partie et en-tête d’unité collant': async (t) => {
    const page = await t.open({ route: '#/learn' });
    await unlockTo(page, 'u2-l3');
    const day = (off) => { const d = new Date(Date.now() - off * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    await page.store(`s.course.miss = { 'u1-l1': 3, 'u1-l2': 2, 'u1-l3': 1 }; s.streak = { count: 4, last: '${day(1)}' }; s.days['${day(0)}'] = { xp: 60, sessions: 0, exercises: 2 }; s.settings.dailyGoal = 150;`);
    await page.go('#/learn', 500);
    t.assert.match(await page.locator('.lh-tile.goal').innerText(), /Objectif du jour\s*60 \/ 150 XP/);
    t.assert.match(await page.locator('.lh-tile.goal .lring text').textContent(), /40%/);
    t.assert.match(await page.locator('.lh-tile.streak').innerText(), /4 jours/);
    t.assert.match(await page.locator('.lh-tile.review.due').innerText(), /Révisions dues\s*2 notions/, 'les leçons avec 2 erreurs ou plus sont dues');
    t.assert.equal(await page.locator('.lh-mascot .mascot').count(), 1);
    // Un univers par partie : 5 décors en deux plans
    t.assert.equal(await page.locator('section.part').count(), 5);
    t.assert.equal(await page.locator('.part-bg').evaluateAll((l) => l.filter((n) => getComputedStyle(n).backgroundImage.startsWith('url("data:image/svg+xml')).length), 5);
    t.assert.match(await page.locator('.part-4 .part-head').innerText(), /RACK DE SYNTHÉS/);
    // En-tête collant : absent en haut, présent une fois le bandeau de l'unité passé, avec le Guide
    t.assert.equal(await page.locator('.unit-sticky.show').count(), 0);
    await page.evaluate(() => { document.getElementById('unit-u2').scrollIntoView({ block: 'start' }); window.scrollBy(0, 320); });
    await page.waitForTimeout(400);
    t.assert.match(await page.locator('.unit-sticky.show').innerText(), /UNITÉ 2[\s\S]*Le clavier[\s\S]*Guide/);
    const box = await page.locator('.unit-sticky.show').boundingBox();
    t.assert.ok(box.y >= 50 && box.y < 80, `collé sous la barre du haut (${box.y})`);
    t.assert.notEqual(await page.locator('.learn').evaluate((n) => n.style.getPropertyValue('--sy')), '0', 'le décor suit le défilement');
    await page.locator('.unit-sticky .ub-btn').click();
    t.assert.match(await page.locator('.modal-card .guide').innerText(), /UNITÉ 2 · GUIDE/);
    await page.keyboard.press('Escape');
    // Révisions dues → entraînement ; une fois fait, les leçons révisées ne sont plus dues
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('.lh-tile.review').click(); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/lesson\?practice=1/);
    await playLesson(page, t);
    const c = (await page.state()).course;
    t.assert.equal(c.rev['u1-l1'].n, 1);
    t.assert.equal(c.miss['u1-l1'], 1, 'erreurs divisées par deux après la révision');
    await page.locator('.lesson-end a', { hasText: 'Continuer' }).click(); await page.waitForTimeout(400);
    t.assert.equal(await page.locator('.lh-tile.review.due').count(), 0);
    // Navigation : le parcours d'abord, le reste dans Extras
    t.assert.deepEqual(await page.locator('.nav-item .nav-label').allInnerTexts(), ['Extras', 'Apprendre', 'Profil', 'Rechercher', 'Raccourcis']);
    await page.locator('.learn-extras').click(); await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/home$/);
    t.assert.deepEqual(await page.locator('.extras-hub b').allInnerTexts(), ['Jeux', 'Ateliers', 'Carnet']);
  },

  'parcours 4.1 : le morceau se construit, Bip réagit, XP qui défile, déblocage animé': async (t) => {
    const page = await t.open({ route: '#/learn' });
    await page.go('#/lesson?id=u1-l1');
    const leds = () => page.locator('.lp-jam i.on').count();
    t.assert.equal(await page.locator('.lp-jam i').count(), 6);
    let good = 0, wronged = false, max = 0;
    for (let k = 0; k < 80 && !(await page.locator('.lesson-end').count()); k++) {
      const it = await item(page);
      if (!it) { await footBtn(page).click(); await page.waitForTimeout(100); continue; }
      const wrong = !wronged && good >= 1 && ['mcq', 'number'].includes(it.t);
      const r = await answer(page, it, { wrong });
      if (r === 'checked' || r === 'self') {
        await page.waitForSelector('.lesson-foot.good, .lesson-foot.bad', { timeout: 3000 });
        if (wrong) {
          wronged = true;
          t.assert.equal(await leds(), Math.min(6, good) - 1, 'une erreur retire une piste');
          t.assert.equal(await page.locator('.lf-bip .mascot.mood-sad').count(), 1, 'Bip déçu dans le bandeau rouge');
          t.assert.match(await page.locator('.lf-jam').innerText(), /quitte ton morceau/);
          good = Math.min(6, good) - 1;
        } else {
          good = Math.min(6, good + 1);
          max = Math.max(max, good);
          t.assert.equal(await leds(), good, `une piste de plus (${good})`);
          t.assert.equal(await page.locator('.lf-bip .mascot.mood-happy, .lf-bip .mascot.mood-party').count(), 1, 'Bip content dans le bandeau vert');
        }
      }
      await page.waitForTimeout(80);
    }
    t.assert.ok(wronged && max >= 1, `erreur ${wronged}, pistes ${max}`);
    // Écran de fin : le morceau gagné, l'XP qui défile jusqu'à sa valeur
    t.assert.equal(await page.locator('.le-track .lt-chip.on').count(), Math.max(1, good));
    t.assert.equal(await page.locator('.le-track .lt-chip').count(), 6);
    t.assert.ok(await page.locator('.le-track.playing').count(), 'le morceau gagné joue');
    await page.waitForTimeout(1700);
    const xp = (await page.state()).log.find((e) => e.key === 'course:lesson').xp;
    t.assert.equal(await page.locator('.le-tile.xp b').innerText(), `+${xp}`);
    await page.locator('.lt-play').click(); await page.waitForTimeout(200);
    t.assert.equal(await page.locator('.le-track.playing').count(), 0, 'Stop coupe le morceau');
    // Retour au parcours : le trait se trace, le cadenas saute sur la leçon suivante
    await page.locator('.lesson-end a', { hasText: 'Continuer' }).click(); await page.waitForTimeout(300);
    t.assert.match(page.url(), /done=u1-l1&new=1/);
    t.assert.equal(await page.locator('.upath-svg path.trace').count(), 1);
    t.assert.equal(await page.locator('.pnode.unlocking[data-node="u1-l2"] .pn-lock').count(), 1);
    await page.waitForTimeout(2200);
    t.assert.equal(await page.locator('.pnode[data-node="u1-l2"] .pn-lock').evaluate((n) => getComputedStyle(n).opacity), '0', 'cadenas parti');
    t.assert.equal(await page.locator('.upath-svg path.trace').evaluate((n) => getComputedStyle(n).strokeDashoffset), '0px', 'trait tracé');
    // Rejouer une leçon déjà faite ne rejoue pas le déblocage
    await page.go('#/learn?done=u1-l1');
    t.assert.equal(await page.locator('.pnode.unlocking').count(), 0);
  },

  'parcours 4.1 : deux colonnes et rappel des touches sur PC, bandeau MIDI, schémas animés, volume égalisé': async (t) => {
    const page = await t.open({ route: '#/learn', midi: true });
    await unlockTo(page, 'u18-cp');
    const until = async (pred) => { for (let k = 0; k < 30; k++) { const it = await item(page); if (it && pred(it)) return it; if (!it) await footBtn(page).click(); else await answer(page, it); await page.waitForTimeout(100); } return null; };
    // Maquette de Live : consigne à gauche, exercice à droite
    await page.go('#/lesson?id=u4-l1');
    t.assert.ok(await until((it) => it.t === 'live'));
    const head = await page.locator('.ex.two > .ex-head').boundingBox(), content = await page.locator('.ex.two > .ex-content').boundingBox();
    t.assert.ok(head.x + head.width <= content.x && Math.abs(head.y - content.y) < 40, `consigne à gauche de l'exercice (${JSON.stringify([head, content])})`);
    t.assert.ok(content.width > head.width * 1.5, 'la grande colonne est pour l’exercice');
    t.assert.match(await page.locator('.lf-hint').innerText(), /Entrée\s*vérifier/);
    await answer(page, await item(page));
    await page.waitForSelector('.lesson-foot.good');
    t.assert.ok(await page.locator('.ex.two .ex-explain.good').isVisible(), 'explication à gauche, à côté de l’exercice');
    t.assert.equal(await page.locator('.lf-hint').isVisible(), false, 'le rappel des touches s’efface pendant le retour');
    // QCM : rappel 1 à N + Entrée, et les chiffres choisissent
    await footBtn(page).click();
    const q = await until((it) => it.t === 'mcq');
    t.assert.match(await page.locator('.lf-hint').innerText(), new RegExp(`1\\s*–\\s*${q.choices.length}\\s*choisir[\\s\\S]*Entrée\\s*vérifier`));
    await page.keyboard.press(`Digit${q.a + 1}`); await page.keyboard.press('Enter');
    await page.waitForSelector('.lesson-foot.good');
    // Exercice au clavier : bandeau « Clavier MIDI détecté » (et pas sur un QCM)
    t.assert.equal(await page.locator('.midi-banner').count(), 0);
    await page.go('#/lesson?id=u2-l1');
    t.assert.ok(await until((it) => it.t === 'keys'));
    t.assert.match(await page.locator('.midi-banner').innerText(), /Clavier MIDI détecté/);
    await page.evaluate(() => window.__unplug()); await page.waitForTimeout(200);
    t.assert.equal(await page.locator('.midi-banner').isVisible(), false, 'le bandeau disparaît si on débranche');
    await page.evaluate(() => window.__plug()); await page.waitForTimeout(200);
    t.assert.ok(await page.locator('.midi-banner').isVisible());
    // Fiches : schémas animés (l'onde bouge, l'enveloppe se dessine), fixes dans les exercices
    await page.go('#/lesson?id=u10-l1');
    const d1 = await page.locator('.ex-card .lvis.live .lsvg path.stroke').first().getAttribute('d');
    await page.waitForTimeout(400);
    t.assert.notEqual(await page.locator('.ex-card .lvis.live .lsvg path.stroke').first().getAttribute('d'), d1, 'l’onde oscille');
    await page.go('#/lesson?id=u12-l1');
    const w1 = await page.locator('.ex-card .lsvg clipPath rect').getAttribute('width');
    await page.waitForTimeout(400);
    t.assert.notEqual(await page.locator('.ex-card .lsvg clipPath rect').getAttribute('width'), w1, 'l’enveloppe se dessine');
    await page.locator('.vis-play').click(); await page.waitForTimeout(150);
    t.assert.ok(Number(await page.locator('.ex-card .lsvg clipPath rect').getAttribute('width')) < 80, '« Voir et entendre » repart du début de la note');
    // Volume égalisé : un son faible est remonté, un son fort baissé ; coupé dans les réglages → gain 1
    const lv = await page.evaluate(async () => {
      const kit = await import('/src/learn/kit.js'); const level = await import('/src/learn/level.js'); const store = await import('/src/store.js');
      const quiet = { k: 'synth', preset: 'supersaw', notes: [[57, 0, 1]] }, loud = { k: 'synth', preset: 'acid', notes: [[45, 0, 1]] };
      kit.prepareSpec(quiet); kit.prepareSpec(loud);
      await new Promise((r) => setTimeout(r, 1500));
      const on = [level.levelOf(quiet), level.levelOf(loud)];
      store.update((s) => { s.settings.leveling = false; });
      return { on, off: level.levelOf(quiet) };
    });
    t.assert.ok(lv.on[0] > 1.2 && lv.on[1] < 1 && lv.on[0] > lv.on[1] + 0.5, `gains ${lv.on}`);
    t.assert.equal(lv.off, 1);
  },

  'clavier AZERTY : détection à la frappe, choix dans les réglages, touches affichées et jouées': async (t) => {
    const page = await t.open({ route: '#/learn' });
    await unlockTo(page, 'u18-cp');
    const until = async (pred) => { for (let k = 0; k < 30; k++) { const it = await item(page); if (it && pred(it)) return it; if (!it) await footBtn(page).click(); else await answer(page, it); await page.waitForTimeout(100); } return null; };
    const hint = () => page.locator('.lf-hint').innerText().then((x) => x.replace(/\s+/g, ' '));
    // QWERTY (clavier des tests) : A S D F, octave Z X
    await page.go('#/lesson?id=u2-l1');
    t.assert.ok(await until((it) => it.t === 'keys' && it.mode === 'note'));
    t.assert.match(await hint(), /ASDF… jouer ZX octave/);
    // Une frappe AZERTY (la touche à l'emplacement du Q américain écrit « a ») : la disposition est reconnue
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'a', shiftKey: true })));
    t.assert.equal(await page.evaluate(() => import('/src/keyboard.js').then((m) => m.kbLayout())), 'azerty');
    await page.go('#/lesson?id=u2-l1');
    const it = await until((x) => x.t === 'keys' && x.mode === 'note');
    t.assert.match(await hint(), /QSDF… jouer WX octave/);
    t.assert.match(await page.locator('.ex-howto').innerText(), /touches Q S D F… de ton ordinateur \(W \/ X/);
    // La touche jouée dépend de l'emplacement : le Do est sur la touche marquée Q (emplacement KeyA)
    const codes = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ'];
    const pc = ((it.exact ? it.target[0] : it.target[0]) % 12 + 12) % 12;
    await page.evaluate(([code]) => { window.dispatchEvent(new KeyboardEvent('keydown', { code, key: 'x' })); window.dispatchEvent(new KeyboardEvent('keyup', { code, key: 'x' })); }, [codes[pc]]);
    await page.waitForTimeout(150);
    t.assert.match(await page.locator('.ex-picked').innerText(), /Ta note/);
    // Maj + lettre suit le caractère tapé, quel que soit l'emplacement
    await page.go('#/learn');
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'A', shiftKey: true, bubbles: true })));
    await page.waitForTimeout(400);
    t.assert.match(page.url(), /#\/chords$/, 'Maj + A (touche marquée A) ouvre le Lab Accords');
    // Réglages : Auto (AZERTY) détecté, puis choix forcé
    await page.go('#/settings', 500);
    t.assert.match(await page.locator('#set-general').innerText(), /Auto \(AZERTY\)/);
    t.assert.match(await page.locator('.kb-note').innerText(), /Clavier AZERTY\s:\spiano sur Q Z S E D F T G/);
    await page.locator('#set-general button', { hasText: 'QWERTY' }).click();
    t.assert.match(await page.locator('.kb-note').innerText(), /Clavier QWERTY\s:\spiano sur A W S E D F T G…, octave Z \/ X/);
    t.assert.equal((await page.state()).settings.kbLayout, 'qwerty');
    await page.go('#/pads', 500);
    await page.store("s.settings.kbLayout = 'azerty';");
    t.assert.equal(await page.evaluate(() => import('/src/keyboard.js').then((m) => [m.keyLabel('KeyA'), m.keyLabel('KeyQ'), m.keyLabel('KeyW'), m.keyLabel('KeyZ'), m.keyLabel('Semicolon'), m.fmtKeys('Do = {KeyA}')].join())), 'Q,A,Z,W,M,Do = Q');
  },

  'parcours : la bulle du contrôle (dernier nœud d’une unité ou d’une partie) reste visible et cliquable': async (t) => {
    for (const device of ['pc', 'mobile']) {
      const page = await t.open({ route: '#/learn', device });
      await unlockTo(page, 'u3-cp');
      await page.go('#/learn', 500);
      for (const id of ['u3-cp', 'u1-cp']) {
        await page.locator(`.pnode[data-node="${id}"]`).click(); await page.waitForTimeout(500);
        const hit = await page.locator('.ppop .btn3d').first().evaluate((b) => { const r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
        t.assert.ok(hit, `bouton de la bulle recouvert (${id}, ${device})`);
      }
      await page.locator('.ppop a').first().click(); await page.waitForTimeout(400);
      t.assert.match(page.url(), /#\/lesson\?id=u1-cp/);
    }
  },
};
