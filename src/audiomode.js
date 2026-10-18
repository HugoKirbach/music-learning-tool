// Choix du moteur audio : Auto (Stable sur écran tactile), Performance (latence minimale) ou Stable (téléphones).
import { getState } from './store.js';
import { configureAudio } from './core/audio.js';

export const AUDIO_MODES = [
  { value: 'auto', label: 'Auto', desc: 'Stable sur téléphone et tablette, Performance sur ordinateur.' },
  { value: 'performance', label: '⚡ Performance', desc: 'Latence minimale et effets complets. Idéal sur PC.' },
  { value: 'stable', label: '🛡️ Stable', desc: 'Plus de réserve de son, notes programmées plus tôt, effets allégés : pas de grésillement sur mobile.' },
];

export function wantsStable(m = getState().settings.audioMode || 'auto') {
  return m === 'stable' || (m === 'auto' && matchMedia('(pointer: coarse)').matches);
}

export function applyAudioMode() {
  configureAudio({ stable: wantsStable() });
}
