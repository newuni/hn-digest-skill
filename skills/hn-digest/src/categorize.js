const CATS = [
  '🤖 IA / LLMs',
  '💻 DESARROLLO',
  '🔒 SEGURIDAD / PRIVACIDAD',
  '🚀 STARTUPS / PRODUCTO',
  '🧩 HARDWARE',
  '🔬 CIENCIA',
  '🗂️ OTROS'
];

export function categoryFor(item) {
  const t = `${item?.title ?? ''} ${item?.url ?? ''}`.toLowerCase();

  if (/(\bai\b|\bml\b|llm|gpt|transformer|diffusion|neural|\brag\b|deepseek|claude)/.test(t)) return CATS[0];
  if (/(security|vulnerability|\bvuln\b|\bcve\b|privacy|tls|crypto|encryption|malware|exploit|auth|pentest)/.test(t)) return CATS[2];
  if (/(\brust\b|\bgo\b|golang|python|javascript|typescript|compiler|database|postgres|\bsql\b|linux|kernel|open\s*source|\boss\b|github|performance|benchmark|api|sqlite)/.test(t)) return CATS[1];
  if (/(startup|\bvc\b|funding|founder|business|saas|pricing|\byc\b)/.test(t)) return CATS[3];
  if (/(hardware|chip|\bgpu\b|\bcpu\b|fpga|embedded|robot|electronics)/.test(t)) return CATS[4];
  if (/(science|research|paper|physics|biology|chemistry|space)/.test(t)) return CATS[5];

  return CATS[6];
}

export function groupByCategory(stories) {
  const m = new Map();
  for (const it of stories) {
    const c = categoryFor(it);
    if (!m.has(c)) m.set(c, []);
    m.get(c).push(it);
  }
  for (const [c, lst] of m.entries()) {
    lst.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    m.set(c, lst);
  }
  return m;
}

export const CATEGORY_ORDER = CATS;
