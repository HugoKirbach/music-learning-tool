// Défi de la semaine (publication / écoute entre deux comptes) et rappels intelligents.
import { fakeCloud } from './harness.mjs';
import { signUp } from './cloud.e2e.mjs';

async function pseudo(page, name) {
  await page.waitForSelector('.modal-card >> text=Choisis ton pseudo', { timeout: 5000 });
  await page.fill('.modal-card input[type=text]', name);
  await page.click('.modal-card >> text=Valider'); await page.waitForTimeout(500);
}

export const tests = {
  'défi de la semaine : règles, publication, écoute des autres': async (t) => {
    const cloud = fakeCloud();
    const A = await t.open({ cloud, name: 'Hugo' });
    await A.go('#/challenge');
    t.assert.ok(await A.locator('text=Connecte-toi').count(), 'publication réservée aux comptes');
    await signUp(A, 'hugo@test.fr');
    await pseudo(A, 'Hugo');
    // une idée qui respecte toutes les règles du défi de la semaine
    await A.evaluate(async () => {
      const { challengeOfWeek, CHALLENGES } = await import('/src/core/challenge.js');
      const { weekId } = await import('/src/core/pedagogy.js');
      const { update, projectFromGenre } = await import('/src/store.js');
      const ch = challengeOfWeek(weekId());
      // on cherche par essais une idée valide (mélodies / tempos / gammes variés)
      const base = projectFromGenre(ch.genre);
      const tries = [];
      for (const bpm of [80, 124, 170]) for (const scale of ['major', 'minor', 'dorian']) for (const notes of [[60, 62, 64], [72, 74, 76, 79]]) {
        const p = JSON.parse(JSON.stringify(base));
        p.bpm = bpm; p.scale = scale; p.ext = 4; p.chords = [{ deg: 5 }, { deg: 3 }, { deg: 5 }, { deg: 3 }];
        p.melody = Array(64).fill(null); for (let i = 0; i < 8; i++) p.melody[i * 8] = { n: notes[i % notes.length], len: 2 };
        p.drums.hat = p.drums.hat.map(() => 0); p.drums.ohat = p.drums.ohat.map(() => 0);
        p.drums.kick = p.drums.kick.map((_, i) => (i % 4 === 2 ? 1 : 0)); p.drums.snare = p.drums.snare.map((_, i) => (i % 4 === 0 ? 2 : i === 6 ? 1 : 0)); p.drums.clap = p.drums.clap.map(() => 0);
        tries.push(p);
      }
      const ok = tries.find((p) => ch.rules.every((r) => r.test(p)));
      update((s) => { s.project = ok || tries[0]; });
    });
    await A.go('#/challenge');
    t.assert.equal(await A.locator('.card.glow .sn-proofs li:not(.ok)').count(), 0, 'toutes les règles respectées');
    await A.click('text=📤 Publier ma version'); await A.waitForTimeout(800);
    const entries = [...cloud.docs.keys()].filter((k) => k.startsWith('challenges/'));
    t.assert.equal(entries.length, 1);

    const B = await t.open({ cloud, device: 'mobile', name: 'Léa' });
    await signUp(B, 'lea@test.fr');
    await pseudo(B, 'Lea');
    await B.go('#/challenge', 900);
    t.assert.ok(await B.locator('.friend-req:has-text("Hugo")').count());
    await B.click('.friend-req:has-text("Hugo") >> text=▶'); await B.waitForTimeout(500);
    t.assert.equal(await B.locator('.friend-req:has-text("Hugo") button').first().innerText(), '■');
    await B.click('.friend-req:has-text("Hugo") >> button[title="Garder dans mon carnet"]'); await B.waitForTimeout(200);
    t.assert.match((await B.state()).notebook[0].title, /par Hugo/);
    // Léa ne peut pas écrire la participation de Hugo (règles)
    t.assert.deepEqual(cloud.fs('set', [entries[0], { pseudo: 'pirate', project: '{}' }], 'u-lea@test.fr'), { __err: 'permission-denied' });
  },
  'rappels : activation, données du jour, notification de test, série en danger': async (t) => {
    const page = await t.open({ permissions: ['notifications'] });
    const y = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    await page.store(`s.streak = { count: 5, last: '${y}', best: 5 };`);
    await page.go('#/home');
    t.assert.ok(await page.locator('text=/série de 5 jours s’arrête/').count(), 'carte « série en danger » sur l’accueil');
    await page.go('#/profile');
    await page.clickC('.card:has-text("Rappels intelligents") >> text=Activer'); await page.waitForTimeout(800);
    t.assert.equal((await page.state()).settings.reminders.enabled, true);
    const data = await page.evaluate(() => new Promise((res) => {
      const r = indexedDB.open('beatforge', 1);
      r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('reminder'); q.onsuccess = () => res(q.result); };
    }));
    t.assert.equal(data.enabled, true);
    t.assert.match(data.message.title, /série de 5 jours/);
    await page.clickC('text=🔔 Tester'); await page.waitForTimeout(500);
    // (Chromium sans écran refuse parfois d'afficher les notifications : on ne vérifie que si la permission est réellement accordée)
    if (await page.evaluate(() => Notification.permission) === 'granted') {
      const notes = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => n.title));
      t.assert.ok(notes.some((x) => /série de 5 jours/.test(x)), JSON.stringify(notes));
    }
    t.assert.ok(await page.locator('text=/réveille pas l’app|notifiera même fermée/').count(), 'état du rappel expliqué');
  },
};
