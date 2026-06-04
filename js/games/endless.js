(function() {

    var factions = [
        { id: 'republic', label: 'Rep', name: 'Republic', region: 'Near Earth', home: 'Sol' },
        { id: 'alphas', label: 'Alp', name: 'Alphas', region: 'Far North', home: 'Prime' },
        { id: 'syndicate', label: 'Syn', name: 'Syndicate', region: 'The Core', home: 'Markab' },
        { id: 'freeworlds', label: 'FW', name: 'Free Worlds', region: 'Dirt Belt', home: 'Dabih' },
        { id: 'pirates', label: 'Pir', name: 'Pirates', region: 'The Rim', home: 'Alkaid' },
        { id: 'remnant', label: 'Rem', name: 'Remnant', region: 'Ember Wastes', home: 'Arculus' },
        { id: 'coalition', label: 'Coa', name: 'Coalition', region: 'Paradise', home: 'Talita' },
        { id: 'wanderers', label: 'Wan', name: 'Wanderers', region: 'Wanderer Space', home: "Ka'ch'chrai" }
    ];

    var classicColors = {
        homeworld: '#4CAF50',
        core: '#7B1FA2',
        frontier: '#1565C0',
        rim: '#37474F',
        contested: '#C62828',
        nebula: '#E040FB',
        asteroid: '#9E9E9E',
        wormhole: '#00BCD4',
        empty: '#263238'
    };

    var directions = [
        { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
        { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
    ];

    function generateRing(radius) {
        if (radius === 0) return [{ q: 0, r: 0 }];
        var results = [];
        var q = 0, r = -radius;
        for (var d = 0; d < 6; d++) {
            for (var step = 0; step < radius; step++) {
                results.push({ q: q, r: r });
                q += directions[d].q;
                r += directions[d].r;
            }
        }
        return results;
    }

    function posKey(q, r) { return q + ',' + r; }

    function hexDistance(q1, r1, q2, r2) {
        return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
    }

    function shuffle(arr, rng) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = rng.integer(0, i);
            var tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        }
        return arr;
    }

    function getHomePositions(ring, count) {
        var ringHexes = generateRing(ring);
        var spacing = Math.floor(ringHexes.length / count);
        var positions = [];
        for (var i = 0; i < count; i++) {
            positions.push(ringHexes[i * spacing]);
        }
        return positions;
    }

    var layouts = {
        'compact': { label: 'Compact (2–3 players)', rings: 4, homeRing: 3 },
        'standard': { label: 'Standard (4–6 players)', rings: 5, homeRing: 4 },
        'grand': { label: 'Grand (7–8 players)', rings: 6, homeRing: 5 }
    };

    function buildSystemPools(activeFactions, rng) {
        var systemData = (typeof EndlessSystems !== 'undefined') ? EndlessSystems : null;
        if (!systemData) return null;

        var pools = {};
        for (var f = 0; f < activeFactions; f++) {
            var fid = factions[f].id;
            var regionSystems = systemData.regions[fid] ? systemData.regions[fid].slice() : [];
            var systemObjects = [];
            for (var i = 0; i < regionSystems.length; i++) {
                var sys = findSystem(systemData, regionSystems[i]);
                if (sys) systemObjects.push(sys);
            }
            shuffle(systemObjects, rng);
            pools[fid] = systemObjects;
        }

        var allUsed = {};
        for (var fid in pools) {
            for (var i = 0; i < pools[fid].length; i++) allUsed[pools[fid][i].name] = true;
        }
        var overflow = [];
        for (var i = 0; i < systemData.systems.length; i++) {
            if (!allUsed[systemData.systems[i].name]) overflow.push(systemData.systems[i]);
        }
        shuffle(overflow, rng);
        pools._overflow = overflow;
        return pools;
    }

    function findSystem(systemData, name) {
        for (var i = 0; i < systemData.systems.length; i++) {
            if (systemData.systems[i].name === name) return systemData.systems[i];
        }
        for (var i = 0; i < systemData.systems.length; i++) {
            if (systemData.systems[i].name.indexOf(name) === 0) return systemData.systems[i];
        }
        return null;
    }

    function drawSystem(pools, factionId) {
        if (!pools) return null;
        if (factionId && pools[factionId] && pools[factionId].length > 0) {
            return pools[factionId].shift();
        }
        if (pools._overflow && pools._overflow.length > 0) return pools._overflow.shift();
        for (var key in pools) {
            if (key === '_overflow') continue;
            if (pools[key].length > 0) return pools[key].shift();
        }
        return null;
    }

    function buildSystemHover(sys) {
        var parts = [sys.name];
        if (sys.code) parts[0] += ' [' + sys.code + ']';
        parts[0] += ' — ' + sys.region + ' (' + sys.faction + ')';
        var stats = [];
        if (sys.planets) stats.push(sys.planets + ' planets');
        if (sys.habitats) stats.push(sys.habitats + ' hab');
        if (sys.population) stats.push('pop ' + sys.population);
        if (sys.events) stats.push(sys.events + ' events');
        if (sys.wormholes && sys.wormholes !== '0') stats.push('WH: ' + sys.wormholes);
        if (stats.length) parts[0] += ' | ' + stats.join(', ');
        return parts[0];
    }

    function getSystemImagePath(systemName, base) {
        var systemData = (typeof EndlessSystems !== 'undefined') ? EndlessSystems : null;
        if (!systemData || !systemName) return null;
        var imgPath = systemData.images[systemName];
        if (!imgPath) return null;
        return base + 'img/tiles/' + imgPath;
    }

    function generate(size, players, seed, selectedLayout) {
        var rng = createSeededRng(seed + '_endless');
        var activeFactions = players > 0 ? Math.min(players, 8) : 6;

        var layoutDef = layouts[selectedLayout] || layouts['standard'];
        var rings = layoutDef.rings;
        var homeRing = layoutDef.homeRing;

        var allPositions = [];
        for (var ring = 0; ring <= rings; ring++) {
            var hexes = generateRing(ring);
            for (var i = 0; i < hexes.length; i++) {
                allPositions.push({ q: hexes[i].q, r: hexes[i].r, ring: ring });
            }
        }

        var board = {};
        for (var i = 0; i < allPositions.length; i++) {
            var pos = allPositions[i];
            board[posKey(pos.q, pos.r)] = { q: pos.q, r: pos.r, ring: pos.ring, type: null, faction: null };
        }

        board[posKey(0, 0)].type = 'core';

        var homePositions = getHomePositions(homeRing, activeFactions);
        for (var f = 0; f < activeFactions; f++) {
            var hp = homePositions[f];
            var key = posKey(hp.q, hp.r);
            if (board[key]) {
                board[key].type = 'homeworld';
                board[key].faction = factions[f].id;
                board[key].label = factions[f].label;
            }
        }

        var wormholeTypes = ['C', 'M', 'Y', 'K'];
        var wormholeCount = Math.min(8, Math.floor(allPositions.length * 0.06));
        var wormholeCandidates = [];
        for (var key in board) {
            var cell = board[key];
            if (cell.type === null && cell.ring >= 2 && cell.ring < rings) {
                wormholeCandidates.push(key);
            }
        }
        shuffle(wormholeCandidates, rng);
        for (var w = 0; w < wormholeCount && w < wormholeCandidates.length; w++) {
            var wk = wormholeCandidates[w];
            board[wk].type = 'wormhole';
            board[wk].wormholeType = wormholeTypes[w % 4];
        }

        for (var f = 0; f < activeFactions; f++) {
            var hp = homePositions[f];
            for (var d = 0; d < 6; d++) {
                var nq = hp.q + directions[d].q;
                var nr = hp.r + directions[d].r;
                var nk = posKey(nq, nr);
                if (board[nk] && board[nk].type === null) {
                    board[nk].type = 'frontier';
                    board[nk].faction = factions[f].id;
                }
            }
        }

        for (var key in board) {
            var cell = board[key];
            if (cell.type !== null) continue;

            if (cell.ring === 0) {
                cell.type = 'core';
            } else if (cell.ring === 1) {
                cell.type = rng.integer(0, 3) === 0 ? 'nebula' : 'core';
            } else if (cell.ring <= 2) {
                var roll = rng.integer(0, 5);
                if (roll === 0) cell.type = 'nebula';
                else if (roll <= 2) cell.type = 'core';
                else cell.type = 'contested';
            } else if (cell.ring <= homeRing - 1) {
                var roll = rng.integer(0, 7);
                if (roll === 0) cell.type = 'nebula';
                else if (roll === 1) cell.type = 'asteroid';
                else if (roll <= 3) cell.type = 'contested';
                else cell.type = 'frontier';
            } else if (cell.ring === homeRing) {
                var roll = rng.integer(0, 5);
                if (roll === 0) cell.type = 'asteroid';
                else if (roll <= 2) cell.type = 'frontier';
                else cell.type = 'rim';
            } else {
                var roll = rng.integer(0, 5);
                if (roll === 0) cell.type = 'asteroid';
                else if (roll === 1) cell.type = 'empty';
                else cell.type = 'rim';
            }
        }

        var systemPools = buildSystemPools(activeFactions, rng);
        var base = (typeof window !== 'undefined' && window.location.pathname.indexOf('/generate') !== -1) ? '../' : '';

        var hexData = [];
        for (var key in board) {
            var cell = board[key];
            var label = cell.label || cell.type.charAt(0).toUpperCase();
            if (cell.wormholeType) label = cell.wormholeType;
            var id;
            if (cell.q === 0 && cell.r === 0) {
                id = 'R0';
            } else {
                id = 'R' + cell.ring + '_' + key;
            }

            var system = null;
            var imagePath = null;

            if (cell.type === 'homeworld') {
                var fIdx = -1;
                for (var fi = 0; fi < factions.length; fi++) {
                    if (factions[fi].id === cell.faction) { fIdx = fi; break; }
                }
                if (fIdx >= 0) {
                    var systemData = (typeof EndlessSystems !== 'undefined') ? EndlessSystems : null;
                    system = systemData ? findSystem(systemData, factions[fIdx].home) : null;
                }
            } else if (cell.type !== 'wormhole' && cell.type !== 'asteroid' && cell.type !== 'empty') {
                system = drawSystem(systemPools, cell.faction);
            }

            if (system) {
                imagePath = getSystemImagePath(system.name, base);
                if (!label || label.length <= 1) label = system.name.substring(0, 3);
            }

            var hex = {
                id: id,
                q: cell.q,
                r: cell.r,
                type: cell.type,
                label: label,
                faction: cell.faction || null
            };
            if (system) {
                hex.tileName = buildSystemHover(system);
                hex.imagePath = imagePath;
            }

            hexData.push(hex);
        }

        return hexData;
    }

    HexApp.registerGame('endless', {
        label: 'Endless Skies',
        orientation: 'flat',
        sizes: [
            { value: 5, label: 'Standard' }
        ],
        defaultSize: 5,
        defaultPlayers: 6,
        styles: ['artistic', 'classic'],
        hasEditor: false,
        layouts: [
            { value: 'compact', label: 'Compact (2–3 players)' },
            { value: 'standard', label: 'Standard (4–6 players)' },
            { value: 'grand', label: 'Grand (7–8 players)' }
        ],
        defaultLayout: 'standard',

        playerCounts: function() { return [2, 3, 4, 5, 6, 7, 8]; },

        generate: function(size, players, seed, layout) {
            return generate(size, players, seed, layout);
        },

        getColors: function() {
            return classicColors;
        },

        getImages: function(style) {
            if (style !== 'artistic') return null;
            var base = (typeof window !== 'undefined' && window.location.pathname.indexOf('/generate') !== -1) ? '../' : '';
            return {
                _perHex: true,
                wormhole: base + 'img/tiles/endless/wormhole.png',
                asteroid: base + 'img/tiles/endless/asteroid_belt.png',
                empty: base + 'img/tiles/endless/void.png'
            };
        },

        getDescriptions: function() {
            return {
                homeworld: { name: 'Homeworld', desc: 'Faction home system' },
                core: { name: 'Core System', desc: 'Dense inner systems — high value' },
                frontier: { name: 'Frontier', desc: 'Exploration zone — moderate risk' },
                rim: { name: 'Rim', desc: 'Sparse outer systems — low resources' },
                contested: { name: 'Contested', desc: 'Border region — multi-faction claims' },
                nebula: { name: 'Nebula', desc: 'Blocks line-of-sight — mining opportunity' },
                asteroid: { name: 'Asteroid Field', desc: 'Dynamic obstacles — Discovery cards' },
                wormhole: { name: 'Wormhole', desc: 'Instantaneous travel link' },
                empty: { name: 'Void', desc: 'Uncharted space' }
            };
        },

        rendererOptions: function() {
            return { hexSize: 28, flat: true };
        }
    });
})();
