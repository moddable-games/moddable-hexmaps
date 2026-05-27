(function() {
    var layout = {
        R0: { q: 0, r: 0, type: 'rex', label: 'Rex' },
        R1D1: { q: 0, r: 1, type: 'red' },
        R1D2: { q: 1, r: 1, type: 'red' },
        R1D3: { q: 1, r: 0, type: 'red' },
        R1D4: { q: 0, r: -1, type: 'red' },
        R1D5: { q: -1, r: 0, type: 'red' },
        R1D6: { q: -1, r: 1, type: 'red' },
        R2D1: { q: 0, r: 2, type: 'lanes' },
        R2D2: { q: 1, r: 2, type: 'blue' },
        R2D3: { q: 2, r: 1, type: 'lanes' },
        R2D4: { q: 2, r: 0, type: 'blue' },
        R2D5: { q: 2, r: -1, type: 'lanes' },
        R2D6: { q: 1, r: -1, type: 'blue' },
        R2D7: { q: 0, r: -2, type: 'lanes' },
        R2D8: { q: -1, r: -1, type: 'blue' },
        R2D9: { q: -2, r: -1, type: 'lanes' },
        R2D10: { q: -2, r: 0, type: 'blue' },
        R2D11: { q: -2, r: 1, type: 'lanes' },
        R2D12: { q: -1, r: 2, type: 'blue' },
        R3D1: { q: 0, r: 3, type: 'green' },
        R3D2: { q: 1, r: 3, type: 'blue' },
        R3D3: { q: 2, r: 2, type: 'red' },
        R3D4: { q: 3, r: 2, type: 'green' },
        R3D5: { q: 3, r: 1, type: 'blue' },
        R3D6: { q: 3, r: 0, type: 'red' },
        R3D7: { q: 3, r: -1, type: 'green' },
        R3D8: { q: 2, r: -2, type: 'blue' },
        R3D9: { q: 1, r: -2, type: 'red' },
        R3D10: { q: 0, r: -3, type: 'green' },
        R3D11: { q: -1, r: -2, type: 'blue' },
        R3D12: { q: -2, r: -2, type: 'red' },
        R3D13: { q: -3, r: -1, type: 'green' },
        R3D14: { q: -3, r: 0, type: 'blue' },
        R3D15: { q: -3, r: 1, type: 'red' },
        R3D16: { q: -3, r: 2, type: 'green' },
        R3D17: { q: -2, r: 2, type: 'blue' },
        R3D18: { q: -1, r: 3, type: 'red' }
    };

    var classicColors = {
        rex: '#FFD700',
        blue: '#1565C0',
        red: '#C62828',
        green: '#2E7D32',
        lanes: '#37474F',
        legends: '#FF8F00'
    };

    var asciiColors = {
        rex: '#2e2e1a',
        blue: '#0a1a2e',
        red: '#2e0a0a',
        green: '#0a2e0a',
        lanes: '#1a1a1a',
        legends: '#2e1a0a'
    };

    function oddqOffsetToAxial(col, row) {
        var q = col;
        var r = row - Math.floor((col + (col & 1)) / 2);
        return { q: q, r: r };
    }

    HexApp.registerGame('twilight', {
        label: 'Twilight',
        orientation: 'flat',
        sizes: [
            { value: 3, label: '3 Rings (Standard)' }
        ],
        defaultSize: 3,
        defaultPlayers: 6,
        styles: null,
        hasEditor: false,

        playerCounts: function() { return [3, 4, 5, 6]; },

        generate: function(size, players, seed) {
            var hexes = [];
            var keys = Object.keys(layout);
            var rng = createSeededRng(seed + '_twilight');

            var pools = {
                blue: TwilightTiles.blue.slice(),
                red: TwilightTiles.red.slice(),
                green: TwilightTiles.green.slice(),
                lanes: TwilightTiles.lanes.slice()
            };

            function drawTile(pool) {
                if (pool.length === 0) return null;
                var idx = rng.integer(0, pool.length - 1);
                return pool.splice(idx, 1)[0];
            }

            for (var i = 0; i < keys.length; i++) {
                var id = keys[i];
                var def = layout[id];
                var type = def.type;
                var label = def.label || type.charAt(0).toUpperCase();

                if (type !== 'rex' && pools[type]) {
                    var tileName = drawTile(pools[type]);
                    if (tileName) {
                        label = tileName.split('/')[0].split(' ')[0].substring(0, 3);
                    }
                }

                var axial = oddqOffsetToAxial(def.q, def.r);

                hexes.push({
                    id: id,
                    q: axial.q,
                    r: axial.r,
                    type: type,
                    label: label,
                    tileName: type === 'rex' ? 'Mecatol Rex' : (pools[type] ? label : type)
                });
            }

            return hexes;
        },

        getColors: function(style) {
            if (style === 'ascii') return asciiColors;
            return classicColors;
        },

        rendererOptions: function() {
            return { hexSize: 40, flat: true };
        }
    });
})();
