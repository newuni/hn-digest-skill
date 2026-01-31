import test from 'node:test';
import assert from 'node:assert/strict';
import { pruneCacheEntries, filterUnseen, markSeen, isSeen } from '../src/cache.js';

test('pruneCacheEntries drops old entries and invalid timestamps', () => {
  const nowMs = Date.parse('2026-01-30T00:00:00Z');
  const eightDaysAgo = nowMs - 8 * 24 * 60 * 60 * 1000;
  const twoDaysAgo = nowMs - 2 * 24 * 60 * 60 * 1000;
  const pruned = pruneCacheEntries({
    '1': twoDaysAgo,
    '2': eightDaysAgo,
    '3': 'not-a-number'
  }, { nowMs, maxAgeDays: 7 });
  assert.deepEqual(Object.keys(pruned), ['1']);
});

test('markSeen + filterUnseen', () => {
  const cache = markSeen({ seen: {} }, [1, 2], { nowMs: 123 });
  assert.equal(isSeen(cache, 1), true);
  assert.equal(isSeen(cache, 3), false);

  const stories = [{ id: 1 }, { id: 3 }];
  const unseen = filterUnseen(stories, cache);
  assert.deepEqual(unseen.map(s => s.id), [3]);
});
