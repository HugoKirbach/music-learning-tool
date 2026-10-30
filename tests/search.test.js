import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fold, scoreItem, search } from '../src/core/search.js';

test('recherche : accents, majuscules et ponctuation ignorés', () => {
  assert.equal(fold('Lab Mélodie — Défi d’oreille'), 'lab melodie defi d oreille');
  assert.ok(scoreItem({ name: 'Quiz d’oreille' }, 'OREILLE') > 0);
});

test('recherche : début de mot du nom avant la description', () => {
  const items = [{ name: 'Lab Synthé', desc: 'presets Serum' }, { name: 'Serum 2 : basse' }, { name: 'Atlas', keys: 'styles' }];
  assert.deepEqual(search(items, 'serum').map((x) => x.name), ['Serum 2 : basse', 'Lab Synthé']);
  assert.deepEqual(search(items, 'zzz'), []);
});

test('recherche : tous les mots doivent correspondre, dans n’importe quel ordre', () => {
  const items = [{ name: 'Piano Rush', keys: 'clavier notes' }, { name: 'Pad Rush', keys: 'batterie' }];
  assert.deepEqual(search(items, 'rush batterie').map((x) => x.name), ['Pad Rush']);
  assert.deepEqual(search(items, 'notes piano').map((x) => x.name), ['Piano Rush']);
});
