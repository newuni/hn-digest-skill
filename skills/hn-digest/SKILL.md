---
name: hn-digest
description: Genera un digest curado de Hacker News. Usar cuando el usuario pida resumen/digest de HN, noticias tech del día, o "qué hay en Hacker News". También se ejecuta automáticamente vía cron diario a las 8:00.
---

# HN Digest

Genera un resumen diario de las mejores historias de Hacker News, personalizado para newuni.

## Punto de entrada (único y canónico)

**Siempre** ejecutar el wrapper (manual y cron). Es el único punto de verdad para flags como `seenTtlHours`.

```bash
/root/clawd/skills/hn-digest/skills/hn-digest/scripts/hn_digest_cron_wrapper.sh
```

Notas:
- Cache anti-repetidos + paginación determinista (cola pendiente): `/root/clawd/skills/hn-digest/skills/hn-digest/.cache/seen.json`
- La ventana anti-repetidos se controla desde el wrapper (actualmente 30 días).
- Evitar llamar `hn_digest.js` directamente para no introducir discrepancias.

## Cómo funciona (resumen)

1. Fetch top stories: `https://hacker-news.firebaseio.com/v0/topstories.json`
2. Fetch detalles: `https://hacker-news.firebaseio.com/v0/item/{id}.json`
3. Filtra (puntos + exclusiones) + quita “seen” vía cache
4. Renderiza el digest y marca como “seen” lo emitido

## Filtros del usuario

- **Mínimo puntos:** 80 (excepto Show HN)
- **Excluir:** Apple/Mac, automoción/coches/EVs
- **Incluir:** IA/ML, desarrollo, startups, open source, ciencia, seguridad, hardware general
- **Show HN:** Máximo 3, seleccionados por interés para un dev

## Formato de salida

```
🍊 HN DIGEST — [Fecha]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⭐ DESTACADOS (top 3-5 por puntos)

**Título**
🔥 X pts · Y comentarios
Resumen de 2 frases explicando por qué es interesante.
📎 [URL artículo]
💬 [URL discusión HN]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 IA / LLMs
[historias agrupadas]

💻 DESARROLLO
[historias agrupadas]

🔒 SEGURIDAD / PRIVACIDAD
[historias agrupadas]

... otras categorías relevantes ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 SHOW HN (max 3)

**Título**
X pts · Stack/tecnología
Descripción breve del proyecto.
📎 [URL]
💬 [URL HN]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐙 Nimbus · Sin Apple, sin coches, puro tech
```

## Cron automático

- **Jobs:** `hn-digest-daily` y `hn-digest-catchup-daily`
- Ambos ejecutan el mismo wrapper:
  - `/root/clawd/skills/hn-digest/skills/hn-digest/scripts/hn_digest_cron_wrapper.sh`
- **Entrega:** Telegram

## Comandos del usuario

- "hazme el digest de HN"
- "noticias de hacker news"
- "qué hay interesante en HN"
- "HN digest"
- "resumen tech del día"
