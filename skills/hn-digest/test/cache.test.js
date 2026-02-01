import test from 'node:test';
import assert from 'node:assert/strict';
import { pruneSeenEntries, markSeen, isSeen } from '../src/cache.js';

const filterUnseen = (stories, cache) => stories.filter(it => it && !isSeen(cache, it.id));

test('pruneSeenEntries drops old entries and invalid timestamps (ttlHours)', () => {
  const nowMs = Date.parse('2026-01-30T00:00:00Z');
  const twoHoursAgo = nowMs - 2 * 60 * 60 * 1000;
  const thirtyHoursAgo = nowMs - 30 * 60 * 60 * 1000;

  const pruned = pruneSeenEntries(
    {
      '1': twoHoursAgo,
      '2': thirtyHoursAgo,
      '3': 'not-a-number'
    },
    { nowMs, ttlHours: 24 }
  );
  assert.deepEqual(Object.keys(pruned), ['1']);
});

test('markSeen + filterUnseen', () => {
  const cache = markSeen({ seen: {}, pending: {} }, [1, 2], { nowMs: 123 });
  assert.equal(isSeen(cache, 1), true);
  assert.equal(isSeen(cache, 3), false);

  const stories = [{ id: 1 }, { id: 3 }];
  const unseen = filterUnseen(stories, cache);
  assert.deepEqual(unseen.map(s => s.id), [3]);
});
