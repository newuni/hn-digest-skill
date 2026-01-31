#!/usr/bin/env node
import { fetchTopStories } from '../src/hn.js';
import { filterStories, pickShowHN } from '../src/filters.js';
import { groupByCategory } from '../src/categorize.js';
import { dropShowFromMain, renderDigest, selectHighlights, toDateLabel } from '../src/render.js';

function parseArgs(argv) {
  const out = {
    top: 30,
    topFetch: 100,
    minPoints: 80,
    tz: 'Europe/Madrid',
    maxPerCategory: 5,
    highlights: 5,
    cacheDays: 7,
    cachePath: null
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--top') out.top = Number(next());
    else if (a === '--topFetch') out.topFetch = Number(next());
    else if (a === '--minPoints') out.minPoints = Number(next());
    else if (a === '--tz') out.tz = next();
    else if (a === '--maxPerCategory') out.maxPerCategory = Number(next());
    else if (a === '--highlights') out.highlights = Number(next());
    else if (a === '--cacheDays') out.cacheDays = Number(next());
    else if (a === '--cachePath') out.cachePath = next();
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: hn_digest [--top N] [--topFetch N] [--minPoints N] [--tz TZ] [--maxPerCategory N] [--highlights N] [--cacheDays N] [--cachePath PATH]`);
      process.exit(0);
    }
  }
  return out;
}

const opts = parseArgs(process.argv);

// Cache: avoid repeating items within the last week (local file, no infra)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCache, saveCache, filterUnseen, markSeen, pruneCacheEntries } from '../src/cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cachePath = opts.cachePath || path.join(__dirname, '..', '.cache', 'seen.json');
const cacheDays = Number.isFinite(opts.cacheDays) ? opts.cacheDays : 7;

// Fetch more than we render, so second run can still find fresh items
const fetchTop = Math.max(opts.top, opts.topFetch || 100);

const stories = await fetchTopStories({ top: fetchTop });
let cache = await loadCache(cachePath, { maxAgeDays: cacheDays });
cache = { seen: pruneCacheEntries(cache.seen, { maxAgeDays: cacheDays }) };

// Filter main stories (score + exclusions), then drop seen
const keptAll = filterStories(stories, { minPoints: opts.minPoints });
const keptFresh = filterUnseen(keptAll, cache);

// Show HN selection: from all stories, but also drop seen
const showAll = pickShowHN(stories, { max: 50 }); // pick candidates, then trim
const showFresh = filterUnseen(showAll, cache).slice(0, 3);

const main = dropShowFromMain(keptFresh).slice(0, opts.top);

const highlights = selectHighlights(main, { count: opts.highlights });
const grouped = groupByCategory(main);

const md = renderDigest({
  dateLabel: toDateLabel({ tz: opts.tz }),
  highlights,
  grouped,
  showHn: showFresh,
  maxPerCategory: opts.maxPerCategory
});

// Mark all returned items as seen
const returnedIds = new Set([
  ...main.map(s => s.id),
  ...showFresh.map(s => s.id)
]);
cache = markSeen(cache, [...returnedIds]);
await saveCache(cachePath, cache);

process.stdout.write(md);
