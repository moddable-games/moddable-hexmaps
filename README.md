# Moddable Hexmaps

**A shared hexagonal map framework for board game tools.**

Generates, renders, and edits hex-based game boards. Used by Nukes, Talisman Worlds, Twilight Imperium, and Colony — and available for any hex-based game.

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
| Talisman Worlds | Inner, Middle, River, Outer, Dungeon, Ending | 4–5 rings | — |
| Twilight Imperium | Blue (planets), Red (anomalies), Green (home), Lanes, Rex | 7 layouts (3–8p) | 3–8 |
| Colony | Forest, Pasture, Fields, Hills, Mountains, Desert, Sea, Gold, Fog | 7 layouts (Seafarers) | — |
| Planet Mongo | Oceanic, Submerged, Glacial, Volcanic, Mountain, Woodland, Desert, Jungle | 6 rings (127 hex) | 2–8 |
| Endless Skies | Homeworld, Core, Frontier, Rim, Contested, Nebula, Asteroid, Wormhole, Void | 3 layouts (4–6 rings) | 2–8 |

---

### Project Structure

```
index.html          — Landing page (marketing site)
generate/           — Map generator app
docs/               — Documentation
js/                 — Engine source
  game-registry.js  — Plugin registry (HexApp.registerGame API)
  app.js            — Framework controller (sidebar, tabs, URL, embed bridge)
  hex-controller.js — Consumer SDK (createMapController factory)
  hex-controller-entry.js — Convenience entry (imports all games + exposes window.HexApp)
  xorshift.js       — Seeded PRNG (XorShift128)
  hex-math.js       — Axial coordinate math, grid generation
  hex-renderer.js   — Canvas-based hex rendering
  hex-svg.js        — SVG serialiser (toSVG, toAnnotatedSVG)
  hex-svg-node.js   — Node.js entry point re-exporting engine modules
  games/            — Game plugins (one file per game)
    nukes.js        — Nukes: terrain gen, editor, ring-format export
    talisman.js     — Talisman: ring-based terrain pools
    twilight.js     — Twilight Imperium: multi-layout tile draw
    colony.js       — Colony: terrain + number tokens with constraints
    mongo.js        — Planet Mongo: fixed 127-hex layout
    endless.js      — Endless Skies: sector-based system assignment
mcp/                — MCP (Model Context Protocol) server
  tools.js          — Tool definitions + handleToolCall(name, args)
  server.js         — Standalone stdio JSON-RPC server
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

Part of the [Moddable Engines](https://moddable.games/engines/) family (see also: [Moddable Chess](https://chess.moddable.games))

---

### MCP Server

The engine is available as an MCP (Model Context Protocol) server for use with Claude Code, Claude Desktop, or any MCP-compatible client.

**Local stdio server:**
```bash
node mcp/server.js
```

**Add to Claude Code:**
```bash
claude mcp add --transport stdio moddable-hexmaps node mcp/server.js
```

**Available tools:**

| Tool | Description |
|------|-------------|
| `hex_list_games` | All available games with map types and layouts |
| `hex_generate_map` | Game + seed → full hex grid with terrain data |
| `hex_get_info` | Coord → terrain, adjacency, distances |
| `hex_compute_fov` | Position + range → visible hexes (with blocking) |
| `hex_export_svg` | Map → SVG string for rendering or embedding |
| `hex_pathfind` | Start + end → shortest path through terrain |

---

### Consumer SDK

Embed and control hex maps programmatically without iframes:

```html
<div id="map" style="width:600px;height:400px"></div>
<script type="module">
import './js/hex-controller-entry.js';

const map = HexApp.createMapController(
  document.getElementById('map'),
  { game: 'nukes', seed: '42', size: 4, players: 4 }
);

map.on('hexClick', (e) => console.log(e.hex));
map.regenerate({ seed: 'new' });
map.exportSVG();
map.destroy();
</script>
```

Full API reference: [docs/api.html](docs/api.html#consumer-sdk) | Live demo: [docs/sdk-demo.html](docs/sdk-demo.html)

---

### URL Parameters

| Param | Values | Description |
|-------|--------|-------------|
| `game` | nukes, talisman, twilight, colony, mongo, endless | Game to generate |
| `seed` | any string | RNG seed for reproducible maps |
| `size` | 2–6 | Ring count (hidden when layouts used) |
| `players` | 2–8 | Player count for base placement |
| `style` | artistic, classic, kenney, realistic | Visual style (varies per game) |
| `layout` | varies per game | Board layout variant |
| `boardonly` | 1 | Hide UI, show only the map canvas |
| `bg` | hex colour (e.g. 1a1a2e) | Background colour for embedding |
| `mode` | view, edit | view = read-only; edit = interactive |

---

### Changelog

#### 2026-06-10
- Consumer SDK: `HexApp.createMapController(container, opts)` for embedding maps without iframes
- Render hooks: `afterRender`, `tilePainter`, `overlayProvider` for custom drawing
- Events: `hexClick`, `hexHover`, `hexLeave`, `regenerate`, `styleChange`, `destroy`
- Multi-instance support: independent canvas, state, and image cache per controller
- SDK demo page with two interactive maps demonstrating hooks and events
- API docs: full Consumer SDK section (options, methods, events, hooks)
- Add MCP server: 6 tools (list games, generate map, hex info, field-of-view, export SVG, pathfind)
- Standalone stdio server at `mcp/server.js` for local use with Claude Code/Desktop
- Migrate entire codebase to native ESM (no build step, no bundler)
- Same source files work in browser (`<script type="module">`) and Node.js/Workers
- Single entry point: `js/app.js` imports full module graph
- Add fullscreen button to canvas footer for in-page fullscreen toggle
- Refactor fullscreen mode: in-place toggle via CSS (no browser Fullscreen API), proper Escape key exit, state restoration
- Document `mode=fullscreen` in docs index and API reference

#### 2026-06-04
- Fix corrupted mongo-tiles.js: all 127 tiles rebuilt from verified rulebook source
- Mongo hover: special abilities and wood commodity now shown in tooltips
- Floating hex tooltip: rich tile data appears near cursor instead of overflowing footer
- Footer truncation: long text shows ellipsis, sidebar no longer shifts on hover
- New game: Planet Mongo — fixed layout (127 hex, 6 rings), 8 factions, artistic tiles, named tiles with full commodity stats on hover
- New game: Endless Skies — fixed layout (91 hex, 5 rings), 8 factions, 96 per-system star composites, full stats from CSV on hover
- Planet Mongo: fixed board shape matching official setup diagram (odd-r offset → axial conversion)
- Endless Skies: sector-based tile assignment, 104 systems from source CSV, space port/asteroid/wormhole/void tiles
- Hover fix: tileName takes priority over generic biome descriptions
- Homepage grid updated to 3-column layout for 6 games
- Rename "Talisman: Hexed" to "Talisman Worlds" across all pages, docs, and data

#### 2026-06-03
- Export PNG: 2x resolution canvas download from Data panel
- Export PDF: single A4 page with map centred and maximised, JPEG-compressed
- Hex metadata system: `getDescriptions()` game config hook with enhanced hover info
- Talisman: all 55 terrain types have names and action descriptions shown on hover
- Colony: 5-6 player expanded layout with correct elongated hexagonal shape (4-5-6-6-5-4)
- Colony: sea frame and port placement system with spacing constraints
- Colony: 5 Seafarers expansion layouts (New World, New Shores, Four Islands, Through the Desert, Fog Islands)
- Colony: gold, fog, and sea terrain types added
- Guides restructured: index page at docs/guide.html, Colony tutorial moved to guide-colony.html
- New guide: SVG Integration (postMessage, direct API, annotated SVG, print/PDF, Moddable Rules pattern)
- Nav updated to "Guides" across all pages
- OG/Twitter meta tags added to all doc pages
- Homepage game cards forced to 2x2 grid, Colony and Talisman stats updated
- New styles: Kenney and Realistic for Talisman (55 unique tiles each, all terrain types covered)
- SVG export: HexSvg serialiser with `Export SVG` button and `hexmap:exportSvg` postMessage command
- SVG annotations: highlights, tokens, arrows, and legend rendering for annotated exports
- SVG legend centring fix
- Docs: HexSvg API reference, per-game style availability table, exportSvg postMessage docs
- Docs: architecture listing updated with hex-svg.js and img/tiles/

#### 2026-05-31
- Fix: boardonly embed mode now respects `bg=` param for canvas background colour (fixes #33)
- Fix: embed fills full iframe with no white border (html/body/canvas all receive background)
- Fix: canvas uses viewport dimensions in embed mode for correct sizing and vertical centering
- New postMessage commands: `hexmap:setStyle`, `hexmap:setGame` for parent-page control
- Extended `hexmap:regenerate` with `layout` and `style` params (fixes #30)
- Docs: updated API reference with colony game, correct style list, new postMessage commands

#### 2026-05-28
- New game: Colony (Catan-style) with standard and expanded layouts, number overlays, 6/8 constraint
- Twilight Imperium: 7 official layout variants (3p–8p including PoK with hyperlanes)
- Engine: layout selector system, overlay/token rendering, placement constraints with retry
- Engine: per-game style persistence (switching games preserves each game's style choice)
- New styles: Kenney and Realistic for Nukes and Colony (CC0 tilesets)
- Players dropdown hidden for games without player options
- Step-by-step plugin guide (docs/guide.html) using Colony as worked example
- Homepage: "For Developers" section with tabbed code blocks (script loading, register game, embed)
- Homepage: "Moddable Engines" sister section matching chess
- Hero parallax scroll effect (title lag, button fade, glow drift)
- Section colour banding: no adjacent sections share similar colours
- Updated docs, README, and homepage for 4 games
- Bump script updated to major/minor/patch syntax

#### 2026-05-27
- Plugin architecture: `HexApp.registerGame()` API — each game is a self-contained file in `js/games/`
- Embed bridge: postMessage API (`hexmap:getMap`, `hexmap:setMap`, `hexmap:regenerate`) with game-level export hooks
- Game tabs dynamically generated from registry (drop in a file, game auto-appears)
- Nukes ring-format export for parent app integration (replaces PR #20)
- Sticky nav: site nav stays pinned on scroll
- Embed API: `boardonly=1`, `bg=`, `mode=view|edit`, `theme=` params for iframe embedding
- Initial project setup and architecture planning
- Built Canvas-based hex rendering engine (pointy-top + flat-top)
- Ported initial 3 games from WordPress tools (Nukes, Talisman, Twilight)
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
