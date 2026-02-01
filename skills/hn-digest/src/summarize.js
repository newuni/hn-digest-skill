import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function oneSentence(text = '') {
  const s = String(text).replace(/\s+/g, ' ').trim();
  if (!s) return '';
  const m = s.match(/^(.{20,}?)([.!?])\s/);
  if (m) return (m[1] + m[2]).trim();
  return s.slice(0, 220).trim();
}

/**
 * Best-effort summary via summarize.sh CLI.
 * Returns '' on any failure/timeout.
 */
export async function summarizeUrl(url, {
  enabled = true,
  language = 'es',
  length = 'short',
  model = 'cli/codex/gpt-5.2',
  timeoutMs = 25000
} = {}) {
  if (!enabled || !url) return '';

  try {
    const { stdout } = await execFileAsync(
      'summarize',
      [
        url,
        '--length',
        String(length),
        '--language',
        String(language),
        '--model',
        String(model),
        '--plain',
        '--stream',
        'off',
        '--metrics',
        'off'
      ],
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 }
    );

    const lines = String(stdout)
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (!lines.length) return '';

    const candidates = lines.slice(0, 12).filter(l => !/^https?:\/\//i.test(l));
    const pickFrom = candidates.length ? candidates : lines.slice(0, 12);
    const best = pickFrom.reduce((a, b) => (b.length > a.length ? b : a), pickFrom[0]);
    return oneSentence(best);
  } catch {
    return '';
  }
}

export async function summarizeMany(items, {
  concurrency = 4,
  ...cfg
} = {}) {
  const arr = [...items];
  let idx = 0;

  async function worker() {
    while (idx < arr.length) {
      const i = idx++;
      const it = arr[i];
      if (!it || !it.url) {
        it._summary = '';
        continue;
      }
      it._summary = await summarizeUrl(it.url, cfg);
    }
  }

  const n = Math.max(1, Math.min(concurrency, arr.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return arr;
}
