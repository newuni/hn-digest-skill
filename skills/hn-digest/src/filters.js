export function isShowHN(title = '') {
  return title.toLowerCase().startsWith('show hn');
}

// Excluir Apple/Mac, automoción/coches/EVs (heurístico)
const EXCLUDE_RE = /\b(apple|mac|iphone|ipad|ios|vision\s*pro|tesla|\bev\b|electric\s+vehicle|car|cars|automotive)\b/i;

export function isExcludedByTitle(title = '') {
  return EXCLUDE_RE.test(title);
}

export function passesScore(item, { minPoints = 80 } = {}) {
  const score = item?.score ?? 0;
  if (isShowHN(item?.title ?? '')) return true;
  return score >= minPoints;
}

export function filterStories(stories, { minPoints = 80 } = {}) {
  const kept = [];
  for (const it of stories) {
    if (!it || it.type !== 'story') continue;
    const title = it.title ?? '';
    if (isExcludedByTitle(title)) continue;
    if (!passesScore(it, { minPoints })) continue;
    kept.push(it);
  }
  return kept;
}

export function pickShowHN(stories, { max = 3 } = {}) {
  const show = stories.filter(s => isShowHN(s?.title ?? '') && !isExcludedByTitle(s?.title ?? ''));
  show.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return show.slice(0, max);
}
