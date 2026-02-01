import test from 'node:test';
import assert from 'node:assert/strict';

import { selectFromQueue, refreshPendingQueue } from '../src/select.js';

function makeFetch(itemsById, lists) {
  return async (url) => {
    // very small fetch shim
    if (url.endsWith('/v0/topstories.json')) {
      return {
        ok: true,
        json: async () => lists.topstories
      };
    }
    if (url.endsWith('/v0/beststories.json')) {
      return { ok: true, json: async () => lists.beststories };
    }
    const m = url.match(/\/v0\/item\/(\d+)\.json$/);
    if (m) {
      const id = Number(m[1]);
      return {
        ok: true,
        json: async () => itemsById[id] ?? null
      };
    }
    return { ok: false, status: 404, statusText: 'not found', json: async () => ({}) };
  };
}

const story = (id, title, score = 100, url = `https://e.com/${id}`) => ({
  id,
  type: 'story',
  title,
  score,
  url,
  descendants: 1
});

test('selectFromQueue paginates deterministically across runs (no repeats)', async () => {
  const lists = { topstories: [1, 2, 3, 4, 5, 6, 7, 8], beststories: [] };
  const items = {
    1: story(1, 'A', 100),
    2: story(2, 'B', 100),
    3: story(3, 'C', 100),
    4: story(4, 'D', 100),
    5: story(5, 'E', 100),
    6: story(6, 'F', 100)
  };

  const fetchImpl = makeFetch(items, lists);
  let cache = { seen: {}, pending: {} };

  const r1 = await selectFromQueue({ list: 'topstories', cache, top: 3, topFetch: 8, minPoints: 80, showMax: 0, fetchImpl, nowMs: 1000 });
  assert.deepEqual(r1.main.map(x => x.id), [1, 2, 3]);

  const r2 = await selectFromQueue({ list: 'topstories', cache: r1.cache, top: 3, topFetch: 8, minPoints: 80, showMax: 0, fetchImpl, nowMs: 2000 });
  assert.deepEqual(r2.main.map(x => x.id), [4, 5, 6]);

  // Ensure no overlap
  const s1 = new Set(r1.main.map(x => x.id));
  const overlap = r2.main.filter(x => s1.has(x.id)).map(x => x.id);
  assert.deepEqual(overlap, []);
});

test('selectFromQueue consumes skipped ids (low score/excluded) so next run advances', async () => {
  const lists = { topstories: [1, 2, 3, 4, 5], beststories: [] };
  const items = {
    1: story(1, 'Low score', 10),
    2: story(2, 'Apple thing', 999),
    3: story(3, 'OK', 100),
    4: story(4, 'OK2', 100)
  };

  const fetchImpl = makeFetch(items, lists);
  let cache = { seen: {}, pending: {} };

  const r1 = await selectFromQueue({ list: 'topstories', cache, top: 1, topFetch: 5, minPoints: 80, showMax: 0, fetchImpl, nowMs: 1000 });
  assert.deepEqual(r1.main.map(x => x.id), [3]);

  const r2 = await selectFromQueue({ list: 'topstories', cache: r1.cache, top: 1, topFetch: 5, minPoints: 80, showMax: 0, fetchImpl, nowMs: 2000 });
  assert.deepEqual(r2.main.map(x => x.id), [4]);
});

test('refreshPendingQueue appends new ids without reordering existing pending', async () => {
  const lists = { topstories: [10, 11, 12, 13], beststories: [] };
  const items = {
    10: story(10, 'A', 100),
    11: story(11, 'B', 100)
  };

  const fetchImpl = makeFetch(items, lists);
  let cache = { seen: {}, pending: { topstories: { ids: [1, 2, 3], fetchedAtMs: 0 } } };

  const { pending } = await refreshPendingQueue({ list: 'topstories', topFetch: 4, cache, nowMs: 999999, maxQueueAgeMs: 1, fetchImpl });
  assert.deepEqual(pending.ids.slice(0, 3), [1, 2, 3]);
  // new ids appended
  assert.deepEqual(pending.ids.slice(3), [10, 11, 12, 13]);
});

test('selectFromQueue fills show hn separately and marks seen', async () => {
  const lists = { topstories: [1, 2, 3, 4], beststories: [] };
  const items = {
    1: story(1, 'Show HN: X', 1),
    2: story(2, 'OK', 100),
    3: story(3, 'Show HN: Y', 1),
    4: story(4, 'OK2', 100)
  };

  const fetchImpl = makeFetch(items, lists);
  let cache = { seen: {}, pending: {} };

  const r1 = await selectFromQueue({ list: 'topstories', cache, top: 1, topFetch: 4, minPoints: 80, showMax: 2, fetchImpl, nowMs: 1234 });
  assert.deepEqual(r1.main.map(x => x.id), [2]);
  assert.deepEqual(r1.show.map(x => x.id), [1, 3]);

  // all returned marked seen
  assert.ok(r1.cache.seen['1']);
  assert.ok(r1.cache.seen['2']);
  assert.ok(r1.cache.seen['3']);
});
