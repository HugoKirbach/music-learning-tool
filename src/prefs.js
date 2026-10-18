// Préférences d'affichage : thème (auto / sombre / clair) et animations (auto / réduites / complètes).
import { getState, subscribe } from './store.js';

const darkQuery = matchMedia('(prefers-color-scheme: light)');
let last = '';
export function applyPrefs() {
  const st = getState().settings;
  const theme = st.theme === 'light' || (st.theme !== 'dark' && darkQuery.matches) ? 'light' : 'dark';
  const motion = st.motion || 'auto';
  const key = theme + motion;
  if (key === last) return;
  last = key;
  const root = document.documentElement;
  root.dataset.theme = theme;
  if (motion === 'auto') delete root.dataset.motion; else root.dataset.motion = motion;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f4fa' : '#0d0d16');
}
subscribe(applyPrefs);
darkQuery.addEventListener?.('change', () => { last = ''; applyPrefs(); });
