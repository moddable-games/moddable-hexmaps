# Moddable Hexmaps — Claude Code context

## What this is

A shared hexagonal map rendering engine and randomiser framework, similar in concept to moddable-chess — one engine, multiple game consumers.

## Origin

Ported from 3 tools in the WordPress project at:
- `/Applications/MAMP/htdocs/r1dotmy/wp-content/themes/modable/tools/nukes/`
- `/Applications/MAMP/htdocs/r1dotmy/wp-content/themes/modable/tools/talisman/`
- `/Applications/MAMP/htdocs/r1dotmy/wp-content/themes/modable/tools/twilight/`

Shared library was at `tools/stu/js/` (stuquery.js, stuquery.hexmap.js, interact.min.js) and `tools/js/xor.js`.

## Architecture goals

- **Single engine** that renders hexagonal grids via Canvas (not CSS-positioned divs)
- **Game configs** define terrain types, tile images, generation rules, player counts
- **URL params** for embedding: `?game=nukes&players=4&seed=abc123&theme=classic`
- **Marketing site** at hex.moddable.games showing all 4 games
- **Embeddable** in moddable-website tools pages via iframe

## Key data from original tools

### Nukes
- 5 map sizes: 2–6 rings (12–36 hexes)
- Terrain: water, forest, desert, mountain, plains, base/HQ
- 3 visual styles: Classic (coloured tiles), Artistic (illustrated), ASCII
- Player HQ placement varies by ring count and player count

### Talisman
- Fixed 3-ring hex board (replacing the original spiral board)
- Terrain: plains, desert, ruins, temple, glade, castle, oasis, fields, runes, treasure

### Twilight Imperium
- Fixed 3-ring board (Mecatol Rex centre, 6 home systems on outer ring)
- Tile types: blue (planet systems), red (anomalies), green (empty space), lanes, wormholes
- Full TI4 tile database with resources, influence, tech specialties, planet counts

## Coordinate system

Axial coordinates (q, r) with ring-based generation. Supports odd-q and odd-r layouts.

## Existing GitHub repos (to be archived after migration)

- https://github.com/Moddable-Games/Nukes-Maps (incomplete code dump)
- https://github.com/Moddable-Games/Talisman-Maps (empty placeholder)
- https://github.com/Moddable-Games/Twilight-Maps (empty placeholder)
