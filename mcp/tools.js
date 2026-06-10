import { HexApp, getGameConfig, getRegisteredGames } from '../js/game-registry.js';
import { HexMath } from '../js/hex-math.js';
import { HexSvg } from '../js/hex-svg.js';
import { createSeededRng } from '../js/xorshift.js';
import '../js/games/nukes.js';
import '../js/games/talisman.js';
import '../js/games/twilight.js';
import '../js/games/colony.js';
import '../js/games/mongo.js';
import '../js/games/endless.js';

export const TOOLS = [
  {
    name: 'hex_list_games',
    description: 'List all available hex map games with their map types, layouts, sizes, and style options.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'hex_generate_map',
    description: 'Generate a hex map for a given game. Returns the full hex grid with terrain types, coordinates, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        game: {
          type: 'string',
          description: 'Game key (e.g. "nukes", "colony", "twilight", "talisman", "mongo", "endless").',
        },
        seed: {
          type: 'string',
          description: 'Seed string for reproducible generation. Omit for a default seed.',
        },
        size: {
          type: 'number',
          description: 'Map size (ring count). Meaning varies by game. Omit for the game default.',
        },
        players: {
          type: 'number',
          description: 'Player count. Omit or 0 for no player bases.',
        },
        layout: {
          type: 'string',
          description: 'Layout variant (e.g. "standard", "expanded", "6p"). Only for games with multiple layouts.',
        },
      },
      required: ['game'],
    },
  },
  {
    name: 'hex_get_info',
    description: 'Get detailed information about a specific hex coordinate on a generated map: terrain type, neighbors, and distances to other hexes.',
    inputSchema: {
      type: 'object',
      properties: {
        game: {
          type: 'string',
          description: 'Game key.',
        },
        seed: {
          type: 'string',
          description: 'Seed used to generate the map.',
        },
        size: {
          type: 'number',
          description: 'Map size.',
        },
        players: {
          type: 'number',
          description: 'Player count.',
        },
        layout: {
          type: 'string',
          description: 'Layout variant.',
        },
        q: {
          type: 'number',
          description: 'Axial q coordinate of the target hex.',
        },
        r: {
          type: 'number',
          description: 'Axial r coordinate of the target hex.',
        },
      },
      required: ['game', 'q', 'r'],
    },
  },
  {
    name: 'hex_compute_fov',
    description: 'Compute field-of-view from a hex position: all hexes visible within a given range, respecting line-of-sight through the grid.',
    inputSchema: {
      type: 'object',
      properties: {
        game: {
          type: 'string',
          description: 'Game key.',
        },
        seed: {
          type: 'string',
          description: 'Seed used to generate the map.',
        },
        size: {
          type: 'number',
          description: 'Map size.',
        },
        players: {
          type: 'number',
          description: 'Player count.',
        },
        layout: {
          type: 'string',
          description: 'Layout variant.',
        },
        q: {
          type: 'number',
          description: 'Axial q coordinate of the observer.',
        },
        r: {
          type: 'number',
          description: 'Axial r coordinate of the observer.',
        },
        range: {
          type: 'number',
          description: 'Vision range in hex steps (default 3).',
        },
        blocking: {
          type: 'array',
          items: { type: 'string' },
          description: 'Terrain types that block line of sight (e.g. ["mount", "mountains"]). Defaults to none.',
        },
      },
      required: ['game', 'q', 'r'],
    },
  },
  {
    name: 'hex_export_svg',
    description: 'Export a generated hex map as an SVG string for rendering or embedding.',
    inputSchema: {
      type: 'object',
      properties: {
        game: {
          type: 'string',
          description: 'Game key.',
        },
        seed: {
          type: 'string',
          description: 'Seed used to generate the map.',
        },
        size: {
          type: 'number',
          description: 'Map size.',
        },
        players: {
          type: 'number',
          description: 'Player count.',
        },
        layout: {
          type: 'string',
          description: 'Layout variant.',
        },
        hexSize: {
          type: 'number',
          description: 'Hex radius in pixels (default from game config).',
        },
        labels: {
          type: 'boolean',
          description: 'Show terrain labels on hexes (default false).',
        },
        bgColor: {
          type: 'string',
          description: 'Background colour (e.g. "#1a1a2e"). Omit for transparent.',
        },
      },
      required: ['game'],
    },
  },
  {
    name: 'hex_pathfind',
    description: 'Find the shortest path between two hexes on a generated map using breadth-first search. Optionally specify impassable terrain types.',
    inputSchema: {
      type: 'object',
      properties: {
        game: {
          type: 'string',
          description: 'Game key.',
        },
        seed: {
          type: 'string',
          description: 'Seed used to generate the map.',
        },
        size: {
          type: 'number',
          description: 'Map size.',
        },
        players: {
          type: 'number',
          description: 'Player count.',
        },
        layout: {
          type: 'string',
          description: 'Layout variant.',
        },
        fromQ: {
          type: 'number',
          description: 'Start hex axial q.',
        },
        fromR: {
          type: 'number',
          description: 'Start hex axial r.',
        },
        toQ: {
          type: 'number',
          description: 'End hex axial q.',
        },
        toR: {
          type: 'number',
          description: 'End hex axial r.',
        },
        impassable: {
          type: 'array',
          items: { type: 'string' },
          description: 'Terrain types that cannot be traversed (e.g. ["water", "mount"]). Defaults to none.',
        },
      },
      required: ['game', 'fromQ', 'fromR', 'toQ', 'toR'],
    },
  },
];

export function handleToolCall(name, args) {
  switch (name) {
    case 'hex_list_games': return listGames(args);
    case 'hex_generate_map': return generateMap(args);
    case 'hex_get_info': return getHexInfo(args);
    case 'hex_compute_fov': return computeFov(args);
    case 'hex_export_svg': return exportSvg(args);
    case 'hex_pathfind': return pathfind(args);
    default: return { error: `Unknown tool: ${name}` };
  }
}

function listGames() {
  var games = getRegisteredGames();
  var results = [];
  for (var i = 0; i < games.length; i++) {
    var key = games[i];
    var config = getGameConfig(key);
    var entry = {
      key: key,
      label: config.label || key,
      orientation: config.orientation || 'pointy',
      styles: config.styles || [],
    };
    if (config.sizes) {
      entry.sizes = config.sizes.map(function(s) { return { value: s.value, label: s.label }; });
      entry.defaultSize = config.defaultSize;
    }
    if (config.layouts) {
      entry.layouts = config.layouts.map(function(l) { return { value: l.value, label: l.label }; });
      entry.defaultLayout = config.defaultLayout;
    }
    results.push(entry);
  }
  return { games: results, count: results.length };
}

function generateMapHexes(args) {
  var game = args.game;
  var config = getGameConfig(game);
  if (!config) {
    return { error: 'Unknown game: "' + game + '". Use hex_list_games to see available options.' };
  }

  var seed = args.seed || 'mcp-default';
  var size = args.size || config.defaultSize || 3;
  var players = args.players || config.defaultPlayers || 0;
  var layout = args.layout || config.defaultLayout || null;

  var hexes = config.generate(size, players, seed, layout);
  if (!hexes || hexes.length === 0) {
    return { error: 'Generation produced no hexes. Check size/layout parameters.' };
  }

  return { hexes: hexes, config: config, seed: seed, size: size, players: players, layout: layout };
}

function generateMap(args) {
  var result = generateMapHexes(args);
  if (result.error) return result;

  var hexes = result.hexes;
  var summary = {};
  for (var i = 0; i < hexes.length; i++) {
    var t = hexes[i].type || 'unknown';
    summary[t] = (summary[t] || 0) + 1;
  }

  return {
    game: args.game,
    seed: result.seed,
    size: result.size,
    players: result.players,
    layout: result.layout,
    hexCount: hexes.length,
    terrainSummary: summary,
    hexes: hexes.map(function(h) {
      var entry = { q: h.q, r: h.r, type: h.type };
      if (h.id) entry.id = h.id;
      if (h.label) entry.label = h.label;
      if (h.overlay) entry.overlay = h.overlay;
      if (h.port) entry.port = h.port;
      return entry;
    }),
  };
}

function getHexInfo(args) {
  var result = generateMapHexes(args);
  if (result.error) return result;

  var hexes = result.hexes;
  var q = args.q;
  var r = args.r;

  var target = null;
  for (var i = 0; i < hexes.length; i++) {
    if (hexes[i].q === q && hexes[i].r === r) {
      target = hexes[i];
      break;
    }
  }

  if (!target) {
    return { error: 'No hex at (' + q + ', ' + r + ') on this map.' };
  }

  var hexMap = {};
  for (var i = 0; i < hexes.length; i++) {
    hexMap[hexes[i].q + ',' + hexes[i].r] = hexes[i];
  }

  var neighborCoords = HexMath.getNeighbors(q, r);
  var neighbors = [];
  for (var i = 0; i < neighborCoords.length; i++) {
    var key = neighborCoords[i].q + ',' + neighborCoords[i].r;
    if (hexMap[key]) {
      neighbors.push({
        q: neighborCoords[i].q,
        r: neighborCoords[i].r,
        type: hexMap[key].type,
      });
    }
  }

  var distances = [];
  for (var i = 0; i < hexes.length; i++) {
    if (hexes[i] === target) continue;
    distances.push({
      q: hexes[i].q,
      r: hexes[i].r,
      type: hexes[i].type,
      distance: HexMath.axialDistance({ q: q, r: r }, { q: hexes[i].q, r: hexes[i].r }),
    });
  }
  distances.sort(function(a, b) { return a.distance - b.distance; });

  return {
    hex: { q: q, r: r, type: target.type, id: target.id || null, label: target.label || null },
    neighbors: neighbors,
    nearestByDistance: distances.slice(0, 10),
  };
}

function computeFov(args) {
  var result = generateMapHexes(args);
  if (result.error) return result;

  var hexes = result.hexes;
  var originQ = args.q;
  var originR = args.r;
  var range = args.range || 3;
  var blocking = args.blocking || [];

  var hexMap = {};
  for (var i = 0; i < hexes.length; i++) {
    hexMap[hexes[i].q + ',' + hexes[i].r] = hexes[i];
  }

  if (!hexMap[originQ + ',' + originR]) {
    return { error: 'No hex at (' + originQ + ', ' + originR + ') on this map.' };
  }

  var visible = [];
  var blocked = [];

  for (var i = 0; i < hexes.length; i++) {
    var h = hexes[i];
    var dist = HexMath.axialDistance({ q: originQ, r: originR }, { q: h.q, r: h.r });
    if (dist > range) continue;
    if (dist === 0) {
      visible.push({ q: h.q, r: h.r, type: h.type, distance: 0 });
      continue;
    }

    var isBlocked = false;
    if (blocking.length > 0) {
      var steps = Math.max(Math.abs(h.q - originQ), Math.abs(h.r - originR), Math.abs((h.q + h.r) - (originQ + originR)));
      for (var step = 1; step < steps; step++) {
        var t = step / steps;
        var lerpQ = originQ + (h.q - originQ) * t;
        var lerpR = originR + (h.r - originR) * t;
        var roundedQ = Math.round(lerpQ);
        var roundedR = Math.round(lerpR);
        var key = roundedQ + ',' + roundedR;
        if (hexMap[key] && blocking.indexOf(hexMap[key].type) !== -1) {
          isBlocked = true;
          break;
        }
      }
    }

    if (isBlocked) {
      blocked.push({ q: h.q, r: h.r, type: h.type, distance: dist });
    } else {
      visible.push({ q: h.q, r: h.r, type: h.type, distance: dist });
    }
  }

  return {
    origin: { q: originQ, r: originR },
    range: range,
    blocking: blocking,
    visibleCount: visible.length,
    blockedCount: blocked.length,
    visible: visible,
    blocked: blocked,
  };
}

function exportSvg(args) {
  var result = generateMapHexes(args);
  if (result.error) return result;

  var hexes = result.hexes;
  var config = result.config;

  var colors = config.getColors ? config.getColors() : {};
  var rendererOpts = config.rendererOptions ? config.rendererOptions() : {};

  var opts = {
    hexSize: args.hexSize || rendererOpts.hexSize || 30,
    flat: config.orientation === 'flat',
    colors: colors,
    labels: args.labels || false,
    bgColor: args.bgColor || null,
  };

  var svg = HexSvg.toSVG(hexes, opts);

  return {
    game: args.game,
    seed: result.seed,
    hexCount: hexes.length,
    svg: svg,
  };
}

function pathfind(args) {
  var result = generateMapHexes(args);
  if (result.error) return result;

  var hexes = result.hexes;
  var impassable = args.impassable || [];

  var hexMap = {};
  for (var i = 0; i < hexes.length; i++) {
    hexMap[hexes[i].q + ',' + hexes[i].r] = hexes[i];
  }

  var startKey = args.fromQ + ',' + args.fromR;
  var endKey = args.toQ + ',' + args.toR;

  if (!hexMap[startKey]) {
    return { error: 'No hex at start (' + args.fromQ + ', ' + args.fromR + ').' };
  }
  if (!hexMap[endKey]) {
    return { error: 'No hex at end (' + args.toQ + ', ' + args.toR + ').' };
  }

  var queue = [startKey];
  var visited = {};
  visited[startKey] = null;

  while (queue.length > 0) {
    var currentKey = queue.shift();
    if (currentKey === endKey) break;

    var parts = currentKey.split(',');
    var cq = parseInt(parts[0]);
    var cr = parseInt(parts[1]);
    var neighbors = HexMath.getNeighbors(cq, cr);

    for (var i = 0; i < neighbors.length; i++) {
      var nk = neighbors[i].q + ',' + neighbors[i].r;
      if (visited[nk] !== undefined) continue;
      if (!hexMap[nk]) continue;
      if (impassable.indexOf(hexMap[nk].type) !== -1) continue;
      visited[nk] = currentKey;
      queue.push(nk);
    }
  }

  if (visited[endKey] === undefined) {
    return {
      reachable: false,
      from: { q: args.fromQ, r: args.fromR },
      to: { q: args.toQ, r: args.toR },
      reason: 'No path exists (destination unreachable with given impassable terrain).',
    };
  }

  var path = [];
  var cur = endKey;
  while (cur !== null) {
    var p = cur.split(',');
    path.unshift({ q: parseInt(p[0]), r: parseInt(p[1]), type: hexMap[cur].type });
    cur = visited[cur];
  }

  return {
    reachable: true,
    from: { q: args.fromQ, r: args.fromR },
    to: { q: args.toQ, r: args.toR },
    distance: path.length - 1,
    path: path,
  };
}
