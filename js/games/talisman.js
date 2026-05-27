(function() {
    var ringTypes = { 1: 'inner', 2: 'middle', 3: 'river', 4: 'outer', 5: 'dungeon' };

    var terrainPools = {
        inner: ['plains', 'desert', 'ruins', 'temple', 'glade', 'castle'],
        middle: ['plains', 'desert', 'ruins', 'oasis', 'fields', 'runes'],
        river: ['river'],
        outer: ['plains', 'forest', 'desert', 'ruins', 'fields', 'treasure'],
        dungeon: ['dungeon']
    };

    var classicColors = {
        inner: '#CE93D8',
        middle: '#90CAF9',
        river: '#42A5F5',
        outer: '#A5D6A7',
        dungeon: '#616161',
        ending: '#FFD700',
        plains: '#C8E6C9',
        desert: '#FFE0B2',
        ruins: '#BCAAA4',
        temple: '#E1BEE7',
        glade: '#81C784',
        castle: '#B0BEC5',
        oasis: '#80DEEA',
        fields: '#DCEDC8',
        runes: '#D1C4E9',
        forest: '#388E3C',
        treasure: '#FFC107'
    };

    var asciiColors = {
        inner: '#2a1a2e',
        middle: '#1a2a2e',
        river: '#1a1a2e',
        outer: '#1a2e1a',
        dungeon: '#1a1a1a',
        ending: '#2e2e1a',
        plains: '#1a2e1a',
        desert: '#2e2e1a',
        ruins: '#2e2a1a',
        temple: '#2a1a2e',
        glade: '#1a2e1a',
        castle: '#1a1a2e',
        oasis: '#1a2a2e',
        fields: '#1a2e20',
        runes: '#2a1a2e',
        forest: '#0a2e0a',
        treasure: '#2e2e1a'
    };

    function buildHexes(rings, seed) {
        var hexes = [];
        var rng = createSeededRng(seed + '_talisman_' + rings);
        var grid = HexMath.generateHexGrid(rings);

        for (var i = 0; i < grid.length; i++) {
            var h = grid[i];
            var type;
            if (h.ring === 0) {
                type = 'ending';
            } else {
                var ringName = ringTypes[h.ring] || 'outer';
                var pool = terrainPools[ringName];
                type = pool[rng.integer(0, pool.length - 1)];
            }
            hexes.push({
                id: 'R' + h.ring + 'D' + i,
                q: h.q,
                r: h.r,
                type: type,
                label: type.charAt(0).toUpperCase()
            });
        }

        return hexes;
    }

    HexApp.registerGame('talisman', {
        label: 'Talisman',
        orientation: 'pointy',
        sizes: [
            { value: 4, label: '4 Rings (Standard)' },
            { value: 5, label: '5 Rings (Dungeon Expansion)' }
        ],
        defaultSize: 4,
        defaultPlayers: 0,
        styles: null,
        hasEditor: false,

        playerCounts: function() { return []; },

        generate: function(size, players, seed) {
            return buildHexes(size, seed);
        },

        getColors: function(style) {
            if (style === 'ascii') return asciiColors;
            return classicColors;
        },

        rendererOptions: function() {
            return { hexSize: 40, flat: false };
        }
    });
})();
