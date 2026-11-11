// Défis du jour, boulons et garde-robe de Bip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGES, dailyChallenges, challengeStatus, settleChallenges, trackDay, boltsBalance, boltsEarned, challengeTotals, BIP_ITEMS, ownsItem, buyItem, bipLook, CHEST_BOLTS, TIER_BOLTS } from '../src/core/challenges.js';
import { ACHIEVEMENTS, newAchievements } from '../src/core/achievements.js';
import { mergeStates } from '../src/core/merge.js';

const fresh = () => ({ xp: 10, days: {}, stats: { exercises: 0, earCorrect: 0, exports: 0 }, badges: {}, settings: { dailyGoal: 150 }, course: { done: {} }, log: [], streak: {} });

test('défis du jour : trois par jour (un par niveau), les mêmes pour une même date, variés d’un jour à l’autre', () => {
  const s = fresh();
  const a = dailyChallenges('2026-11-12', s), b = dailyChallenges('2026-11-12', s);
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id));
  assert.deepEqual(a.map((c) => c.level), [0, 1, 2]);
  const seen = new Set();
  for (let i = 1; i <= 28; i++) dailyChallenges(`2026-12-${String(i).padStart(2, '0')}`, s).forEach((c) => seen.add(c.id));
  assert.ok(seen.size >= 10, `variété : ${seen.size}`);
  assert.ok(!seen.has('review1'), 'pas de révision proposée avant la première leçon');
  assert.equal(new Set(CHALLENGES.map((c) => c.id)).size, CHALLENGES.length);
});

test('défis : avancement, validation une seule fois, coffre quand les trois sont réussis', () => {
  const s = fresh();
  const d = '2026-11-12';
  const [c0, c1, c2] = dailyChallenges(d, s); // lesson1, combo5, jam6
  assert.deepEqual([c0.id, c1.id, c2.id], ['lesson1', 'combo5', 'jam6']);
  assert.equal(settleChallenges(s, d).bolts, 0);
  trackDay(s, d, { good: 1, combo: 3, jam: 3 });
  assert.deepEqual(challengeStatus(s, d).list.map((c) => c.value), [0, 3, 3]);
  trackDay(s, d, { lesson: 1, combo: 5, jam: 4 });
  let r = settleChallenges(s, d);
  assert.deepEqual(r.won.map((c) => c.id), ['lesson1', 'combo5']);
  assert.equal(r.bolts, c0.bolts + c1.bolts);
  assert.equal(r.chest, false);
  assert.equal(settleChallenges(s, d).won.length, 0, 'pas de double récompense');
  trackDay(s, d, { lesson: 1, jam: 6 });
  r = settleChallenges(s, d);
  assert.deepEqual([r.won.map((c) => c.id), r.chest, r.bolts, r.xp > 0], [['jam6'], true, c2.bolts + CHEST_BOLTS, true]);
  assert.deepEqual(challengeTotals(s), { challenges: 3, chests: 1, bolts: c0.bolts + c1.bolts + c2.bolts + CHEST_BOLTS });
  assert.equal(s.stats.jamFull, 1);
  // Les succès « Défis & Bip » suivent
  const ids = newAchievements(s).map((a) => a.id);
  for (const id of ['chal1', 'chest1', 'jamFull1']) assert.ok(ids.includes(id), id);
});

test('boulons : défis + succès (rétroactifs), dépensés dans la garde-robe ; pièces à débloquer', () => {
  const s = fresh();
  s.badges = { first: '2026-11-01', streak7: '2026-11-08' };
  const tier = (id) => ACHIEVEMENTS.find((a) => a.id === id).tier;
  assert.equal(boltsEarned(s), TIER_BOLTS[tier('first')] + TIER_BOLTS[tier('streak7')]);
  assert.deepEqual(bipLook(s), { skin: 'violet', acc: 'none' });
  assert.ok(ownsItem(s, 'violet') && ownsItem(s, 'none') && ownsItem(s, 'flame'), 'gratuits et débloqués par un succès');
  assert.ok(!ownsItem(s, 'crown') && !ownsItem(s, 'headphones'));
  assert.equal(buyItem(s, 'crown'), false, 'une pièce à débloquer ne s’achète pas');
  assert.equal(buyItem(s, 'headphones'), false, 'pas assez de boulons');
  s.days['2026-11-12'] = { claim: { jam6: 1, combo5: 1, lesson1: 1 }, chest: 1 };
  const before = boltsBalance(s);
  assert.equal(buyItem(s, 'headphones'), true);
  assert.equal(boltsBalance(s), before - BIP_ITEMS.find((x) => x.id === 'headphones').price);
  assert.equal(buyItem(s, 'headphones'), false, 'déjà possédé');
  s.settings.bip = { skin: 'gold', acc: 'headphones' };
  assert.deepEqual(bipLook(s), { skin: 'violet', acc: 'headphones' }, 'une couleur non possédée n’est pas portée');
  assert.ok(newAchievements(s).some((a) => a.id === 'bip1'));
});

test('synchro : défis, coffres et achats de deux appareils se cumulent sans perte', () => {
  const base = { ...fresh(), xp: 100, updatedAt: 1 };
  const a = JSON.parse(JSON.stringify(base)), b = JSON.parse(JSON.stringify(base));
  a.days['2026-11-12'] = { xp: 50, sessions: 0, exercises: 3, les: 1, claim: { lesson1: 1 } }; a.stats['bip:bow'] = 1; a.stats.boltsSpent = 50; a.updatedAt = 5;
  b.days['2026-11-12'] = { xp: 80, sessions: 0, exercises: 4, combo: 5, claim: { combo5: 1 } }; b.updatedAt = 9;
  const m = mergeStates(a, b);
  assert.deepEqual(Object.keys(m.days['2026-11-12'].claim).sort(), ['combo5', 'lesson1']);
  assert.equal(m.days['2026-11-12'].les, 1);
  assert.equal(m.stats['bip:bow'], 1);
  assert.equal(m.stats.boltsSpent, 50);
  assert.equal(challengeTotals(m).challenges, 2);
});
