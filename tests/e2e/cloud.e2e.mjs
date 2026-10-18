// Compte et synchronisation entre deux appareils (faux Firebase appliquant les règles de sécurité).
import { fakeCloud } from './harness.mjs';

export async function signUp(page, email, pw = 'secret1', create = true) {
  await page.go('#/profile?account=1', 400);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', pw);
  await page.click(create ? 'button:has-text("Créer un compte")' : 'button:has-text("Se connecter")');
  await page.waitForTimeout(900);
}
const skipPseudo = async (page) => { if (await page.locator('text=Choisis ton pseudo').count()) { await page.click('text=Plus tard'); await page.waitForTimeout(200); } };
const syncNow = async (page) => { await page.go('#/profile'); await skipPseudo(page); await page.click('text=Synchroniser maintenant'); await page.waitForTimeout(700); };
const summary = (s) => ({ xp: s.xp, nb: s.notebook.map((x) => x.title).sort(), bpm: s.project.bpm });

export const tests = {
  'deux appareils : fusion, synchro, conflit simultané, carnet séparé': async (t) => {
    const cloud = fakeCloud();
    const A = await t.open({ cloud, name: 'PC' });
    await A.store("s.xp = 120; s.notebook.unshift({ id: 1, type: 'idea', title: 'Idée PC', date: 1 });");
    await signUp(A, 'hugo@test.fr', 'mauvais', false);
    t.assert.match(await A.locator('p.bad').innerText(), /incorrect/);
    await signUp(A, 'hugo@test.fr');
    await skipPseudo(A);
    const main = cloud.docs.get('users/u-hugo@test.fr');
    t.assert.ok(main?.split, 'format séparé');
    t.assert.equal(JSON.parse(main.data).notebook.length, 0, 'le carnet n’est pas dans le document principal');
    t.assert.ok(cloud.docs.get('users/u-hugo@test.fr/notebook/1'), 'idée rangée dans son propre document');

    const B = await t.open({ cloud, device: 'mobile', name: 'Mobile' });
    await B.store("s.xp = 50; s.notebook.unshift({ id: 2, type: 'idea', title: 'Idée tel', date: 2 });");
    await signUp(B, 'hugo@test.fr', 'secret1', false);
    await B.waitForSelector('text=Fusionner les deux', { timeout: 4000 });
    await B.click('text=Fusionner les deux'); await B.waitForTimeout(900);
    await skipPseudo(B);
    t.assert.deepEqual(summary(await B.state()).nb, ['Idée PC', 'Idée tel']);
    await syncNow(A);
    t.assert.deepEqual(summary(await A.state()).nb, ['Idée PC', 'Idée tel']);

    // Modifications simultanées des deux côtés → rien de perdu
    await Promise.all([A.store('s.xp = 400; s.project.bpm = 137;'), B.store("s.notebook.unshift({ id: 3, type: 'idea', title: 'Idée 3', date: 3 });")]);
    await A.waitForTimeout(5500);
    await syncNow(B); await syncNow(A);
    const a = summary(await A.state()), b = summary(await B.state());
    t.assert.deepEqual(a, b);
    t.assert.equal(a.xp, 400);
    t.assert.equal(a.bpm, 137);
    t.assert.deepEqual(a.nb, ['Idée 3', 'Idée PC', 'Idée tel']);

    // Suppression d'une idée : propagée, et elle ne revient pas
    await B.go('#/notebook');
    B.on('dialog', (d) => d.accept());
    const before = cloud.docs.has('users/u-hugo@test.fr/notebook/1');
    await B.evaluate(async () => { const m = await import('/src/store.js'); m.update((s) => { s.notebook = s.notebook.filter((n) => n.id !== 1); s.deleted = [...(s.deleted || []), 1]; }); });
    await syncNow(B); await syncNow(A);
    t.assert.ok(before && !cloud.docs.has('users/u-hugo@test.fr/notebook/1'));
    t.assert.deepEqual(summary(await A.state()).nb, ['Idée 3', 'Idée tel']);
  },
  'historique : sauvegarde du jour et restauration': async (t) => {
    const cloud = fakeCloud();
    const A = await t.open({ cloud });
    await A.store('s.xp = 500;');
    await signUp(A, 'h@test.fr');
    await skipPseudo(A);
    const ids = [...cloud.docs.keys()].filter((k) => k.startsWith('users/u-h@test.fr/backups/'));
    t.assert.equal(ids.length, 1);
    // 9 anciennes sauvegardes → il n'en reste que 7 après la suivante
    for (let d = 1; d <= 9; d++) cloud.docs.set(`users/u-h@test.fr/backups/2025-01-0${d}`, { data: JSON.stringify({ v: 2, xp: d, days: {}, notebook: [] }), at: d, xp: d, withNotebook: true });
    await A.evaluate(() => { const m = JSON.parse(localStorage.getItem('beatforge.cloud')); m.lastBackup = 'hier'; localStorage.setItem('beatforge.cloud', JSON.stringify(m)); });
    await A.store('s.xp = 600;');
    await A.waitForTimeout(5000);
    const left = [...cloud.docs.keys()].filter((k) => k.includes('/backups/')).sort();
    t.assert.equal(left.length, 7);
    await A.go('#/profile');
    await A.click('text=🕘 Sauvegardes en ligne'); await A.waitForTimeout(500);
    A.on('dialog', (d) => d.accept());
    await A.locator('.acct-backups >> text=Restaurer').last().click(); await A.waitForTimeout(800);
    const s = await A.state();
    t.assert.ok(s.xp < 600, `restauré : ${s.xp} XP`);
    t.assert.equal(JSON.parse(cloud.docs.get('users/u-h@test.fr').data).xp, s.xp, 'la restauration est envoyée en ligne');
  },
  'règles : impossible de lire la progression d’un autre compte': async (t) => {
    const cloud = fakeCloud();
    const A = await t.open({ cloud });
    await signUp(A, 'a@test.fr');
    await skipPseudo(A);
    const r = cloud.fs('get', ['users/u-a@test.fr'], 'u-pirate');
    t.assert.deepEqual(r, { __err: 'permission-denied' });
  },
};
