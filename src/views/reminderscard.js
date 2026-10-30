// Carte « Rappels » (Réglages, Programme) : une seule source de vérité, settings.reminders.
import { el, card, toast, download } from '../ui.js';
import { getState, update } from '../store.js';
import { remindersSupported, enableReminders, disableReminders, testReminder, writeReminderData } from '../reminders.js';

/** Heure du rappel (l'ancien réglage du Programme, settings.reminder, sert de valeur par défaut). */
const reminderTime = (s = getState()) => s.settings.reminders?.time || s.settings.reminder || '19:00';

export function remindersCard() {
  const body = el('div');
  const node = card(el('h3', '🔔 Rappels intelligents'), body);
  const paint = () => {
    const r = getState().settings.reminders || {};
    const time = el('input', { type: 'time', value: reminderTime(), 'aria-label': 'Heure du rappel', onchange: (e) => { update((s) => { s.settings.reminders = { ...(s.settings.reminders || {}), time: e.target.value }; }); writeReminderData(); } });
    const perm = remindersSupported() ? Notification.permission : 'unsupported';
    const auto = r.mode === 'periodic';
    const note = r.enabled && auto ? '✅ L’app installée te notifiera même fermée (Chrome / Android).'
      : r.enabled ? '⚠️ Ce navigateur ne réveille pas l’app fermée : le rappel s’affiche à l’ouverture. Pour un rappel garanti, ajoute-le à ton agenda.'
        : perm === 'unsupported' ? 'Notifications indisponibles sur cet appareil : ajoute le rappel à ton agenda.' : '';
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
      note ? el('p.small', note) : null,
      el('div.row.gap.wrap',
        r.enabled ? el('button.btn.small', { onclick: () => testReminder().catch(() => toast('Test impossible', 'bad')) }, '🔔 Tester') : null,
        el('button.btn.small', { onclick: () => { download('beatforge-rappel.ics', makeIcs(time.value), 'text/calendar'); toast('Ouvre le fichier pour l’ajouter à ton agenda 📅', 'good', 4000); } }, '📅 Ajouter à mon agenda (.ics)')),
    );
  };
  paint();
  return node;
}

/** Rappel quotidien via un fichier agenda (.ics) : fiable sur téléphone et PC, sans serveur. */
export function makeIcs(hhmm, url = location.href.split('#')[0] + '#/home?start=1') {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  const fmt = (x) => `${x.getFullYear()}${z(x.getMonth() + 1)}${z(x.getDate())}T${z(x.getHours())}${z(x.getMinutes())}00`;
  const start = fmt(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m));
  const end = fmt(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m + 10));
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BeatForge//FR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:beatforge-${Date.now()}@beatforge`, `DTSTAMP:${stamp}`,
    `DTSTART:${start}`, `DTEND:${end}`, 'RRULE:FREQ=DAILY',
    'SUMMARY:🎹 BeatForge : session de 10 min', `DESCRIPTION:Ta session du jour t’attend : ${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Session BeatForge', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
