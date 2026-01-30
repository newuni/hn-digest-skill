import { promises as fs } from 'node:fs';
import path from 'node:path';

export const DEFAULT_CACHE_DAYS = 7;

export function pruneCacheEntries(entries, { nowMs = Date.now(), maxAgeDays = DEFAULT_CACHE_DAYS } = {}) {
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const cutoff = nowMs - maxAgeMs;
  const out = {};
  for (const [id, ts] of Object.entries(entries || {})) {
    const n = Number(ts);
    if (!Number.isFinite(n)) continue;
    if (n >= cutoff) out[id] = n;
  }
  return out;
}

export async function loadCache(filePath, { nowMs = Date.now(), maxAgeDays = DEFAULT_CACHE_DAYS } = {}) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const entries = pruneCacheEntries(parsed?.seen || {}, { nowMs, maxAgeDays });
    return { seen: entries };
  } catch {
    return { seen: {} };
  }
}

export async function saveCache(filePath, cache) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const body = JSON.stringify({ seen: cache?.seen || {} }, null, 2) + '\n';
  await fs.writeFile(filePath, body, 'utf8');
}

export function isSeen(cache, id) {
  return Boolean(cache?.seen?.[String(id)]);
}

export function markSeen(cache, ids, { nowMs = Date.now() } = {}) {
  const out = { seen: { ...(cache?.seen || {}) } };
  for (const id of ids) out.seen[String(id)] = nowMs;
  return out;
}

export function filterUnseen(stories, cache) {
  return stories.filter(it => it && !isSeen(cache, it.id));
}
