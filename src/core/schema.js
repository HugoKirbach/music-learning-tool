// Format de la sauvegarde : numéro de version + étapes de mise à jour explicites.
// Règle : on n'enlève jamais de données ; une nouvelle version ajoute une étape ici (et un test).

export const SCHEMA = 2;

const MIGRATIONS = {
  // v1 → v2 : champs ajoutés au fil des fonctionnalités (récents, jeux, suppressions du carnet, journal…)
  1: (s) => {
    s.recent = Array.isArray(s.recent) ? s.recent : [];
    s.deleted = Array.isArray(s.deleted) ? s.deleted : [];
    s.log = Array.isArray(s.log) ? s.log : [];
    s.review = s.review && typeof s.review === 'object' ? s.review : {};
    s.later = Array.isArray(s.later) ? s.later : [];
    s.customDice = Array.isArray(s.customDice) ? s.customDice : [];
    s.notebook = Array.isArray(s.notebook) ? s.notebook.filter((n) => n && n.id != null) : [];
    if (s.project && typeof s.project === 'object' && !s.project.mutes) s.project.mutes = {};
    if (s.program && !s.program.done) s.program.done = {};
    for (const k of ['rush', 'pads']) if (s[k] && typeof s[k] === 'object') { s[k].best = s[k].best || {}; s[k].learn = s[k].learn || {}; }
  },
};

/** Vérifie qu'un objet ressemble à une sauvegarde BeatForge. */
export function looksValid(s) {
  return !!s && typeof s === 'object' && typeof s.xp === 'number' && s.xp >= 0 && typeof (s.days || {}) === 'object'
    && (s.v == null || (Number.isInteger(s.v) && s.v >= 1));
}

/** Met à jour une sauvegarde vers la version courante (modifie l'objet). newer = sauvegarde venant d'une version plus récente de l'app. */
export function migrate(s) {
  const from = s.v || 1;
  if (from > SCHEMA) return { state: s, from, newer: true };
  let v = from;
  while (v < SCHEMA) {
    MIGRATIONS[v](s);
    v++;
  }
  s.v = SCHEMA;
  return { state: s, from, newer: false };
}
