import { isShowHN } from './filters.js';
import { CATEGORY_ORDER } from './categorize.js';

export function hnLink(id) {
  return `https://news.ycombinator.com/item?id=${id}`;
}

export function storyUrl(item) {
  return item?.url || hnLink(item?.id);
}

export function defaultBlurb(title = '') {
  const t = title.toLowerCase();
  if (t.includes('paper') || t.includes('research'))
    return 'Lectura con sustancia (más investigación que hype), buena para sacar ideas aplicables.';
  if (/(benchmark|performance|faster|latency)/.test(t))
    return 'Rendimiento y trade-offs reales; suele haber detalles jugosos en comentarios.';
  if (/(open source|oss|mit|apache|github)/.test(t))
    return 'Huele a herramienta/librería para probar y robar patrones de diseño.';
  if (/(security|cve|vulnerability|exploit|privacy)/.test(t))
    return 'Señales útiles de seguridad/privacidad y mitigaciones prácticas.';
  if (/(llm|gpt|ai|ml|transformer)/.test(t))
    return 'Señales sobre IA/LLMs aplicada: arquitectura, producto o investigación.';
  return 'Tema con tracción hoy; merece vistazo por el ángulo técnico y la discusión.';
}

export function renderDigest({
  dateLabel,
  highlights = [],
  grouped = new Map(),
  showHn = [],
  maxPerCategory = 5
} = {}) {
  const lines = [];
  lines.push(`🍊 HN DIGEST — ${dateLabel}`);
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('⭐ DESTACADOS');
  lines.push('');

  for (const it of highlights) {
    const pts = it.score ?? 0;
    const com = it.descendants ?? 0;
    lines.push(`**${it.title}**`);
    lines.push(`🔥 ${pts} pts · ${com} comentarios`);
    lines.push(defaultBlurb(it.title));
    lines.push(`📎 ${storyUrl(it)}`);
    lines.push(`💬 ${hnLink(it.id)}`);
    lines.push('');
  }

  for (const cat of CATEGORY_ORDER) {
    const lst = grouped.get(cat);
    if (!lst || !lst.length) continue;
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push(cat);
    lines.push('');
    for (const it of lst.slice(0, maxPerCategory)) {
      const pts = it.score ?? 0;
      const com = it.descendants ?? 0;
      lines.push(`- **${it.title}** (${pts} pts) · ${com} com`);
      lines.push(`  📎 ${storyUrl(it)}`);
      lines.push(`  💬 ${hnLink(it.id)}`);
    }
    lines.push('');
  }

  if (showHn.length) {
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('🎨 SHOW HN (max 3)');
    lines.push('');
    for (const it of showHn) {
      const pts = it.score ?? 0;
      const com = it.descendants ?? 0;
      lines.push(`**${it.title}**`);
      lines.push(`${pts} pts · ${com} comentarios`);
      lines.push(`📎 ${storyUrl(it)}`);
      lines.push(`💬 ${hnLink(it.id)}`);
      lines.push('');
    }
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('🐙 Nimbus · Sin Apple, sin coches, puro tech');

  // Avoid trailing whitespace / too many blank lines
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function toDateLabel({ tz = 'Europe/Madrid', now = new Date() } = {}) {
  // Use ISO date in the requested timezone.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return fmt.format(now);
}

export function selectHighlights(stories, { count = 5 } = {}) {
  return [...stories].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, count);
}

export function dropShowFromMain(stories) {
  return stories.filter(it => !isShowHN(it?.title ?? ''));
}
