(function() {
    var ringTypes = { 1: 'inner', 2: 'middle', 3: 'river', 4: 'outer', 5: 'dungeon' };

    var terrainPools = {
        inner: [
            'mines', 'den', 'death', 'crypt', 'vampire', 'pits',
            'peril', 'fire'
        ],
        middle: [
            'runes', 'runes', 'runes',
            'temple', 'cave', 'chasm', 'castle', 'woods', 'portal', 'hills', 'glade', 'knight'
        ],
        river: [
            'desert', 'desert', 'desert', 'desert', 'desert', 'desert',
            'river', 'river', 'river', 'river', 'river',
            'river', 'river', 'river', 'river', 'river',
            'oasis', 'valley'
        ],
        outer: [
            'fields', 'fields', 'fields', 'fields', 'fields', 'fields',
            'plains', 'plains', 'plains', 'plains',
            'woods', 'woods', 'woods',
            'hills', 'hills',
            'forest', 'graveyard', 'crags', 'sentinel', 'ruins',
            'city', 'village', 'tavern', 'chapel'
        ],
        dungeon: [
            'cavern', 'cavern', 'cavern', 'cavern',
            'corridor', 'corridor', 'corridor', 'corridor', 'corridor', 'corridor',
            'tunnel', 'tunnel', 'tunnel', 'tunnel', 'tunnel', 'tunnel',
            'vault', 'vault', 'vault',
            'cell', 'entrance', 'guard', 'hall', 'kitchen', 'library',
            'monster', 'summon', 'torture', 'treasure', 'mountains'
        ],
        ending: [
            'crown', 'battle', 'dragon', 'guild', 'eagle', 'demon', 'doom'
        ]
    };

    var classicColors = {
        plains: '#C8E6C9', fields: '#DCEDC8', woods: '#81C784', hills: '#A5D6A7',
        forest: '#388E3C', graveyard: '#78909C', crags: '#8D6E63', sentinel: '#B0BEC5',
        ruins: '#BCAAA4', city: '#90A4AE', village: '#A1887F', tavern: '#D7CCC8',
        chapel: '#CE93D8', river: '#42A5F5', desert: '#FFE0B2', oasis: '#80DEEA',
        valley: '#C5E1A5', runes: '#D1C4E9', temple: '#E1BEE7', cave: '#616161',
        chasm: '#455A64', castle: '#B0BEC5', portal: '#7E57C2', glade: '#81C784',
        knight: '#FFB74D', mines: '#5D4037', den: '#4E342E', death: '#212121',
        crypt: '#37474F', vampire: '#880E4F', pits: '#3E2723', peril: '#E65100',
        fire: '#FF6F00', cavern: '#424242', corridor: '#616161', tunnel: '#757575',
        vault: '#FFC107', cell: '#455A64', entrance: '#78909C', guard: '#546E7A',
        hall: '#607D8B', kitchen: '#8D6E63', library: '#5C6BC0', monster: '#B71C1C',
        summon: '#6A1B9A', torture: '#4A148C', treasure: '#FFC107', mountains: '#795548',
        crown: '#FFD700', battle: '#C62828', dragon: '#FF6F00', guild: '#1565C0',
        eagle: '#0277BD', demon: '#880E4F', doom: '#311B92'
    };

    function buildHexes(rings, seed) {
        var hexes = [];
        var rng = createSeededRng(seed + '_talisman_' + rings);
        var grid = HexMath.generateHexGrid(rings);

        for (var i = 0; i < grid.length; i++) {
            var h = grid[i];
            var type;
            if (h.ring === 0) {
                var endingPool = terrainPools.ending;
                type = endingPool[rng.integer(0, endingPool.length - 1)];
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
        styles: ['classic', 'artistic'],
        hasEditor: false,

        playerCounts: function() { return []; },

        generate: function(size, players, seed) {
            return buildHexes(size, seed);
        },

        getColors: function() {
            return classicColors;
        },

        getImages: function(style) {
            if (style !== 'artistic') return null;
            var base = (typeof window !== 'undefined' && window.location.pathname.indexOf('/generate') !== -1) ? '../' : '';
            var allTiles = {};
            var allTypes = Object.keys(classicColors);
            for (var i = 0; i < allTypes.length; i++) {
                allTiles[allTypes[i]] = base + 'img/tiles/talisman/' + allTypes[i] + '.png';
            }
            return allTiles;
        },

        rendererOptions: function() {
            return { hexSize: 40, flat: false };
        }
    });
})();
