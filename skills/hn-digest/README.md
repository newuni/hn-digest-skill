# hn-digest

Genera un digest curado de **Hacker News** para newuni.

## Reglas (por defecto)
- Fuente: API oficial Firebase
  - `https://hacker-news.firebaseio.com/v0/topstories.json`
  - `https://hacker-news.firebaseio.com/v0/item/<id>.json`
- Top N: 30
- Mínimo puntos: 80 (**excepto** `Show HN`)
- Excluir: Apple/Mac, automoción/coches/EVs
- Incluir (preferencia): IA/ML, desarrollo, startups, open source, ciencia, seguridad, hardware general
- `Show HN`: máx 3 (por interés)

## Uso (CLI)

```bash
cd /root/clawd/skills/hn-digest
node skills/hn-digest/scripts/hn_digest.js
```

Opciones útiles:

```bash
node skills/hn-digest/scripts/hn_digest.js --top 30 --minPoints 80 --tz Europe/Madrid
```

La selección es **paginada y determinista**: cada ejecución consume una cola pendiente (persistida en caché) para sacar *los siguientes* ítems.

```bash
# Ventana anti-repetidos (recomendado: 24h)
node skills/hn-digest/scripts/hn_digest.js --seenTtlHours 24

# Cambiar path de caché
node skills/hn-digest/scripts/hn_digest.js --cachePath /tmp/hn-seen.json

# Si quieres más “pool” para evitar quedarte sin unseen, sube topFetch
node skills/hn-digest/scripts/hn_digest.js --topFetch 300
```

Salida: Markdown listo para Telegram.

## Tests

```bash
cd /root/clawd/skills/hn-digest
npm test
```

## Estructura
- `src/hn.js`: fetch + normalización de items
- `src/filters.js`: exclusión, show-hn, etc.
- `src/categorize.js`: asignación a categorías
- `src/render.js`: render a Markdown
- `scripts/hn_digest.js`: CLI

## Nota
Este paquete no depende de librerías externas: usa `fetch` nativo de Node.
