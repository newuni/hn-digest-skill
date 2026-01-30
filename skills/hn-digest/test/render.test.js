import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDigest, hnLink, storyUrl, toDateLabel, selectHighlights } from '../src/render.js';

const sample = (id, title, score = 100, descendants = 10, url = 'https://example.com') => ({
  id,
  title,
  score,
  descendants,
  url
});

test('hnLink formats HN discussion link', () => {
  assert.equal(hnLink(123), 'https://news.ycombinator.com/item?id=123');
});

test('storyUrl falls back to HN link when url missing', () => {
  assert.equal(storyUrl({ id: 1, url: null }), 'https://news.ycombinator.com/item?id=1');
});

test('toDateLabel returns YYYY-MM-DD', () => {
  const d = new Date('2026-01-30T12:00:00Z');
  const s = toDateLabel({ tz: 'UTC', now: d });
  assert.match(s, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(s, '2026-01-30');
});

test('selectHighlights sorts by score desc', () => {
  const h = selectHighlights([sample(1, 'a', 1), sample(2, 'b', 10)], { count: 1 });
  assert.equal(h[0].id, 2);
});

test('renderDigest produces expected sections', () => {
  const highlights = [sample(1, 'Top story', 500, 200)];
  const grouped = new Map([['💻 DESARROLLO', [sample(2, 'Dev story', 100, 20)]]]);
  const showHn = [sample(3, 'Show HN: Thing', 5, 1)];

  const md = renderDigest({ dateLabel: '2026-01-30', highlights, grouped, showHn });
  assert.match(md, /🍊 HN DIGEST — 2026-01-30/);
  assert.match(md, /⭐ DESTACADOS/);
  assert.match(md, /💻 DESARROLLO/);
  assert.match(md, /🎨 SHOW HN/);
  assert.match(md, /Nimbus/);
});
