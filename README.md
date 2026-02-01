# hn-digest-skill

Skill para generar un digest curado de **Hacker News**.

- Pensado para usarse desde agentes tipo **Clawdbot**.
- Implementación **canónica**: **Node** (sin dependencias externas; usa `fetch` nativo) + **caché local** anti-repetidos.
- Objetivo: que dos llamadas consecutivas a “Digest HN” saquen *los siguientes* ítems (sin repetir) mientras haya unseen en el pool.

## Ruta canónica

El código “bueno” vive en:

- `skills/hn-digest/`
  - `scripts/hn_digest.js` (CLI)
  - `src/*` (fetch/filters/categorías/render)
  - `.cache/seen.json` (IDs ya emitidos)

## Quick start

```bash
cd /root/clawd/skills/hn-digest

node skills/hn-digest/scripts/hn_digest.js \
  --top 30 \
  --topFetch 200 \
  --minPoints 80 \
  --tz Europe/Madrid \
  --cacheDays 7
```

### Tests

```bash
cd /root/clawd/skills/hn-digest
npm test
```

## Notas

- La vía antigua (python/YAML + duplicados en raíz) se ha eliminado para evitar confusiones.
- El cron `hn-digest-daily` debe invocar **este** script Node (no el legacy).
