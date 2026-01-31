import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryFor, groupByCategory, CATEGORY_ORDER } from '../src/categorize.js';

test('categoryFor basic classification', () => {
  assert.equal(categoryFor({ title: 'New LLM trick', url: '' }), '🤖 IA / LLMs');
  assert.equal(categoryFor({ title: 'Rust performance benchmark', url: '' }), '💻 DESARROLLO');
  assert.equal(categoryFor({ title: 'CVE-2026-1234', url: '' }), '🔒 SEGURIDAD / PRIVACIDAD');
  assert.equal(categoryFor({ title: 'Series A funding for startup', url: '' }), '🚀 STARTUPS / PRODUCTO');
  assert.equal(categoryFor({ title: 'New GPU architecture', url: '' }), '🧩 HARDWARE');
  assert.equal(categoryFor({ title: 'Physics paper', url: '' }), '🔬 CIENCIA');
});

test('groupByCategory sorts by score desc', () => {
  const a = { title: 'Rust', score: 1 };
  const b = { title: 'Rust benchmark', score: 10 };
  const m = groupByCategory([a, b]);
  const lst = m.get('💻 DESARROLLO');
  assert.deepEqual(lst.map(x => x.score), [10, 1]);
});

test('CATEGORY_ORDER is stable', () => {
  assert.ok(Array.isArray(CATEGORY_ORDER));
  assert.ok(CATEGORY_ORDER.includes('🗂️ OTROS'));
});
