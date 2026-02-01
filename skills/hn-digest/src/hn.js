/**
 * Hacker News API helpers
 * Using native fetch (Node >= 18).
 */

export const HN_BASE = 'https://hacker-news.firebaseio.com/v0';

export async function getJson(url, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'clawdbot-hn-digest' }
    });
    if (!res.ok) throw new Error(`HN fetch failed: ${res.status} ${res.statusText} (${url})`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchTopStoryIds({ top = 30, list = 'topstories', baseUrl = HN_BASE, ...rest } = {}) {
  const ids = await getJson(`${baseUrl}/${list}.json`, rest);
  if (!Array.isArray(ids)) throw new Error(`HN ${list} did not return an array`);
  return ids.slice(0, top);
}

export async function fetchItem(id, { baseUrl = HN_BASE, ...rest } = {}) {
  return getJson(`${baseUrl}/item/${id}.json`, rest);
}

export async function fetchTopStories({ top = 30, concurrency = 10, ...rest } = {}) {
  const ids = await fetchTopStoryIds({ top, ...rest });

  const out = [];
  let idx = 0;

  async function worker() {
    while (idx < ids.length) {
      const i = idx++;
      const id = ids[i];
      try {
        const it = await fetchItem(id, rest);
        if (it && it.type === 'story') out.push(it);
      } catch {
        // best-effort: ignore single item failures
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, ids.length)) }, () => worker());
  await Promise.all(workers);

  // preserve deterministic order as much as possible: sort by original id order
  const pos = new Map(ids.map((id, i) => [id, i]));
  out.sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
  return out;
}
