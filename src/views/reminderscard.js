// Carte « Rappels » du Profil.
import { el, card, toast, download } from '../ui.js';
import { getState, update } from '../store.js';
import { remindersSupported, enableReminders, disableReminders, testReminder, writeReminderData } from '../reminders.js';
import { makeIcs } from './program.js';

export function remindersCard() {
  const body = el('div');
  const node = card(el('h3', '🔔 Rappels intelligents'), body);
  const paint = () => {
    const r = getState().settings.reminders || {};
    const time = el('input', { type: 'time', value: r.time || '19:00', onchange: (e) => { update((s) => { s.settings.reminders = { ...(s.settings.reminders || {}), time: e.target.value }; }); writeReminderData(); } });
    const perm = remindersSupported() ? Notification.permission : 'unsupported';
    const auto = r.mode === 'periodic';
    body.replaceChildren(
      el('p.small.muted', 'Un seul rappel par jour, seulement si tu n’as pas encore joué. Le message s’adapte : série en danger, test du lundi, étape du projet…'),
      el('div.ctrl-row', el('label', 'Heure'), time,
        el('button.btn.small' + (r.enabled ? '.primary' : ''), {
          onclick: async () => {
            if (r.enabled) { update((s) => { s.settings.reminders = { ...r, enabled: false }; }); await disableReminders(); paint(); return; }
            const res = await enableReminders();
            if (res === 'denied') toast('Notifications refusées : autorise-les dans les réglages du navigateur', 'bad', 4500);
            if (res === 'unsupported') toast('Notifications indisponibles ici : utilise le rappel d’agenda', 'info', 4500);
            update((s) => { s.settings.reminders = { ...r, time: time.value, enabled: res === 'periodic' || res === 'granted', mode: res }; });
            writeReminderData();
            paint();
          },
        }, r.enabled ? '✓ Activés' : 'Activer')),
      el('p.small', r.enabled && auto ? '✅ L’app installée te notifiera même fermée (Chrome / Android).'
        : r.enabled ? '⚠️ Ce navigateur ne réveille pas l’app fermée : le rappel s’affiche à l’ouverture. Pour un rappel garanti, ajoute-le à ton agenda.'
          : perm === 'unsupported' ? 'Notifications indisponibles sur cet appareil : ajoute le rappel à ton agenda.' : ''),
      el('div.row.gap.wrap',
        r.enabled ? el('button.btn.small', { onclick: () => testReminder().catch(() => toast('Test impossible', 'bad')) }, '🔔 Tester') : null,
        el('button.btn.small', { onclick: () => { download('beatforge-rappel.ics', makeIcs(time.value), 'text/calendar'); toast('Ouvre le fichier pour l’ajouter à ton agenda 📅', 'good'); } }, '📅 Ajouter à mon agenda (.ics)')),
    );
  };
  paint();
  return node;
}
