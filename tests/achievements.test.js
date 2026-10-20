import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, CATEGORIES, newAchievements, categoryProgress, CARDS, drawCard, cardsOwed, RARITY } from '../src/core/achievements.js';
import { LEVELS } from '../src/data/rush.js';
import { PAD_LEVELS } from '../src/data/pads.js';

const fresh = () => ({ xp: 0, skills: { rythme: 0, harmonie: 0, melodie: 0, sound: 0, oreille: 0, autonomie: 0 }, streak: { count: 0, best: 0 }, days: {}, badges: {}, genres: {}, missions: {}, notebook: [], stats: { exercises: 0, sessions: 0, earCorrect: 0, earTotal: 0, hints: 0, noHintWins: 0, beatPerfect: 0, bestCatchy: 0, bestMatch: 0, exports: 0, midiNotes: 0 }, settings: {} });

test('succès : identifiants uniques, catégories, paliers, rien d’acquis au départ', () => {
  const ids = ACHIEVEMENTS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ACHIEVEMENTS.length >= 55, `${ACHIEVEMENTS.length} succès`);
  for (const a of ACHIEVEMENTS) {
    assert.ok(CATEGORIES.some((c) => c.id === a.cat), a.id);
    assert.ok(['bronze', 'silver', 'gold'].includes(a.tier), a.id);
    assert.ok(a.emoji && a.name && a.desc, a.id);
  }
  for (const c of CATEGORIES) assert.ok(categoryProgress(fresh(), c.id).total >= 3, c.id);
  assert.deepEqual(newAchievements(fresh()), []);
});

test('succès des jeux : niveaux, chapitres, étoiles, club', () => {
  const s = fresh();
  s.rush = { best: Object.fromEntries(LEVELS.filter((l) => l.ch === 1).map((l) => [l.id, { stars: 3 }])) };
  s.pads = { best: { [PAD_LEVELS[0].id]: { stars: 1 }, 'otf@ear': { stars: 2 } } };
  s.club = { nights: 12, crate: { house: { n: 1, kind: 'gold' } }, best: { bar: { stars: 3 } }, dailyCount: 7 };
  const got = newAchievements(s).map((a) => a.id);
  for (const id of ['rush1', 'rushCh1', 'pads1', 'club1', 'club10', 'clubGold', 'daily7']) assert.ok(got.includes(id), id);
  for (const id of ['rush15', 'rushAll', 'padsCh1', 'club50', 'crate10']) assert.ok(!got.includes(id), id);
  s.rush.best = Object.fromEntries(LEVELS.map((l) => [l.id, { stars: 1 }]));
  assert.ok(newAchievements(s).some((a) => a.id === 'rushAll'));
});

test('cartes : tirage reproductible, sans doublon, une par succès', () => {
  assert.equal(CARDS.length, 24);
  assert.equal(new Set(CARDS.map((c) => c.id)).size, 24);
  CARDS.forEach((c) => assert.ok(RARITY[c.rarity] && c.fact.length > 40 && c.year > 1900, c.id));
  assert.deepEqual(drawCard({}, 'x'), drawCard({}, 'x'));
  const owned = Object.fromEntries(CARDS.slice(0, 23).map((c) => [c.id, true]));
  assert.equal(drawCard(owned, 'y').id, CARDS[23].id);
  assert.equal(drawCard(Object.fromEntries(CARDS.map((c) => [c.id, true])), 'z'), null);
  const s = fresh();
  s.badges = { first: 'd', streak3: 'd', midi: 'd' };
  const owed = cardsOwed(s);
  assert.equal(owed.length, 3);
  assert.equal(new Set(owed.map((c) => c.id)).size, 3);
  s.cards = Object.fromEntries(owed.map((c) => [c.id, 'd']));
  assert.equal(cardsOwed(s).length, 0, 'rien de plus tant qu’il n’y a pas de nouveau succès');
  s.badges = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, 'd']));
  assert.equal(cardsOwed(s).length, 21, 'jamais plus de cartes qu’il n’en existe');
});
