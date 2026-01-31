# hn-digest-skill

Skill para generar un digest curado de **Hacker News**.

- Pensado para usarse desde agentes tipo **openclaw / Claude Code / Codex**.
- Todo es **configurable vía YAML**.
- Incluye **rotación/paginación** con caché de `seen` para que ejecuciones consecutivas saquen *los siguientes* artículos interesantes (sin repetir).

## Quick start

```bash
cd /root/clawd/skills/hn-digest

# Config
cp config.example.yaml config.yaml

# Run
python3 scripts/hn_digest.py --config config.yaml
```

### Sin resumen (más rápido)

```bash
python3 scripts/hn_digest.py --config config.yaml --no-summarize
```

## Configuración (YAML)

Archivo: `config.yaml`

### `hn`
- `list`: `topstories | beststories | newstories`
- `top_n`: tamaño máximo del pool (límite duro)
- `fetch_n`: cuántos IDs pedir a HN para tener pool suficiente (subir si repite)
- `min_score`: mínimo de puntos (excepto `Show HN`)
- `show_hn_max`: máximo de Show HN

### `filters`
- `exclude_keywords`: lista de keywords a excluir (se evalúa contra título + URL)

### `categories`
Mapa `Categoria -> [keywords...]`.
La categorización es match simple sobre el título (lowercase).

### `output`
- `destacados_count`
- `max_per_category`
- `max_otros`
- `separator` (compacto para Telegram)

### `summarize`
- `enabled`: true/false
- `language`, `length`, `model`
- `timeout_seconds`: si falla/timeout, **se omite** el resumen

### `cache`
- `path`: dónde guardar la caché
- `seen_ttl_seconds`: ventana para considerar “ya lo he enviado” (recomendación: 18–24h)
- `rotate_seen`: si true, salta items ya vistos dentro de TTL (paginación)
- `rotate_mode`: `global` (por ahora)

## Cómo funciona la paginación (rotación)

En cada ejecución:
1) Descarga la lista de IDs (p.ej. `topstories`).
2) Recorre en orden y **va llenando cupos por sección** (categorías/otros/show-hn), saltando:
   - excluidos
   - por debajo del mínimo
   - ya vistos según caché (TTL)
3) Calcula **Destacados** como top por puntos del pool.
4) Guarda en caché los IDs realmente emitidos.

Resultado: al pedir “Digest HN” varias veces seguidas, te da *los siguientes* sin repetir.

## Dependencias

- Python 3
- `pyyaml` (para leer `config.yaml`)
- CLI `summarize` (opcional)

## Nota

Existe un implementation legacy en Node (`scripts/hn_digest.js` + `src/`) que se mantiene por compatibilidad, pero la ruta recomendada es `scripts/hn_digest.py` + YAML.
