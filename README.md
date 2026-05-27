# Moddable Hexmaps

**A shared hexagonal map framework for board game tools.**

Generates, renders, and edits hex-based game boards. Used by Nukes, Talisman: Hexed, and Twilight Imperium (Hyper Imperium) — and available for any hex-based game.

---

### What it does

- Renders hex grids via Canvas (flat-top or pointy-top) at any ring count
- Randomised map generation with seeded RNG (reproducible via seed string)
- Multiple terrain/tile palettes per game
- Click-to-edit individual hexes
- Export/import map data as JSON
- Embeddable via iframe with full URL param API (`boardonly`, `bg`, `mode`, `theme`)

---

### Games

| Game | Terrain types | Map sizes | Players |
|------|--------------|-----------|---------|
| Nukes | Water, Forest, Desert, Mountain, Plains, HQ | 2–6 rings | 2–6 |
| Talisman: Hexed | Inner, Middle, River, Outer, Dungeon, Ending | 4–5 rings | 2–6 |
| Twilight Imperium | Blue (planets), Red (anomalies), Green (home), Lanes, Legends, Rex | 3 rings (fixed) | 3–8 |

---

### Project Structure

```
index.html          — Landing page (marketing site)
generate/           — Map generator app
docs/               — Documentation
js/                 — Engine source
  game-registry.js  — Plugin registry (HexApp.registerGame API)
  app.js            — Framework controller (sidebar, tabs, URL, embed bridge)
  xorshift.js       — Seeded PRNG (XorShift128)
  hex-math.js       — Axial coordinate math, grid generation
  hex-renderer.js   — Canvas-based hex rendering
  games/            — Game plugins (one file per game)
    nukes.js        — Nukes: terrain gen, editor, ring-format export
    talisman.js     — Talisman: ring-based terrain pools
    twilight.js     — Twilight Imperium: tile draw from pools
css/                — Stylesheets
  shared.css        — Shared nav/footer (matches moddable-chess)
  home.css          — Landing page styles (green theme)
  style.css         — Generator app styles
  docs.css          — Documentation styles
data/               — Game configs and hex coordinate data
```

---

### Stack

```
HTML + Vanilla JS + Canvas rendering + Zero dependencies
```

---

### Local development

Via MAMP: `http://localhost/MODDABLE/moddable-hexmaps/`

Or open `index.html` directly.

---

### Deployment

GitHub Pages at `hex.moddable.games`

Part of the [Moddable Engines](https://web.moddable.games/engines/) family (see also: [Moddable Chess](https://chess.moddable.games))

---

### URL Parameters

| Param | Values | Description |
|-------|--------|-------------|
| `game` | nukes, talisman, twilight | Game to generate |
| `seed` | any integer | RNG seed for reproducible maps |
| `size` | 2–6 | Ring count |
| `players` | 2–8 | Player count for base placement |
| `theme` | classic, artistic, ascii | Visual style (Nukes only) |
| `boardonly` | 1 | Hide UI, show only the map canvas |
| `bg` | hex colour (e.g. 1a1a2e) | Background colour for embedding |
| `mode` | view, edit | view = read-only; edit = interactive |

---

### Changelog

#### 2026-05-27
- Plugin architecture: `HexApp.registerGame()` API — each game is a self-contained file in `js/games/`
- Embed bridge: postMessage API (`hexmap:getMap`, `hexmap:setMap`, `hexmap:regenerate`) with game-level export hooks
- Game tabs dynamically generated from registry (drop in a file, game auto-appears)
- Nukes ring-format export for parent app integration (replaces PR #20)
- Sticky nav: site nav stays pinned on scroll
- Embed API: `boardonly=1`, `bg=`, `mode=view|edit`, `theme=` params for iframe embedding
- Initial project setup and architecture planning
- Built Canvas-based hex rendering engine (pointy-top + flat-top)
- Ported all 3 games from WordPress tools (Nukes, Talisman, Twilight)
- Landing page, generator app, and docs following moddable-chess structure
- Green-themed design (distinct from moddable-chess blue)
- Brand assets: cube.svg favicon, moddable-logo footer, hex-grid-green background
- Seeded RNG (XorShift128) for reproducible maps
- URL parameter support for embedding (`game`, `seed`, `size`, `players`, `style`)
- Version system with bump script
- Sidebar tabs: Random (controls), Editor (per-ring terrain reset), Data (export/import JSON)
- Style selector: Classic, Artistic (placeholder), ASCII
- Click-to-cycle terrain editing (Nukes)
- Fixed coordinate conversion: offset→axial for Nukes (odd-r) and Twilight (odd-q)
- Event listener cleanup on game switch (prevents double-fire bug)
- Talisman size labels: "Standard" vs "Dungeon Expansion"
