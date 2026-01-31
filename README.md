# hn-digest (Agent Skill)

Skill para generar un digest curado de **Hacker News**.

- Pensado para usarse desde agentes tipo **openclaw / Claude Code / Codex**.
- Todo es **configurable vía YAML** (no hay que tocar el código).
- Incluye **rotación/paginación** con caché de `seen` para que ejecuciones consecutivas saquen *los siguientes* artículos interesantes (sin repetir).

## Quick start

```bash
cd /root/clawd/skills/hn-digest

# 1) Config
cp config.example.yaml config.yaml

# 2) Run
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
- `top_n`: número máximo de items a considerar (límite global del pool)
- `fetch_n`: cuántos IDs pedir a HN para tener pool suficiente (subir si repite)
- `min_score`: mínimo de puntos (excepto `Show HN`)
- `show_hn_max`: máximo de Show HN

### `filters`
- `exclude_keywords`: lista de keywords a excluir (se evalúa contra título + URL)

### `categories`
Mapa `Categoria -> [keywords...]`.
La categorización es por match simple en título (lowercase).

### `output`
- `destacados_count`: cuántos destacados
- `max_per_category`: cuántos por categoría
- `max_otros`: cuántos en “OTROS”
- `separator`: separador visual (compacto para Telegram)

### `summarize`
- `enabled`: true/false
- `language`: `es` (recomendado)
- `length`: `short`
- `model`: modelo para summarize (por defecto `cli/codex/gpt-5.2`)
- `timeout_seconds`: si falla/timeout, **se omite** el resumen

### `cache`
- `path`: dónde guardar la caché
- `seen_ttl_seconds`: ventana para considerar “ya lo he enviado” (recomendación: 18–24h)
- `rotate_seen`: si true, salta items ya vistos dentro de TTL (paginación)
- `rotate_mode`: `global` (por ahora)

## Cómo funciona la paginación (rotación)

En cada ejecución:
1) Descarga la lista de IDs (p.ej. `topstories`).
2) Recorre en orden y **va llenando cupos por sección** (destacados/categorías/otros/show-hn), saltando:
   - excluidos
   - por debajo del mínimo
   - ya vistos según caché (TTL)
3) Guarda en caché los IDs realmente emitidos.

Resultado: al pedir “Digest HN” varias veces seguidas, te da *los siguientes* sin repetir.

## Dependencias

- Python 3
- `pyyaml` (para leer `config.yaml`)
- CLI `summarize` (opcional; si no está o falla, se omite el resumen)

## Desarrollo

- El script principal está en `scripts/hn_digest.py`.
- El contrato de configuración está en `config.example.yaml`.
