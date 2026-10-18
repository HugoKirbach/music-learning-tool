// Tous les écrans s'affichent sans erreur, sur PC et mobile, sans débordement horizontal.
export const ROUTES = ['home', 'labs', 'beat', 'beat?mode=ear&genre=dnb', 'beat?mode=constraint&genre=trap', 'chords', 'chords?mode=recipe&genre=lofi',
  'melody?genre=house&load=1', 'melody?mode=challenge&genre=ukg', 'melody?mode=dictation&genre=trance', 'synth', 'synth?mode=match',
  'ear', 'ear?mode=intervals', 'ear?mode=chords', 'ear?mode=progressions', 'ear?mode=genre', 'ear?mode=sound', 'ear?mode=review',
  'atlas', 'atlas?g=afrohouse', 'studio', 'studio?mission=m-euclid', 'studio?dice=1', 'notebook', 'profile', 'callresponse',
  'arrange', 'arrange?challenge=contrast', 'analyze', 'program', 'program?project=2', 'hum', 'hum?mode=response', 'basslab',
  'mixdown', 'remix', 'bilan', 'rush', 'rush?level=house', 'pads', 'pads?level=trap', 'friends'];

async function tour(t, device) {
  const page = await t.open({ device });
  const problems = [];
  for (const r of ROUTES) {
    await page.go('#/' + r, 300);
    const info = await page.evaluate(() => ({
      text: document.getElementById('view').innerText.trim().length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    }));
    if (info.text < 30) problems.push(`${r} : écran vide`);
    if (info.overflow > 2) problems.push(`${r} : débordement horizontal de ${info.overflow}px`);
  }
  t.assert.deepEqual(problems, []);
}

export const tests = {
  'tous les écrans (PC)': (t) => tour(t, 'pc'),
  'tous les écrans (mobile)': (t) => tour(t, 'mobile'),
};
