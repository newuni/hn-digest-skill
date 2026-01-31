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
node scripts/hn_digest.js
```

Opciones útiles:

```bash
node scripts/hn_digest.js --top 30 --minPoints 80 --tz Europe/Madrid
```

Por defecto usa una caché local (últimos 7 días) para **evitar repetir historias** entre ejecuciones.

```bash
# Cambiar ventana de caché / path
node scripts/hn_digest.js --cacheDays 7 --cachePath /tmp/hn-seen.json

# Si quieres más “pool” para evitar repeticiones, sube topFetch
node scripts/hn_digest.js --topFetch 150
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
