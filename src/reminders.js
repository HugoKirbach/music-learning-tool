// Rappels : permission de notification, réveil périodique (Chrome / Android, app installée) et données lues par le service worker.
import { getState, subscribe } from './store.js';
import { reminderMessage, practicedToday } from './core/reminder.js';
import { dayKey } from './core/progress.js';

const DB = 'beatforge', STORE = 'kv';
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function kvSet(key, val) {
  const db = await idb();
  await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  db.close();
}

export const remindersSupported = () => 'Notification' in window && 'serviceWorker' in navigator;
export const periodicSupported = () => 'serviceWorker' in navigator && 'periodicSync' in (window.ServiceWorkerRegistration?.prototype || {});

/** Ce que le service worker doit savoir pour décider d'afficher le rappel (recalculé à chaque changement). */
export async function writeReminderData() {
  const s = getState();
  const r = s.settings.reminders || {};
  try {
    await kvSet('reminder', {
      enabled: !!r.enabled, time: r.time || '19:00', day: dayKey(), practiced: practicedToday(s),
      message: reminderMessage(s), notified: r.notified || null,
    });
  } catch (e) { /* IndexedDB indisponible (navigation privée) */ }
}

/** Active les rappels : permission + réveil périodique si le navigateur le permet. Renvoie l'état obtenu. */
export async function enableReminders() {
  if (!remindersSupported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  await writeReminderData();
  if (periodicSupported()) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.periodicSync.register('bf-reminder', { minInterval: 6 * 60 * 60 * 1000 });
      return 'periodic';
    } catch (e) { return 'granted'; }
  }
  return 'granted';
}

export async function disableReminders() {
  await writeReminderData();
  try { const reg = await navigator.serviceWorker.ready; await reg.periodicSync?.unregister('bf-reminder'); } catch (e) { /* noop */ }
}

/** Notification de test (immédiate). */
export async function testReminder() {
  const m = reminderMessage(getState()) || { title: '✅ Tu as déjà joué aujourd’hui', body: 'Le rappel ne te dérangera pas ce soir.', url: '#/home' };
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(m.title, { body: m.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'bf-reminder', data: { url: m.url } });
}

let timer = 0;
subscribe(() => { clearTimeout(timer); timer = setTimeout(writeReminderData, 1500); });
