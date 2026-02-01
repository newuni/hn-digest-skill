import { promises as fs } from 'node:fs';
import path from 'node:path';

// Cache goals:
// - Avoid repeating between executions (seen TTL)
// - Provide deterministic pagination: keep a pending queue of story ids to scan next

export const DEFAULT_SEEN_TTL_HOURS = 24;

export function pruneSeenEntries(entries, { nowMs = Date.now(), ttlHours = DEFAULT_SEEN_TTL_HOURS } = {}) {
  const ttlMs = ttlHours * 60 * 60 * 1000;
  const cutoff = nowMs - ttlMs;
  const out = {};
  for (const [id, ts] of Object.entries(entries || {})) {
    const n = Number(ts);
    if (!Number.isFinite(n)) continue;
    if (n >= cutoff) out[id] = n;
  }
  return out;
}

export function normalizeCacheShape(parsed, { nowMs = Date.now(), ttlHours = DEFAULT_SEEN_TTL_HOURS } = {}) {
  const seen = pruneSeenEntries(parsed?.seen || {}, { nowMs, ttlHours });
  const pending = parsed?.pending && typeof parsed.pending === 'object' ? parsed.pending : {};

  // pending: { [listName]: { ids: number[], fetchedAtMs: number } }
  const normPending = {};
  for (const [k, v] of Object.entries(pending)) {
    const ids = Array.isArray(v?.ids) ? v.ids.map(Number).filter(Number.isFinite) : [];
    const fetchedAtMs = Number(v?.fetchedAtMs);
    normPending[k] = {
      ids,
      fetchedAtMs: Number.isFinite(fetchedAtMs) ? fetchedAtMs : nowMs
    };
  }

  return { seen, pending: normPending };
}

export async function loadCache(filePath, { nowMs = Date.now(), ttlHours = DEFAULT_SEEN_TTL_HOURS } = {}) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeCacheShape(parsed, { nowMs, ttlHours });
  } catch {
    return { seen: {}, pending: {} };
  }
}

export async function saveCache(filePath, cache) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const body = JSON.stringify(
    {
      seen: cache?.seen || {},
      pending: cache?.pending || {}
    },
    null,
    2
  ) + '\n';
  await fs.writeFile(filePath, body, 'utf8');
}

export function isSeen(cache, id) {
  return Boolean(cache?.seen?.[String(id)]);
}

export function markSeen(cache, ids, { nowMs = Date.now() } = {}) {
  const out = {
    seen: { ...(cache?.seen || {}) },
    pending: { ...(cache?.pending || {}) }
  };
  for (const id of ids) out.seen[String(id)] = nowMs;
  return out;
}

export function getPending(cache, listName) {
  const p = cache?.pending?.[listName];
  if (!p) return { ids: [], fetchedAtMs: 0 };
  return {
    ids: Array.isArray(p.ids) ? p.ids.map(Number).filter(Number.isFinite) : [],
    fetchedAtMs: Number(p.fetchedAtMs) || 0
  };
}

export function setPending(cache, listName, pending) {
  const out = {
    seen: { ...(cache?.seen || {}) },
    pending: { ...(cache?.pending || {}) }
  };
  out.pending[listName] = {
    ids: Array.isArray(pending?.ids) ? pending.ids.map(Number).filter(Number.isFinite) : [],
    fetchedAtMs: Number(pending?.fetchedAtMs) || Date.now()
  };
  return out;
}
