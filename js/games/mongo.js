(function() {

    var factions = [
        { id: 'frigians', label: 'F', name: 'Frigians', ruler: 'Queen Fria', region: 'Ice Kingdom' },
        { id: 'tropicans', label: 'T', name: 'Tropicans', ruler: 'Queen Desira', region: 'Jungle Kingdom' },
        { id: 'lionmen', label: 'L', name: 'Lionmen', ruler: 'King Jugrid', region: 'Land of Lionmen' },
        { id: 'volcanians', label: 'V', name: 'Volcanians', ruler: 'Desert Hawk', region: 'Firelands' },
        { id: 'coralians', label: 'C', name: 'Coralians', ruler: 'Queen Undina', region: 'Undersea Kingdom' },
        { id: 'arborians', label: 'A', name: 'Arborians', ruler: 'Prince Barin', region: 'Forest Kingdom' },
        { id: 'magneticans', label: 'M', name: 'Magneticans', ruler: 'Ming the Merciless', region: 'Magnetic Mountains' },
        { id: 'hawkmen', label: 'H', name: 'Hawkmen', ruler: 'Prince Vultan', region: 'Sky City' }
    ];

    var factionTiles = {
        frigians:    { starting: ['glacial','glacial','glacial','glacial','glacial','glacial'], remaining: repeat('glacial', 16) },
        tropicans:   { starting: ['jungle','jungle','jungle','oceanic','oceanic','oceanic'], remaining: ['jungle','jungle'] },
        lionmen:     { starting: ['desert','desert','desert','desert','desert','mountain'], remaining: repeat('desert', 4) },
        volcanians:  { starting: ['volcanic','volcanic','volcanic','volcanic','mountain','mountain'], remaining: ['volcanic','volcanic'] },
        coralians:   { starting: ['oceanic','oceanic','oceanic','oceanic','glacial','glacial'], remaining: repeat('submerged', 8) },
        arborians:   { starting: ['woodland','woodland','woodland','woodland','woodland','mountain'], remaining: ['woodland','woodland'] },
        magneticans: { starting: ['mountain','mountain','mountain','mountain','woodland','volcanic'], remaining: ['mountain','mountain','mountain'] },
        hawkmen:     { starting: ['mountain','mountain','mountain','oceanic','oceanic','jungle'], remaining: repeat('oceanic', 36) }
    };

    function repeat(val, n) {
        var arr = [];
        for (var i = 0; i < n; i++) arr.push(val);
        return arr;
    }

    var classicColors = {
        oceanic: '#1565C0',
        submerged: '#0D47A1',
        glacial: '#B3E5FC',
        volcanic: '#E65100',
        mountain: '#795548',
        woodland: '#2E7D32',
        desert: '#FFC107',
        jungle: '#388E3C',
        market: '#FFD700'
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

    function getNeighbors(q, r) {
        var n = [];
        for (var i = 0; i < 6; i++) {
            n.push({ q: q + directions[i].q, r: r + directions[i].r });
        }
        return n;
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

    function getHomePositions(ring) {
        var ringHexes = generateRing(ring);
        var spacing = Math.floor(ringHexes.length / 8);
        var positions = [];
        for (var i = 0; i < 8; i++) {
            positions.push(ringHexes[i * spacing]);
        }
        return positions;
    }

    function generate(size, players, seed) {
        var rng = createSeededRng(seed + '_mongo');
        var rings = 6;
        var activeFactions = players > 0 ? Math.min(players, 8) : 8;

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

        board[posKey(0, 0)].type = 'market';

        var capitalBiomes = {
            magneticans: 'mountain', arborians: 'woodland', coralians: 'submerged',
            frigians: 'glacial', volcanians: 'volcanic', tropicans: 'jungle',
            lionmen: 'desert', hawkmen: 'oceanic'
        };

        var homePositions = getHomePositions(4);
        for (var f = 0; f < 8; f++) {
            var hp = homePositions[f];
            var key = posKey(hp.q, hp.r);
            if (board[key]) {
                board[key].type = capitalBiomes[factions[f].id] || 'mountain';
                board[key].faction = factions[f].id;
                board[key].label = factions[f].label;
                board[key].isCapital = true;
            }
        }

        var factionOrder = [];
        for (var f = 0; f < activeFactions; f++) factionOrder.push(f);
        for (var f = activeFactions; f < 8; f++) factionOrder.push(f);

        for (var fi = 0; fi < 8; fi++) {
            var f = factionOrder[fi];
            var faction = factions[f];
            var ft = factionTiles[faction.id];
            var hp = homePositions[f];
            var startingTiles = ft.starting.slice();
            shuffle(startingTiles, rng);

            var neighbors = getNeighbors(hp.q, hp.r);
            shuffle(neighbors, rng);
            var placed = 0;
            for (var n = 0; n < neighbors.length && placed < startingTiles.length; n++) {
                var nk = posKey(neighbors[n].q, neighbors[n].r);
                if (board[nk] && board[nk].type === null) {
                    board[nk].type = startingTiles[placed];
                    board[nk].faction = faction.id;
                    placed++;
                }
            }

            if (placed < startingTiles.length) {
                var ring3 = generateRing(3);
                var ring5 = generateRing(5);
                var extended = ring3.concat(ring5);
                shuffle(extended, rng);
                for (var e = 0; e < extended.length && placed < startingTiles.length; e++) {
                    var ek = posKey(extended[e].q, extended[e].r);
                    if (board[ek] && board[ek].type === null) {
                        var dist = hexDistance(hp.q, hp.r, extended[e].q, extended[e].r);
                        if (dist <= 3) {
                            board[ek].type = startingTiles[placed];
                            board[ek].faction = faction.id;
                            placed++;
                        }
                    }
                }
            }
        }

        for (var fi = 0; fi < 8; fi++) {
            var f = factionOrder[fi];
            var faction = factions[f];
            var ft = factionTiles[faction.id];
            var hp = homePositions[f];
            var remainingTiles = ft.remaining.slice();
            shuffle(remainingTiles, rng);

            var candidates = [];
            for (var key in board) {
                var cell = board[key];
                if (cell.type === null && cell.ring > 0) {
                    var dist = hexDistance(hp.q, hp.r, cell.q, cell.r);
                    candidates.push({ key: key, dist: dist });
                }
            }
            candidates.sort(function(a, b) { return a.dist - b.dist; });

            var placed = 0;
            for (var c = 0; c < candidates.length && placed < remainingTiles.length; c++) {
                var cell = board[candidates[c].key];
                if (cell.type === null) {
                    cell.type = remainingTiles[placed];
                    cell.faction = faction.id;
                    placed++;
                }
            }
        }

        var outerBiomes = ['oceanic', 'oceanic', 'oceanic', 'glacial', 'glacial', 'submerged'];
        var innerBiomes = ['oceanic', 'oceanic', 'submerged', 'desert', 'woodland', 'mountain', 'jungle', 'volcanic'];

        for (var key in board) {
            var cell = board[key];
            if (cell.type === null) {
                if (cell.ring >= 5) {
                    cell.type = outerBiomes[rng.integer(0, outerBiomes.length - 1)];
                } else {
                    cell.type = innerBiomes[rng.integer(0, innerBiomes.length - 1)];
                }
            }
        }

        var tilePools = buildTilePools(rng);

        var hexData = [];
        for (var key in board) {
            var cell = board[key];
            var label = cell.label || cell.type.charAt(0).toUpperCase();
            var id;
            if (cell.q === 0 && cell.r === 0) {
                id = 'R0';
            } else {
                id = 'R' + cell.ring + '_' + key;
            }

            var tile = drawTile(tilePools, cell.type, cell.faction, cell.isCapital);
            var hex = {
                id: id,
                q: cell.q,
                r: cell.r,
                type: cell.type,
                label: label,
                faction: cell.faction || null
            };
            if (tile) {
                hex.tileName = tile.name + ' [' + tile.id + '] — Pop: ' + tile.pop + buildCommodityStr(tile);
                hex.tileId = tile.id;
                if (label.length <= 1) hex.label = tile.name.substring(0, 3);
            }

            hexData.push(hex);
        }

        return hexData;
    }

    function buildCommodityStr(tile) {
        var parts = [];
        if (tile.ice) parts.push(tile.ice + ' ice');
        if (tile.water) parts.push(tile.water + ' water');
        if (tile.food) parts.push(tile.food + ' food');
        if (tile.stone) parts.push(tile.stone + ' stone');
        if (tile.metal) parts.push(tile.metal + ' metal');
        if (tile.mrg) parts.push(tile.mrg + ' energy');
        if (tile.gem) parts.push(tile.gem + ' gems');
        if (parts.length === 0) return '';
        return ' | ' + parts.join(', ');
    }

    function buildTilePools(rng) {
        var tileData = (typeof MongoTiles !== 'undefined') ? MongoTiles : null;
        if (!tileData) return null;

        var pools = {};
        for (var i = 0; i < tileData.tiles.length; i++) {
            var t = tileData.tiles[i];
            var biome = t.biome;
            if (!pools[biome]) pools[biome] = [];
            pools[biome].push(t);
        }
        for (var b in pools) shuffle(pools[b], rng);
        return pools;
    }

    function drawTile(pools, biome, faction, isCapital) {
        if (!pools || !pools[biome]) return null;
        var pool = pools[biome];

        if (isCapital && faction) {
            for (var i = 0; i < pool.length; i++) {
                if (pool[i].faction === faction && pool[i].id.charAt(0) === 'C') {
                    return pool.splice(i, 1)[0];
                }
            }
        }

        if (faction) {
            for (var i = 0; i < pool.length; i++) {
                if (pool[i].faction === faction) {
                    return pool.splice(i, 1)[0];
                }
            }
        }

        for (var i = 0; i < pool.length; i++) {
            if (!pool[i].city) {
                return pool.splice(i, 1)[0];
            }
        }
        if (pool.length > 0) return pool.splice(0, 1)[0];
        return null;
    }

    function hexDistance(q1, r1, q2, r2) {
        return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
    }

    HexApp.registerGame('mongo', {
        label: 'Mongo',
        orientation: 'pointy',
        sizes: [
            { value: 6, label: '6 Rings (127 hexes)' }
        ],
        defaultSize: 6,
        defaultPlayers: 8,
        styles: ['artistic', 'classic', 'kenney', 'realistic'],
        hasEditor: false,

        playerCounts: function() { return [2, 3, 4, 5, 6, 7, 8]; },

        generate: function(size, players, seed) {
            return generate(size, players, seed);
        },

        getColors: function() {
            return classicColors;
        },

        getImages: function(style) {
            if (style === 'classic') return null;
            var base = (typeof window !== 'undefined' && window.location.pathname.indexOf('/generate') !== -1) ? '../' : '';
            var folders = { artistic: 'mongo', kenney: 'mongo-kenney', realistic: 'mongo-realistic' };
            var folder = folders[style];
            if (!folder) return null;
            return {
                oceanic: base + 'img/tiles/' + folder + '/oceanic.png',
                submerged: base + 'img/tiles/' + folder + '/submerged.png',
                glacial: base + 'img/tiles/' + folder + '/glacial.png',
                volcanic: base + 'img/tiles/' + folder + '/volcanic.png',
                mountain: base + 'img/tiles/' + folder + '/mountain.png',
                woodland: base + 'img/tiles/' + folder + '/woodland.png',
                desert: base + 'img/tiles/' + folder + '/desert.png',
                jungle: base + 'img/tiles/' + folder + '/jungle.png',
                market: base + 'img/tiles/' + folder + '/market.png'
            };
        },

        getDescriptions: function() {
            return {
                oceanic: { name: 'Oceanic', desc: 'Deep ocean — naval territory' },
                submerged: { name: 'Submerged', desc: 'Shallow seas — Coralian domain' },
                glacial: { name: 'Glacial', desc: 'Ice fields — Frigian territory' },
                volcanic: { name: 'Volcanic', desc: 'Lava flows — Volcanian homeland' },
                mountain: { name: 'Mountain', desc: 'Rocky peaks — defensive terrain' },
                woodland: { name: 'Woodland', desc: 'Dense forest — Arborian realm' },
                desert: { name: 'Desert', desc: 'Arid wastes — Lionmen domain' },
                jungle: { name: 'Jungle', desc: 'Tropical growth — Tropican territory' },
                market: { name: 'Central Market', desc: 'Ming\'s Palace — trade hub' }
            };
        },

        rendererOptions: function() {
            return { hexSize: 22, flat: false };
        }
    });
})();
