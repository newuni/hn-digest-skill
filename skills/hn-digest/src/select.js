import { fetchTopStoryIds, fetchItem } from './hn.js';
import { filterStories, isShowHN, isExcluded } from './filters.js';
import { getPending, setPending, isSeen, markSeen } from './cache.js';

function uniqAppend(existing, incoming) {
  const seen = new Set(existing.map(Number));
  const out = [...existing];
  for (const id of incoming) {
    const n = Number(id);
    if (!Number.isFinite(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export async function refreshPendingQueue({
  list = 'topstories',
  topFetch = 200,
  cache,
  nowMs = Date.now(),
  maxQueueAgeMs = 60 * 60 * 1000,
  fetchImpl
} = {}) {
  const pending = getPending(cache, list);
  const tooOld = !pending.fetchedAtMs || (nowMs - pending.fetchedAtMs) > maxQueueAgeMs;

  // Only refresh when queue is old or small; otherwise keep deterministic pagination.
  if (!tooOld && pending.ids.length >= Math.min(50, topFetch)) {
    return { cache, pending };
  }

  const ids = await fetchTopStoryIds({ top: topFetch, list, fetchImpl });

  // We do NOT reorder existing pending (so "next" stays stable). We append new ids.
  const fresh = ids.filter(id => !isSeen(cache, id));
  const merged = uniqAppend(pending.ids, fresh);

  const updatedPending = { ids: merged, fetchedAtMs: nowMs };
  const nextCache = setPending(cache, list, updatedPending);

  return { cache: nextCache, pending: updatedPending };
}

export async function selectFromQueue({
  list = 'topstories',
  cache,
  top = 30,
  topFetch = 200,
  minPoints = 80,
  showMax = 3,
  nowMs = Date.now(),
  fetchImpl,
  itemConcurrency = 12,
  maxScanIds = 600
} = {}) {
  // Ensure we have a queue
  let { cache: c } = await refreshPendingQueue({ list, topFetch, cache, nowMs, fetchImpl });
  let pending = getPending(c, list);

  const main = [];
  const show = [];
  const scanned = [];

  const wantMore = () => (main.length < top) || (show.length < showMax);

  // Scan/paginate through the queue in order, consuming ids deterministically.
  while (wantMore() && pending.ids.length && scanned.length < maxScanIds) {
    const batchIds = pending.ids.splice(0, 40);
    scanned.push(...batchIds);

    // Fetch items concurrently
    let idx = 0;
    const items = [];

    async function worker() {
      while (idx < batchIds.length) {
        const i = idx++;
        const id = batchIds[i];
        try {
          const it = await fetchItem(id, { fetchImpl });
          items[i] = it;
        } catch {
          items[i] = null;
        }
      }
    }

    const n = Math.max(1, Math.min(itemConcurrency, batchIds.length));
    await Promise.all(Array.from({ length: n }, () => worker()));

    // Process in the same order as ids
    for (let i = 0; i < batchIds.length; i++) {
      const id = batchIds[i];
      const it = items[i];

      if (!it || it.type !== 'story') continue;
      if (isSeen(c, id)) continue;

      const title = it.title ?? '';
      const url = it.url ?? '';

      // Hard exclusions first
      if (isExcluded(it)) continue;

      if (isShowHN(title)) {
        if (show.length < showMax) show.push(it);
        continue;
      }

      // Apply min score (Show HN already handled)
      const kept = filterStories([it], { minPoints });
      if (!kept.length) continue;

      if (main.length < top) main.push(it);
    }

    // Persist the consumed queue progress
    c = setPending(c, list, { ids: pending.ids, fetchedAtMs: pending.fetchedAtMs });

    // If queue is running low and we still need more, refresh (append new ids)
    if (wantMore() && pending.ids.length < 30) {
      const refreshed = await refreshPendingQueue({ list, topFetch, cache: c, nowMs, fetchImpl });
      c = refreshed.cache;
      pending = getPending(c, list);
    }
  }

  // Mark returned items as seen
  const returnedIds = new Set([...main.map(s => s.id), ...show.map(s => s.id)].filter(Boolean));
  c = markSeen(c, [...returnedIds], { nowMs });

  return { main, show, cache: c, scannedIds: scanned };
}
