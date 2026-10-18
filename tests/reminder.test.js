import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminderMessage, streakAtRisk, afterTime } from '../src/core/reminder.js';

const S = (x = {}) => ({ xp: 0, days: {}, log: [], streak: { count: 0, last: null, best: 0 }, ...x });
const tue = new Date('2026-10-20T19:30:00'); // mardi
const mon = new Date('2026-10-19T19:30:00'); // lundi

test('rappel : rien si on a déjà joué aujourd’hui', () => {
  assert.equal(reminderMessage(S({ days: { '2026-10-20': { exercises: 2 } } }), tue), null);
});
test('rappel : série en danger en priorité', () => {
  const s = S({ streak: { count: 6, last: '2026-10-19', best: 6 } });
  assert.ok(streakAtRisk(s, tue));
  assert.match(reminderMessage(s, tue).title, /série de 6 jours/);
});
test('rappel : le lundi, test de la semaine', () => {
  assert.match(reminderMessage(S(), mon).title, /test de la semaine/);
  assert.doesNotMatch(reminderMessage(S({ placement: { '2026-10-19': { global: 50 } } }), mon).title, /test/);
});
test('rappel : étape du projet du jour', () => {
  const s = S({ weekProjects: { '2026-10-19': { week: '2026-10-19', startedDay: '2026-10-19', title: 'Projet House' } } });
  assert.match(reminderMessage(s, tue).title, /Projet House : les accords/);
});
test('heure du rappel', () => {
  assert.equal(afterTime('19:00', tue), true);
  assert.equal(afterTime('20:00', tue), false);
});
