// Pseudo unique et amis : demande, acceptation, classement, retrait.
import { fakeCloud } from './harness.mjs';
import { signUp } from './cloud.e2e.mjs';

async function pickPseudo(page, name) {
  await page.waitForSelector('text=Choisis ton pseudo', { timeout: 4000 });
  await page.fill('.modal-card input[type=text]', name);
  await page.click('.modal-card >> text=Valider'); await page.waitForTimeout(500);
}

export const tests = {
  'pseudo à la première connexion, unique, puis amis': async (t) => {
    const cloud = fakeCloud();
    const A = await t.open({ cloud, name: 'Hugo' });
    await A.store('s.xp = 900; s.streak = { count: 4, last: new Date().toISOString().slice(0, 10), best: 9 };');
    await signUp(A, 'hugo@test.fr');
    await pickPseudo(A, 'Hugo_Beats');
    t.assert.equal(cloud.docs.get('pseudos/hugo_beats').uid, 'u-hugo@test.fr');
    t.assert.equal(cloud.docs.get('profiles/u-hugo@test.fr').pseudo, 'Hugo_Beats');

    const B = await t.open({ cloud, device: 'mobile', name: 'Léa' });
    await signUp(B, 'lea@test.fr');
    await B.waitForSelector('text=Choisis ton pseudo');
    await B.fill('.modal-card input[type=text]', 'hugo_beats');
    await B.click('.modal-card >> text=Valider'); await B.waitForTimeout(500);
    t.assert.match(await B.locator('.modal-card .bad').innerText(), /déjà pris/);
    await B.fill('.modal-card input[type=text]', 'x');
    await B.click('.modal-card >> text=Valider'); await B.waitForTimeout(200);
    t.assert.match(await B.locator('.modal-card .bad').innerText(), /3 et 20/);
    await B.fill('.modal-card input[type=text]', 'Léa.prod');
    await B.click('.modal-card >> text=Valider'); await B.waitForTimeout(500);

    // Léa invite Hugo
    await B.go('#/friends', 900);
    await B.fill('input[placeholder="Pseudo de ton ami"]', 'hugo_beats');
    await B.click('button:has-text("Ajouter")'); await B.waitForTimeout(700);
    t.assert.ok(cloud.docs.get('requests/u-hugo@test.fr_u-lea@test.fr'));
    t.assert.ok(await B.locator('text=En attente').count());

    // Hugo accepte
    await A.go('#/friends', 1000);
    t.assert.ok(await A.locator('text=Demandes reçues').count());
    await A.click('button:has-text("Accepter")'); await A.waitForTimeout(900);
    t.assert.ok(!cloud.docs.get('requests/u-hugo@test.fr_u-lea@test.fr'));
    t.assert.ok(await A.locator('.ft-name:has-text("Léa.prod")').count());

    // Léa voit Hugo dans le classement, avec son niveau et sa série
    await B.go('#/friends', 1200);
    const row = B.locator('.ft-row:has-text("Hugo_Beats")');
    t.assert.ok(await row.count());
    t.assert.match(await row.innerText(), /4 j/);
    t.assert.match(await row.innerText(), /record 9 j/);

    // Hugo retire Léa → elle disparaît aussi chez Léa
    A.on('dialog', (d) => d.accept());
    await A.click('text=Gérer mes amis');
    await A.click('.friend-req:has-text("Léa.prod") >> text=Retirer'); await A.waitForTimeout(800);
    await B.go('#/friends', 1200);
    t.assert.equal(await B.locator('.ft-row:has-text("Hugo_Beats")').count(), 0);
  },
  'pseudo demandé à un compte déjà connecté (au démarrage suivant)': async (t) => {
    const cloud = fakeCloud();
    const A = await t.open({ cloud });
    await signUp(A, 'old@test.fr');
    await A.click('text=Plus tard'); await A.waitForTimeout(200);
    await A.reload(); await A.waitForTimeout(1200);
    t.assert.ok(await A.locator('text=Choisis ton pseudo').count(), 'redemandé au démarrage');
  },
};
