// Bouton « Partager » : lien de partage (feuille de partage du téléphone, sinon copie dans le presse-papiers).
import { toast } from './ui.js';
import { encodeProject, shareUrl } from './core/sharecode.js';

export async function shareIdea(project, title = 'Mon idée BeatForge') {
  const url = shareUrl(await encodeProject(project));
  if (navigator.share) {
    try { await navigator.share({ title, text: `Écoute mon idée sur BeatForge 🎧`, url }); return url; } catch (e) { if (e.name === 'AbortError') return url; }
  }
  try { await navigator.clipboard.writeText(url); toast('Lien copié : colle-le à qui tu veux 🔗', 'good'); } catch (e) { prompt('Copie ce lien :', url); }
  return url;
}
