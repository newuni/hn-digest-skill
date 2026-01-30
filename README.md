# hn-digest-skill

Skill/mini-paquete para generar un **digest curado de Hacker News** (pensado para newuni) con:
- reglas de filtrado (min puntos, excluir Apple/coches)
- agrupación por categorías
- render a Markdown (Telegram-friendly)
- **caché local (7 días)** para que 2 ejecuciones el mismo día no repitan historias
- tests con `node --test`

## Uso rápido

```bash
cd skills/hn-digest
node scripts/hn_digest.js
```

## Tests

```bash
cd skills/hn-digest
npm test
```

## Caché anti-repetición
- Por defecto guarda IDs vistos en: `skills/hn-digest/.cache/seen.json`
- Ventana por defecto: `7` días

Flags:

```bash
node scripts/hn_digest.js --cacheDays 7 --cachePath /tmp/hn-seen.json --topFetch 150
```
