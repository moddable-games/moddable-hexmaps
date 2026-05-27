# Moddable Hexmaps

**A shared hexagonal map framework for board game tools.**

Generates, renders, and edits hex-based game boards. Used by Nukes, Talisman: Hexed, and Twilight Imperium (Hyper Imperium) — and available for any hex-based game.

---

### What it does

- Renders hex grids (flat-top or pointy-top) at any ring count
- Randomised map generation with seeded RNG (reproducible via seed string)
- Multiple terrain/tile palettes per game
- Click-to-edit individual hexes
- Export/import map data as JSON
- Embeddable via iframe with URL params (`game=`, `players=`, `seed=`, `theme=`)

---

### Games

| Game | Terrain types | Map sizes | Players |
|------|--------------|-----------|---------|
| Nukes | Water, Forest, Desert, Mountain, Plains, HQ | 2–6 rings | 2–6 |
| Talisman: Hexed | Plains, Desert, Ruins, Temple, Glade, Castle, Oasis, Fields, Runes, Treasure | 3 rings | 2–6 |
| Twilight Imperium | Blue (planets), Red (anomalies), Green (empty), Rex, Lanes, Wormholes | 3 rings (fixed) | 3–8 |

---

### Stack

```
HTML + Vanilla JS + Canvas rendering + Zero dependencies
```

---

### Local development

```
open index.html
```

Or via MAMP: `http://localhost/MODDABLE/moddable-hexmaps/`

---

### Deployment

GitHub Pages at `hex.moddable.games`

---

### Changelog

#### 2026-05-27
- Initial project setup and architecture planning
