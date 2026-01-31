---
name: hn-digest
description: Genera un digest curado de Hacker News. Usar cuando el usuario pida resumen/digest de HN, noticias tech del día, o "qué hay en Hacker News". También se ejecuta automáticamente vía cron diario a las 8:00.
---

# HN Digest

Genera un resumen diario de las mejores historias de Hacker News, personalizado para newuni.

## Cómo ejecutar

### Opción recomendada (script local, incluye summarize)

- Ejecuta:
  - `python3 /root/clawd/skills/hn-digest/scripts/hn_digest.py`

El script:
- descarga top stories de HN,
- aplica filtros del usuario,
- y usa **summarize** para generar **1 frase** de resumen por artículo (para no saturar).

### Opción manual (API)

1. Fetch top 30 stories: `https://hacker-news.firebaseio.com/v0/topstories.json`
2. Fetch detalles de cada historia: `https://hacker-news.firebaseio.com/v0/item/{id}.json`
3. Aplicar filtros y generar digest

## Filtros del usuario

- **Mínimo puntos:** 80 (excepto Show HN)
- **Excluir:** Apple/Mac, automoción/coches/EVs
- **Incluir:** IA/ML, desarrollo, startups, open source, ciencia, seguridad, hardware general
- **Show HN:** Máximo 3, seleccionados por interés para un dev

## Formato de salida

```
🍊 HN DIGEST — [Fecha]

────────────

⭐ DESTACADOS (top 3-5 por puntos)

**Título**
🔥 X pts · Y comentarios
Resumen (1 frase)
📎 [URL artículo]
(💬 [URL HN] solo si no hay URL del artículo)

────────────

🤖 IA / LLMs
[historias agrupadas]

💻 DESARROLLO
[historias agrupadas]

🔒 SEGURIDAD / PRIVACIDAD
[historias agrupadas]

... otras categorías relevantes ...

────────────

🎨 SHOW HN (max 3)

**Título**
X pts · (opcional) stack/tecnología
Resumen (1 frase)
📎 [URL]
(💬 [URL HN] solo si no hay URL)

────────────

🐙 Nimbus · Sin Apple, sin coches, puro tech
```

## Cron automático

- **Job:** `hn-digest-daily`
- **Horario:** 0 8 * * * (8:00 AM Europe/Madrid)
- **Entrega:** Telegram

## Comandos del usuario

- "hazme el digest de HN"
- "noticias de hacker news"
- "qué hay interesante en HN"
- "HN digest"
- "resumen tech del día"
