// Tableau de bord de progrès, révisions espacées, objectifs, certificats, latence, hors-ligne et installation.
import { fakeCloud } from './harness.mjs';
import { signUp } from './cloud.e2e.mjs';

const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };

export const tests = {
  'mes progrès : courbes, compétences qui stagnent, cibler la compétence': async (t) => {
    const page = await t.open({ device: 'mobile' });
    const days = {};
    for (let i = 0; i < 70; i += 3) days[day(-i)] = { xp: 40, sec: 600 + i * 10, acc: { n: 2, sum: 120 + i }, tempo: 90 + (70 - i), ear: { ok: 3, total: 4 }, skills: i > 20 ? { harmonie: 30, rythme: 10 } : { rythme: 40 } };
    await page.store(`s.days = ${JSON.stringify(days)}; s.skills.harmonie = 400; s.skills.rythme = 500; s.xp = 1000;`);
    await page.go('#/progress', 600);
    t.assert.equal(await page.locator('svg.pchart').count(), 4);
    t.assert.match(await page.locator('.stat-grid').first().innerText(), /BPM/);
    t.assert.equal(await page.locator('.skill-spark').count(), 6);
    t.assert.match(await page.locator('.stagnant').innerText(), /Harmonie/);
    await page.clickC('text=🎯 Cibler ça');
    const st = await page.state();
    t.assert.equal(st.settings.focusOverride.skill, 'harmonie');
    // Les sessions express ciblent maintenant cette compétence (2 sessions sur 3, tirage selon le jour)
    t.assert.equal(await page.evaluate(async (s) => (await import('./src/core/pedagogy.js')).weekFocus(s), st), 'harmonie');
    const foci = await page.evaluate(async () => {
      const { buildSession } = await import('./src/core/daily.js');
      return Array.from({ length: 30 }, (_, i) => buildSession(`2026-01-01#${i}`, { focus: 'harmonie' }).focus);
    });
    t.assert.ok(foci.filter((f) => f === 'harmonie').length >= 18, foci.join(','));
    await page.go('#/home');
    await page.clickC('text=⚡ Lancer une session'); await page.waitForTimeout(300);
    t.assert.ok((await page.state()).session, 'session lancée');
  },

  'objectifs : création, paliers hebdomadaires, suppression': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.store(`s.days['${day(-1)}'] = { xp: 20, tempo: 100 };`);
    await page.go('#/progress', 500);
    await page.clickC('text=＋ Nouvel objectif');
    await page.fill('.goal-target', '140');
    await page.click('.modal-card >> text=8 sem.');
    await page.click('.modal-card >> text=Créer'); await page.waitForTimeout(300);
    const g = (await page.state()).goals[0];
    t.assert.deepEqual([g.kind, g.target, g.start, g.weeks], ['tempo', 140, 100, 8]);
    t.assert.equal(await page.locator('.goal-steps span').count(), 8);
    t.assert.match(await page.locator('div.goal').innerText(), /Réussir un niveau à 140 BPM[\s\S]*Actuel : 100 BPM/);
    // Objectif déjà atteint : refusé
    await page.clickC('text=＋ Nouvel objectif');
    await page.click('.modal-card >> text=🏆 Monter de niveau');
    await page.fill('.goal-target', '1');
    await page.click('.modal-card >> text=Créer'); await page.waitForTimeout(200);
    t.assert.equal((await page.state()).goals.length, 1);
    await page.click('.modal-card >> text=Annuler'); await page.waitForTimeout(250);
    page.once('dialog', (d) => d.accept());
    await page.clickC('div.goal >> text=Supprimer'); await page.waitForTimeout(200);
    t.assert.equal((await page.state()).goals.length, 0);
  },

  'certificat au nouveau titre : annonce, image téléchargeable': async (t) => {
    const page = await t.open();
    await page.store('s.xp = 295;');
    await page.evaluate(async () => { const m = await import('/src/store.js'); m.recordExercise({ key: 'beat:free', xp: 10, skill: 'rythme' }); });
    await page.waitForTimeout(300);
    t.assert.match(await page.locator('.toast').last().innerText(), /Certificat « Beatmaker »/);
    t.assert.ok((await page.state()).certs['3']);
    await page.go('#/progress', 500);
    t.assert.equal(await page.locator('.cert:not(.locked)').count(), 1);
    t.assert.match(await page.locator('.cert.locked').innerText(), /Niveau 5[\s\S]*encore 695 XP/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.clickC('.cert >> button[title="Télécharger"]')]);
    t.assert.equal(dl.suggestedFilename(), 'beatforge-certificat-niveau-3.png');
    const buf = await (await import('node:fs/promises')).readFile(await dl.path());
    t.assert.equal(buf.subarray(1, 4).toString(), 'PNG');
    t.assert.ok(buf.length > 20000, 'image dessinée');
  },

  'révisions : oreille + niveaux de jeu ratés, au même endroit': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.evaluate(async () => { const m = await import('/src/store.js'); m.recordGameReview('rush:pulse', false); m.recordGameReview('pads:otf', true); });
    let st = await page.state();
    t.assert.deepEqual(Object.keys(st.review), ['rush:pulse'], 'réussi sans fiche : rien à réviser');
    await page.store(`s.review['rush:pulse'].due = '${day(0)}'; s.review['intervals:7'] = { box: 0, due: '${day(0)}' }; s.review['chords:maj7'] = { box: 1, due: '${day(3)}' };`);
    await page.go('#/review', 500);
    const txt = await page.locator('#view').innerText();
    t.assert.match(txt, /Oreille · 1 notion/);
    t.assert.match(txt, /Niveaux à rejouer · 1[\s\S]*Rondes et blanches/);
    t.assert.match(txt, /3 fiches en cours/);
    // Le quiz d'oreille ne reçoit que les notions d'oreille
    await page.clickC('text=▶ Réviser'); await page.waitForTimeout(500);
    t.assert.match(await page.locator('#view').innerText(), /Révisions d’oreille/);
    await page.go('#/review', 400);
    await page.clickC('.review-row >> text=Jouer'); await page.waitForTimeout(500);
    t.assert.match(page.url(), /#\/rush\?level=pulse/);
    t.assert.match(await page.locator('#view').innerText(), /Rondes et blanches/);
    // Réussi le jour prévu : passe à l'intervalle suivant (3 jours)
    await page.evaluate(async () => { const m = await import('/src/store.js'); m.recordGameReview('rush:pulse', true); });
    st = await page.state();
    t.assert.deepEqual(st.review['rush:pulse'], { box: 1, due: day(3) });
  },

  'latence : mesure en tapant, enregistrement, correction par source': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.go('#/latency', 400);
    t.assert.match(await page.locator('#view').innerText(), /Écran tactile[\s\S]*non calibré/);
    // Tape 70 ms après chaque clic (horloge audio de la page)
    await page.evaluate(async () => {
      const a = await import('/src/core/audio.js');
      a.ensureAudio();
      document.querySelector('.btn.primary.big').click();
      const t0 = a.now() + 0.5, spb = 60 / 90, out = a.outputLatency();
      await new Promise((r) => setTimeout(r, 50));
      const pad = document.querySelector('.tap-pad');
      for (let k = 0; k < 16; k++) {
        const target = t0 + (4 + k) * spb + out + 0.07;
        await new Promise((r) => setTimeout(r, Math.max(0, (target - a.now()) * 1000)));
        pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      }
    });
    await page.waitForSelector('text=✅ Enregistrer', { timeout: 5000 });
    const res = await page.locator('#view').innerText();
    const ms = Number(/([+-]?\d+) ms\s*décalage/.exec(res)[1]);
    t.assert.ok(ms >= 50 && ms <= 95, `décalage mesuré ${ms} ms`);
    await page.click('text=✅ Enregistrer'); await page.waitForTimeout(200);
    const lat = (await page.state()).settings.latency;
    t.assert.equal(lat.touch, ms);
    t.assert.equal(lat.key, undefined);
    t.assert.equal(await page.evaluate(async () => { const m = await import('/src/core/latency.js'); const s = await import('/src/store.js'); return [m.inputLatency(s.getState().settings, 'p1'), m.inputLatency(s.getState().settings, 'midi60')]; }).then((x) => x[1]), 0);
    await page.click('text=Remettre à 0'); await page.waitForTimeout(200);
    t.assert.equal((await page.state()).settings.latency.touch, undefined);
  },

  'temps de pratique mesuré quand on joue': async (t) => {
    const page = await t.open({ onboard: false });
    await page.clock.install();
    await page.reload(); await page.waitForTimeout(300);
    await page.click('text=C’est parti');
    for (let i = 0; i < 6; i++) { await page.mouse.click(5, 300); await page.clock.runFor(15000); }
    await page.clock.runFor(1000);
    const d = (await page.state()).days[day(0)];
    t.assert.ok(d.sec >= 60 && d.sec <= 120, `secondes : ${d.sec}`);
    // Sans activité, le compteur s'arrête
    await page.clock.runFor(5 * 60000);
    t.assert.ok((await page.state()).days[day(0)].sec <= 210, 'pas de temps compté sans activité');
  },

  'hors-ligne avec un compte : démarrage sans réseau, puis synchro au retour': async (t) => {
    const cloud = fakeCloud();
    const page = await t.open({ cloud, device: 'mobile' });
    await signUp(page, 'nomade@test.fr');
    if (await page.locator('text=Choisis ton pseudo').count()) await page.click('text=Plus tard');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForTimeout(1500); // le service worker contrôle la page et garde le module de compte
    t.assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller));
    await page.context().setOffline(true);
    await page.reload(); await page.waitForTimeout(1500);
    t.assert.ok(await page.locator('.chip.cloud.offline').count(), 'pastille hors-ligne avec le compte');
    t.assert.match(await page.locator('.toast').allInnerTexts().then((x) => x.join(' ')), /Hors-ligne : continue à jouer/);
    await page.evaluate(async () => { const m = await import('/src/store.js'); m.recordExercise({ key: 'beat:free', xp: 33, skill: 'rythme' }); });
    await page.go('#/profile?account=1', 600);
    t.assert.match(await page.locator('.card:has-text("Compte & synchro")').innerText(), /Hors-ligne[\s\S]*partiront tout seuls/);
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(2500);
    t.assert.match(await page.locator('.toast').allInnerTexts().then((x) => x.join(' ')), /Connexion retrouvée/);
    const doc = cloud.docs.get('users/u-nomade@test.fr');
    t.assert.equal(JSON.parse(doc.data).xp, (await page.state()).xp);
  },

  'installation : raccourcis, écran de démarrage, plein écran paysage dans les jeux': async (t) => {
    const page = await t.open({ device: 'mobile' });
    const man = await page.evaluate(() => fetch('manifest.webmanifest').then((r) => r.json()));
    t.assert.deepEqual(man.shortcuts.map((x) => x.short_name), ['Session', 'Piano Rush', 'Pad Rush', 'Progrès']);
    t.assert.equal(await page.locator('#splash').count(), 0, 'écran de démarrage retiré');
    await page.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
    await page.go('#/profile', 500);
    await page.clickC('text=📲 Installer BeatForge'); await page.waitForTimeout(200);
    t.assert.ok(await page.evaluate(() => window.__prompted));
    await page.go('#/rush?level=pulse', 500);
    await page.clickC('text=▶ Jouer'); await page.waitForTimeout(600);
    t.assert.ok(await page.locator('button[title="Plein écran paysage"]').count());
  },
  'jeux en paysage sur téléphone : tout tient à l’écran': async (t) => {
    const page = await t.open({ device: 'mobile' });
    await page.setViewportSize({ width: 844, height: 390 });
    for (const r of ['#/rush?level=pulse', '#/pads?level=otf']) {
      await page.go(r, 500);
      await page.clickC('text=▶ Jouer'); await page.waitForTimeout(800);
      const info = await page.evaluate(() => {
        const zone = document.querySelector('.pad-grid') || document.querySelector('canvas');
        const b = zone?.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth - innerWidth, zone: b ? [Math.round(b.top), Math.round(b.bottom), Math.round(b.height)] : null };
      });
      t.assert.ok(info.overflow <= 2, `${r} déborde de ${info.overflow}px`);
      t.assert.ok(info.zone && info.zone[2] >= 150, `${r} zone de jeu trop petite ${JSON.stringify(info.zone)}`);
      await page.clickC('button:has-text("✕")'); await page.waitForTimeout(200);
    }
  },
};
