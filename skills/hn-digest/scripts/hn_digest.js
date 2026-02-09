#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { groupByCategory } from '../src/categorize.js';
import { renderDigest, selectHighlights, toDateLabel } from '../src/render.js';
import { loadCache, saveCache } from '../src/cache.js';
import { selectFromQueue } from '../src/select.js';
import { summarizeMany } from '../src/summarize.js';

function parseArgs(argv) {
  const out = {
    list: 'topstories',
    top: 30,
    topFetch: 250,
    minPoints: 80,
    tz: 'Europe/Madrid',
    maxPerCategory: 5,
    highlights: 5,

    // Seen TTL controls the "no repeats" window across digests.
    // Default: 14 days.
    seenTtlHours: 24 * 14,

    // Per-item summaries via summarize.sh CLI (best-effort)
    summarize: true,
    summarizeLanguage: 'es',
    summarizeLength: 'short',
    summarizeModel: 'cli/codex/gpt-5.2',
    summarizeTimeoutMs: 20000,
    summarizeConcurrency: 4,

    cachePath: null
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];

    if (a === '--list') out.list = next();
    else if (a === '--top') out.top = Number(next());
    else if (a === '--topFetch') out.topFetch = Number(next());
    else if (a === '--minPoints') out.minPoints = Number(next());
    else if (a === '--tz') out.tz = next();
    else if (a === '--maxPerCategory') out.maxPerCategory = Number(next());
    else if (a === '--highlights') out.highlights = Number(next());

    else if (a === '--seenTtlHours') out.seenTtlHours = Number(next());

    else if (a === '--summarize') out.summarize = true;
    else if (a === '--no-summarize') out.summarize = false;
    else if (a === '--summarizeLanguage') out.summarizeLanguage = next();
    else if (a === '--summarizeLength') out.summarizeLength = next();
    else if (a === '--summarizeModel') out.summarizeModel = next();
    else if (a === '--summarizeTimeoutMs') out.summarizeTimeoutMs = Number(next());
    else if (a === '--summarizeConcurrency') out.summarizeConcurrency = Number(next());

    else if (a === '--cachePath') out.cachePath = next();

    else if (a === '--help' || a === '-h') {
      console.log(
        `Usage: hn_digest ` +
          `[--list topstories|beststories|newstories] ` +
          `[--top N] [--topFetch N] [--minPoints N] [--tz TZ] ` +
          `[--maxPerCategory N] [--highlights N] [--seenTtlHours H] [--cachePath PATH] ` +
          `[--summarize|--no-summarize] [--summarizeLanguage es] [--summarizeLength short] [--summarizeModel MODEL] ` +
          `[--summarizeTimeoutMs 20000] [--summarizeConcurrency 4]`
      );
      process.exit(0);
    }
  }

  return out;
}

const opts = parseArgs(process.argv);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cachePath = opts.cachePath || path.join(__dirname, '..', '.cache', 'seen.json');

let cache = await loadCache(cachePath, { ttlHours: opts.seenTtlHours });

// Deterministic pagination over a pending queue stored in cache.
const { main, show, cache: nextCache } = await selectFromQueue({
  list: opts.list,
  cache,
  top: opts.top,
  topFetch: opts.topFetch,
  minPoints: opts.minPoints,
  showMax: 3
});

cache = nextCache;

// Per-item summaries (best-effort). We attach `_summary` to each item.
await summarizeMany([...main, ...show], {
  enabled: opts.summarize,
  language: opts.summarizeLanguage,
  length: opts.summarizeLength,
  model: opts.summarizeModel,
  timeoutMs: opts.summarizeTimeoutMs,
  concurrency: opts.summarizeConcurrency
});

const highlights = selectHighlights(main, { count: opts.highlights });

// Avoid duplicates inside the same digest: highlights are printed first,
// so group the *rest* for category sections.
const highlightIds = new Set(highlights.map(s => s.id));
const rest = main.filter(s => !highlightIds.has(s.id));
const grouped = groupByCategory(rest);

const md = renderDigest({
  dateLabel: toDateLabel({ tz: opts.tz }),
  highlights,
  grouped,
  showHn: show,
  maxPerCategory: opts.maxPerCategory
});

await saveCache(cachePath, cache);
process.stdout.write(md);
