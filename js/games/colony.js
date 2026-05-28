(function() {

    var terrainPool = {
        base: [
            { type: 'forest', count: 4 },
            { type: 'pasture', count: 4 },
            { type: 'fields', count: 4 },
            { type: 'hills', count: 3 },
            { type: 'mountains', count: 3 },
            { type: 'desert', count: 1 }
        ],
        expanded: [
            { type: 'forest', count: 6 },
            { type: 'pasture', count: 6 },
            { type: 'fields', count: 6 },
            { type: 'hills', count: 5 },
            { type: 'mountains', count: 5 },
            { type: 'desert', count: 2 }
        ]
    };

    var numberTokens = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
    var expandedTokens = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12];

    var tokenColors = {
        6: '#C62828',
        8: '#C62828'
    };

    var classicColors = {
        forest: '#2E7D32',
        pasture: '#8BC34A',
        fields: '#FDD835',
        hills: '#D84315',
        mountains: '#616161',
        desert: '#FFF8E1',
        sea: '#1565C0'
    };

    function generateRing(radius) {
        if (radius === 0) return [{ q: 0, r: 0 }];
        var results = [];
        var directions = [
            { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
            { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
        ];
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

    function buildPool(poolDef) {
        var tiles = [];
        for (var i = 0; i < poolDef.length; i++) {
            for (var j = 0; j < poolDef[i].count; j++) {
                tiles.push(poolDef[i].type);
            }
        }
        return tiles;
    }

    function getNeighborKeys(q, r) {
        var dirs = [
            { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
            { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
        ];
        var keys = [];
        for (var i = 0; i < dirs.length; i++) {
            keys.push((q + dirs[i].q) + ',' + (r + dirs[i].r));
        }
        return keys;
    }

    var layouts = {
        'standard': {
            label: 'Standard (3-4 Players)',
            rings: 2,
            pool: 'base',
            tokens: numberTokens
        },
        'expanded': {
            label: 'Expanded (5-6 Players)',
            rings: 3,
            pool: 'expanded',
            tokens: expandedTokens
        }
    };

    HexApp.registerGame('colony', {
        label: 'Colony',
        orientation: 'pointy',
        sizes: [
            { value: 2, label: 'Standard' }
        ],
        defaultSize: 2,
        defaultPlayers: 0,
        styles: ['artistic', 'classic'],
        labels: false,
        hasEditor: false,
        layouts: [
            { value: 'standard', label: 'Standard (3-4 Players)' },
            { value: 'expanded', label: 'Expanded (5-6 Players)' }
        ],
        defaultLayout: 'standard',

        playerCounts: function() { return []; },

        generate: function(size, players, seed, selectedLayout) {
            var layoutDef = layouts[selectedLayout] || layouts['standard'];
            var rng = createSeededRng(seed + '_colony');

            var positions = [];
            for (var ring = 0; ring <= layoutDef.rings; ring++) {
                var hexes = generateRing(ring);
                for (var i = 0; i < hexes.length; i++) {
                    positions.push({ q: hexes[i].q, r: hexes[i].r, ring: ring });
                }
            }

            var tiles = buildPool(terrainPool[layoutDef.pool]);
            for (var i = tiles.length - 1; i > 0; i--) {
                var j = rng.integer(0, i);
                var tmp = tiles[i];
                tiles[i] = tiles[j];
                tiles[j] = tmp;
            }

            var tokens = layoutDef.tokens.slice();
            for (var i = tokens.length - 1; i > 0; i--) {
                var j = rng.integer(0, i);
                var tmp = tokens[i];
                tokens[i] = tokens[j];
                tokens[j] = tmp;
            }

            var base = (typeof window !== 'undefined' && window.location.pathname.indexOf('/generate') !== -1) ? '../' : '';
            var hexData = [];
            var tokenIdx = 0;

            for (var i = 0; i < positions.length; i++) {
                var pos = positions[i];
                var type = tiles[i] || 'desert';
                var id = 'R' + pos.ring + 'D' + (i + 1);
                if (pos.ring === 0) id = 'R0';

                var hex = {
                    id: id,
                    q: pos.q,
                    r: pos.r,
                    type: type,
                    label: type.charAt(0).toUpperCase(),
                    tileName: type,
                    imagePath: base + 'img/tiles/colony/' + type + '.png'
                };

                if (type !== 'desert' && tokenIdx < tokens.length) {
                    var num = tokens[tokenIdx];
                    hex.overlay = {
                        text: String(num),
                        color: tokenColors[num] || '#FFF8E1',
                        size: 0.35
                    };
                    tokenIdx++;
                }

                hexData.push(hex);
            }

            return hexData;
        },

        constraints: function(hexData) {
            var hexMap = {};
            for (var i = 0; i < hexData.length; i++) {
                hexMap[hexData[i].q + ',' + hexData[i].r] = hexData[i];
            }

            for (var i = 0; i < hexData.length; i++) {
                var hex = hexData[i];
                if (!hex.overlay) continue;
                var num = parseInt(hex.overlay.text);
                if (num !== 6 && num !== 8) continue;

                var neighbors = getNeighborKeys(hex.q, hex.r);
                for (var j = 0; j < neighbors.length; j++) {
                    var neighbor = hexMap[neighbors[j]];
                    if (neighbor && neighbor.overlay) {
                        var nNum = parseInt(neighbor.overlay.text);
                        if (nNum === 6 || nNum === 8) return false;
                    }
                }
            }
            return true;
        },

        getColors: function() {
            return classicColors;
        },

        getImages: function(style) {
            if (style !== 'artistic') return null;
            var base = (typeof window !== 'undefined' && window.location.pathname.indexOf('/generate') !== -1) ? '../' : '';
            return {
                forest: base + 'img/tiles/colony/forest.png',
                pasture: base + 'img/tiles/colony/pasture.png',
                fields: base + 'img/tiles/colony/fields.png',
                hills: base + 'img/tiles/colony/hills.png',
                mountains: base + 'img/tiles/colony/mountains.png',
                desert: base + 'img/tiles/colony/desert.png'
            };
        },

        rendererOptions: function() {
            return { hexSize: 50, flat: false };
        }
    });
})();
