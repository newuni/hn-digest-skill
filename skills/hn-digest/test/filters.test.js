import test from 'node:test';
import assert from 'node:assert/strict';
import { isShowHN, isExcludedByTitle, passesScore, filterStories, pickShowHN } from '../src/filters.js';

test('isShowHN detects Show HN prefix', () => {
  assert.equal(isShowHN('Show HN: Foo'), true);
  assert.equal(isShowHN('show hn: Foo'), true);
  assert.equal(isShowHN('Ask HN: Foo'), false);
});

test('isExcludedByTitle excludes apple/mac and cars/ev', () => {
  assert.equal(isExcludedByTitle('Apple releases something'), true);
  assert.equal(isExcludedByTitle('My Mac setup'), true);
  assert.equal(isExcludedByTitle('New EV battery breakthrough'), true);
  assert.equal(isExcludedByTitle('Cars are great'), true);
  assert.equal(isExcludedByTitle('Rust releases 1.0'), false);
});

test('passesScore enforces min points except Show HN', () => {
  assert.equal(passesScore({ title: 'Foo', score: 79 }, { minPoints: 80 }), false);
  assert.equal(passesScore({ title: 'Foo', score: 80 }, { minPoints: 80 }), true);
  assert.equal(passesScore({ title: 'Show HN: Foo', score: 1 }, { minPoints: 80 }), true);
});

test('filterStories keeps stories that pass rules', () => {
  const stories = [
    { type: 'story', title: 'Rust', score: 90 },
    { type: 'story', title: 'Apple', score: 100 },
    { type: 'story', title: 'Low score', score: 10 },
    { type: 'comment', title: 'nope', score: 999 },
    { type: 'story', title: 'Show HN: Cool', score: 1 }
  ];
  const kept = filterStories(stories, { minPoints: 80 });
  assert.deepEqual(kept.map(s => s.title), ['Rust', 'Show HN: Cool']);
});

test('pickShowHN returns top show hn by score and max', () => {
  const stories = [
    { type: 'story', title: 'Show HN: A', score: 2 },
    { type: 'story', title: 'Show HN: B', score: 10 },
    { type: 'story', title: 'Show HN: C', score: 5 },
    { type: 'story', title: 'Show HN: D', score: 100 }
  ];
  const sel = pickShowHN(stories, { max: 2 });
  assert.deepEqual(sel.map(s => s.title), ['Show HN: D', 'Show HN: B']);
});
