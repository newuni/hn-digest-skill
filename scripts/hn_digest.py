#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from urllib.request import urlopen

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover
    yaml = None

DEFAULT_CONFIG_PATH = os.environ.get(
    "HN_DIGEST_CONFIG", "/root/clawd/skills/hn-digest/config.yaml"
)


def deep_merge(a: dict, b: dict) -> dict:
    """Return new dict = a merged with b (b wins)."""
    out = dict(a or {})
    for k, v in (b or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def load_yaml(path: str) -> dict:
    if not path:
        return {}
    if not os.path.exists(path):
        return {}
    if yaml is None:
        raise RuntimeError("PyYAML not installed; install pyyaml or disable YAML config")
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def get_json(url: str):
    # Keep timeouts short: this runs in cron and we prefer partial output over hanging.
    with urlopen(url, timeout=8) as f:
        return json.load(f)


def fetch_item(sid: int):
    try:
        return get_json(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
    except Exception:
        return None


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def hn_url(item_id: int) -> str:
    return f"https://news.ycombinator.com/item?id={item_id}"


def now_ts() -> int:
    return int(time.time())


def load_cache(path: str) -> dict:
    if not path:
        return {"seen": {}}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return {"seen": {}}
            data.setdefault("seen", {})
            return data
    except FileNotFoundError:
        return {"seen": {}}
    except Exception:
        return {"seen": {}}


def save_cache(path: str, data: dict):
    if not path:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def purge_seen(seen: dict, ttl_seconds: int):
    if not ttl_seconds or ttl_seconds <= 0:
        return seen
    cutoff = now_ts() - ttl_seconds
    return {k: v for k, v in seen.items() if isinstance(v, int) and v >= cutoff}


def one_sentence(text: str) -> str:
    s = re.sub(r"\s+", " ", (text or "").strip())
    s = re.sub(r"^#+\s+", "", s)
    s = re.sub(r"^[-*]\s+", "", s)
    m = re.search(r"^(.{20,}?)([.!?])\s", s)
    if m:
        return (m.group(1) + m.group(2)).strip()
    return s[:220].strip()


def summarize_url(url: str, cfg: dict) -> str:
    if not url:
        return ""
    scfg = cfg.get("summarize", {})
    if not scfg.get("enabled", True):
        return ""

    cmd = [
        "summarize",
        url,
        "--length",
        str(scfg.get("length", "short")),
        "--language",
        str(scfg.get("language", "es")),
        "--model",
        str(scfg.get("model", "cli/codex/gpt-5.2")),
    ]

    try:
        out = subprocess.check_output(
            cmd,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=int(scfg.get("timeout_seconds", 25)),
        )
    except Exception:
        # timeout / fallo: omitimos resumen
        return ""

    lines = [l.strip() for l in out.splitlines() if l.strip()]
    if not lines:
        return ""

    candidates = [l for l in lines[:12] if not l.lower().startswith("http")]
    if not candidates:
        candidates = lines[:12]
    best = max(candidates, key=len)
    return one_sentence(best)


def build_exclude_re(keywords):
    # keywords list -> regex; keep it simple and case-insensitive
    kws = [re.escape(k.strip()) for k in (keywords or []) if str(k).strip()]
    if not kws:
        return re.compile(r"$^")
    # match as word-ish boundaries when possible
    pat = r"(" + "|".join(kws) + r")"
    return re.compile(pat, re.I)


def is_show(title: str) -> bool:
    return (title or "").lower().startswith("show hn")


def classify(title: str, categories: dict) -> str:
    t = (title or "").lower()
    for cat, keys in (categories or {}).items():
        if any(str(k).lower() in t for k in (keys or [])):
            return str(cat)
    return "OTROS"


def fmt_story(it: dict, cfg: dict) -> str:
    title = it.get("title", "(sin título)")
    pts = it.get("score", 0)
    com = it.get("descendants", 0)
    url = it.get("url")

    parts = [f"**{title}**", f"🔥 {pts} pts · {com} comentarios"]

    if url:
        s = summarize_url(url, cfg)
        if s:
            parts.append(s)

    # no mostrar HN salvo que no exista URL del artículo
    if url:
        parts.append(f"📎 {url}")
    else:
        parts.append(f"💬 {hn_url(it['id'])}")

    return "\n".join(parts)


def main():
    ap = argparse.ArgumentParser(description="HN digest (skill)")
    ap.add_argument("--config", default=DEFAULT_CONFIG_PATH)
    ap.add_argument("--no-summarize", action="store_true")
    ap.add_argument("--reset-seen", action="store_true", help="clear seen cache")
    args = ap.parse_args()

    cfg = load_yaml(args.config)
    # allow a couple of ENV overrides (optional)
    cfg = deep_merge(
        {
            "hn": {"top_n": 30, "fetch_n": 120, "min_score": 80, "show_hn_max": 3},
            "filters": {"exclude_keywords": []},
            "categories": {},
            "output": {"destacados_count": 3, "max_per_category": 2, "max_otros": 2, "separator": "────────────"},
            "summarize": {"enabled": True, "language": "es", "length": "short", "model": "cli/codex/gpt-5.2", "timeout_seconds": 25},
            "cache": {"path": "/root/clawd/skills/hn-digest/cache.json", "seen_ttl_seconds": 259200, "rotate_seen": True},
        },
        cfg,
    )

    if args.no_summarize:
        cfg["summarize"]["enabled"] = False

    hcfg = cfg.get("hn", {})
    ocfg = cfg.get("output", {})
    ccfg = cfg.get("cache", {})

    cache_path = ccfg.get("path")
    cache = load_cache(cache_path)
    if args.reset_seen:
        cache["seen"] = {}

    cache["seen"] = purge_seen(cache.get("seen", {}), int(ccfg.get("seen_ttl_seconds", 0)))
    seen = cache.get("seen", {})

    exclude_re = build_exclude_re(cfg.get("filters", {}).get("exclude_keywords", []))

    hn_list = str(hcfg.get("list", "topstories"))
    top_ids = get_json(f"https://hacker-news.firebaseio.com/v0/{hn_list}.json")
    fetch_n = int(hcfg.get("fetch_n", 300))
    ids = top_ids[:fetch_n]

    # PAGINATION/ROTATION: scan the HN list in order and fill per-section quotas
    show_max = int(hcfg.get("show_hn_max", 3))
    dest_n = int(ocfg.get("destacados_count", 3))
    max_per_cat = int(ocfg.get("max_per_category", 2))
    max_otros = int(ocfg.get("max_otros", 2))

    categories = cfg.get("categories", {})
    buckets = {c: [] for c in list(categories.keys()) + ["OTROS"]}
    shows = []
    non_show_pool = []  # used to compute destacados by score

    def already_seen(it_id: str) -> bool:
        return ccfg.get("rotate_seen", True) and it_id in seen

    top_n = int(hcfg.get("top_n", 30))

    def need_more() -> bool:
        # Hard cap: don't build an unbounded pool.
        if len(non_show_pool) >= top_n:
            return False

        # stop early if we already have enough to render
        cats_full = all(len(buckets.get(c, [])) >= max_per_cat for c in categories.keys()) if categories else True
        otros_full = len(buckets.get("OTROS", [])) >= max_otros
        shows_full = len(shows) >= show_max

        # still scan until we have a decent pool for destacados
        return not (cats_full and otros_full and shows_full and len(non_show_pool) >= (dest_n + 5))

    # Fetch items concurrently (batched) to avoid slow sequential runs
    max_workers = int(os.environ.get("HN_DIGEST_WORKERS", "20"))

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        for batch in chunks(ids, 40):
            items_batch = list(ex.map(fetch_item, batch))
            for it in items_batch:
                if not it or it.get("type") != "story":
                    continue

                it_id = str(it.get("id"))
                title = it.get("title", "") or ""
                url = it.get("url") or ""

                if exclude_re.search(title) or exclude_re.search(url):
                    continue

                score = int(it.get("score", 0) or 0)
                if score < int(hcfg.get("min_score", 80)) and not is_show(title):
                    continue

                if already_seen(it_id):
                    continue

                if is_show(title):
                    if len(shows) < show_max:
                        shows.append(it)
                    continue

                # Non-show
                non_show_pool.append(it)

                cat = classify(title, categories)
                if cat != "OTROS" and len(buckets.get(cat, [])) < max_per_cat:
                    buckets[cat].append(it)
                elif len(buckets.get("OTROS", [])) < max_otros:
                    buckets["OTROS"].append(it)

                if not need_more():
                    break
            if not need_more():
                break

    # If we couldn't fill enough because everything is "seen", relax rotation.
    if len(non_show_pool) < (dest_n + 2) and ccfg.get("rotate_seen", True):
        non_show_pool = []
        buckets = {c: [] for c in list(categories.keys()) + ["OTROS"]}
        shows = []
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            for batch in chunks(ids, 40):
                items_batch = list(ex.map(fetch_item, batch))
                for it in items_batch:
                    if not it or it.get("type") != "story":
                        continue
                    title = it.get("title", "") or ""
                    url = it.get("url") or ""
                    if exclude_re.search(title) or exclude_re.search(url):
                        continue
                    score = int(it.get("score", 0) or 0)
                    if score < int(hcfg.get("min_score", 80)) and not is_show(title):
                        continue
                    if is_show(title):
                        if len(shows) < show_max:
                            shows.append(it)
                        continue
                    non_show_pool.append(it)
                    cat = classify(title, categories)
                    if cat != "OTROS" and len(buckets.get(cat, [])) < max_per_cat:
                        buckets[cat].append(it)
                    elif len(buckets.get("OTROS", [])) < max_otros:
                        buckets["OTROS"].append(it)
                    if not need_more():
                        break
                if not need_more():
                    break

    # Destacados: top by score from the pool (no-show)
    non_show_sorted = sorted(non_show_pool, key=lambda x: int(x.get("score", 0) or 0), reverse=True)
    dest = non_show_sorted[:dest_n]

    dest_ids = {str(it.get("id")) for it in dest if it.get("id")}

    # Remove destacados from buckets to avoid duplicates in sections
    for c in list(categories.keys()) + ["OTROS"]:
        buckets[c] = [it for it in buckets.get(c, []) if str(it.get("id")) not in dest_ids]

    SEP = str(ocfg.get("separator", "────────────"))
    today = datetime.now().strftime("%Y-%m-%d")

    out = []
    out.append(f"🍊 HN DIGEST — {today}")
    out.append(SEP)
    out.append("⭐ DESTACADOS")
    out.append("")

    for it in dest:
        out.append(fmt_story(it, cfg))
        out.append("")

    out.append(SEP)

    for c in categories.keys():
        if not buckets.get(c):
            continue
        icon = "🤖" if "IA" in c else "💻" if "DESARROLLO" in c else "🔒" if "SEGURIDAD" in c else "🧪" if "CIENCIA" in c else "🚀"
        out.append(f"{icon} {c}")
        out.append("")
        for it in buckets[c]:
            out.append(fmt_story(it, cfg))
            out.append("")

    otros = buckets.get("OTROS", [])
    if otros:
        out.append("🗂️ OTROS")
        out.append("")
        for it in otros:
            out.append(fmt_story(it, cfg))
            out.append("")

    out.append(SEP)
    out.append("🎨 SHOW HN (max 3)")
    out.append("")

    for it in shows:
        out.append(fmt_story(it, cfg))
        out.append("")

    out.append(SEP)
    out.append("🐙 Nimbus · Sin Apple, sin coches, puro tech")

    # Update seen cache with items we actually emitted
    if ccfg.get("rotate_seen", True):
        emitted = []
        emitted.extend(dest)
        for c in categories.keys():
            emitted.extend(buckets.get(c, []))
        emitted.extend(otros or [])
        emitted.extend(shows)
        emitted_ids = [str(it.get("id")) for it in emitted if it.get("id")]
        for sid in emitted_ids:
            seen[sid] = now_ts()
        cache["seen"] = seen
        save_cache(cache_path, cache)

    sys.stdout.write("\n".join(out).strip() + "\n")


if __name__ == "__main__":
    main()
