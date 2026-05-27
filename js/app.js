var HexApp = (function() {
    var renderer = null;
    var currentGame = null;
    var currentSeed = null;
    var currentSize = null;
    var currentPlayers = 0;
    var hexData = [];

    function init() {
        var params = new URLSearchParams(window.location.search);
        var game = params.get('game') || 'nukes';
        var seed = params.get('seed') || String(Math.floor(Date.now() / 9876));
        var size = parseInt(params.get('size')) || null;
        var players = parseInt(params.get('players')) || 0;

        currentGame = game;
        currentSeed = seed;

        document.getElementById('seed-input').value = seed;

        setupGameSelector(game);
        loadGame(game, size, players);
        setupControls();
    }

    function setupGameSelector(activeGame) {
        var buttons = document.querySelectorAll('[data-game]');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('active');
            if (buttons[i].getAttribute('data-game') === activeGame) {
                buttons[i].classList.add('active');
            }
            buttons[i].addEventListener('click', function() {
                var game = this.getAttribute('data-game');
                switchGame(game);
            });
        }
    }

    function setupControls() {
        var seedInput = document.getElementById('seed-input');
        seedInput.addEventListener('input', function() {
            currentSeed = this.value || String(Math.floor(Date.now() / 9876));
            regenerateMap();
            updateUrl();
        });

        var sizeSelect = document.getElementById('size-select');
        sizeSelect.addEventListener('change', function() {
            currentSize = parseInt(this.value);
            currentPlayers = 0;
            updatePlayersForSize();
            regenerateMap();
            updateUrl();
        });

        var playersSelect = document.getElementById('players-select');
        playersSelect.addEventListener('change', function() {
            currentPlayers = parseInt(this.value) || 0;
            regenerateMap();
            updateUrl();
        });

        var randomBtn = document.getElementById('random-btn');
        randomBtn.addEventListener('click', function() {
            currentSeed = String(Math.floor(Date.now() / 9876));
            document.getElementById('seed-input').value = currentSeed;
            regenerateMap();
            updateUrl();
        });

        var exportBtn = document.getElementById('export-btn');
        exportBtn.addEventListener('click', function() {
            exportMap();
        });
    }

    function switchGame(game) {
        currentGame = game;
        currentPlayers = 0;
        document.getElementById('players-select').value = '0';

        var buttons = document.querySelectorAll('[data-game]');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('active');
            if (buttons[i].getAttribute('data-game') === game) {
                buttons[i].classList.add('active');
            }
        }

        loadGame(game, null, 0);
        updateUrl();
    }

    function loadGame(game, size, players) {
        var sizeSelect = document.getElementById('size-select');
        var playersSelect = document.getElementById('players-select');

        sizeSelect.innerHTML = '';
        playersSelect.innerHTML = '<option value="0">No bases</option>';

        if (game === 'nukes') {
            loadNukes(size, players, sizeSelect, playersSelect);
        } else if (game === 'talisman') {
            loadTalisman(size, players, sizeSelect, playersSelect);
        } else if (game === 'twilight') {
            loadTwilight(size, players, sizeSelect, playersSelect);
        }
    }

    function loadNukes(size, players, sizeSelect, playersSelect) {
        var sizes = [2, 3, 4, 5, 6];
        for (var i = 0; i < sizes.length; i++) {
            var opt = document.createElement('option');
            opt.value = sizes[i];
            opt.textContent = sizes[i] + ' Rings (' + (sizes[i] * 6) + ' hexes)';
            sizeSelect.appendChild(opt);
        }

        currentSize = size || 6;
        sizeSelect.value = currentSize;

        var mapData = NukesHexData.maps['r' + currentSize];
        if (mapData && mapData.bases) {
            var playerCounts = Object.keys(mapData.bases).map(function(k) {
                return parseInt(k.substring(1));
            });
            for (var i = 0; i < playerCounts.length; i++) {
                var opt = document.createElement('option');
                opt.value = playerCounts[i];
                opt.textContent = playerCounts[i] + ' Players';
                playersSelect.appendChild(opt);
            }
        }

        currentPlayers = players || 0;
        playersSelect.value = currentPlayers;

        renderer = HexRenderer.create('hex-canvas', {
            hexSize: 40,
            flat: false,
            colors: {
                water: '#2196F3',
                trees: '#4CAF50',
                mount: '#795548',
                grass: '#8BC34A',
                sand: '#FFC107',
                base: '#F44336'
            },
            labels: true,
            onHexClick: onHexClick,
            onHexHover: onHexHover
        });

        regenerateMap();
    }

    function loadTalisman(size, players, sizeSelect, playersSelect) {
        var opt4 = document.createElement('option');
        opt4.value = 4;
        opt4.textContent = '4 Rings (Standard)';
        sizeSelect.appendChild(opt4);

        var opt5 = document.createElement('option');
        opt5.value = 5;
        opt5.textContent = '5 Rings (Dungeon Expansion)';
        sizeSelect.appendChild(opt5);

        currentSize = size || 4;
        sizeSelect.value = currentSize;

        renderer = HexRenderer.create('hex-canvas', {
            hexSize: 40,
            flat: false,
            colors: {
                inner: '#CE93D8',
                middle: '#90CAF9',
                river: '#42A5F5',
                outer: '#A5D6A7',
                dungeon: '#616161',
                ending: '#FFD700'
            },
            labels: true,
            onHexClick: onHexClick,
            onHexHover: onHexHover
        });

        regenerateMap();
    }

    function loadTwilight(size, players, sizeSelect, playersSelect) {
        var opt = document.createElement('option');
        opt.value = 3;
        opt.textContent = '3 Rings (Standard)';
        sizeSelect.appendChild(opt);
        currentSize = 3;
        sizeSelect.value = 3;

        var playerCounts = [3, 4, 5, 6];
        for (var i = 0; i < playerCounts.length; i++) {
            var popt = document.createElement('option');
            popt.value = playerCounts[i];
            popt.textContent = playerCounts[i] + ' Players';
            playersSelect.appendChild(popt);
        }
        currentPlayers = players || 6;
        playersSelect.value = currentPlayers;

        renderer = HexRenderer.create('hex-canvas', {
            hexSize: 40,
            flat: true,
            colors: {
                rex: '#FFD700',
                blue: '#1565C0',
                red: '#C62828',
                green: '#2E7D32',
                lanes: '#37474F',
                legends: '#FF8F00'
            },
            labels: true,
            onHexClick: onHexClick,
            onHexHover: onHexHover
        });

        regenerateMap();
    }

    function regenerateMap() {
        if (currentGame === 'nukes') {
            hexData = generateNukesMap();
        } else if (currentGame === 'talisman') {
            hexData = generateTalismanMap();
        } else if (currentGame === 'twilight') {
            hexData = generateTwilightMap();
        }

        if (renderer) {
            HexRenderer.setHexes(renderer, hexData);
        }

        updateInfo();
    }

    function offsetToAxial(col, row) {
        var q = col - Math.floor((row - (row & 1)) / 2);
        var r = row;
        return { q: q, r: r };
    }

    function generateNukesMap() {
        var mapDef = NukesHexData.maps['r' + currentSize];
        if (!mapDef) return [];

        var terrains = NukesHexData.terrains;
        var hexes = [];
        var baseIds = [];

        if (currentPlayers > 0 && mapDef.bases['p' + currentPlayers]) {
            baseIds = mapDef.bases['p' + currentPlayers];
        }

        var centreHex = mapDef.hexes.R0;
        var centreAxial = offsetToAxial(centreHex.q, centreHex.r);

        var keys = Object.keys(mapDef.hexes);
        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var coords = mapDef.hexes[id];
            var type;

            if (baseIds.indexOf(id) !== -1) {
                type = 'base';
            } else {
                type = terrains[seededRandom(id, currentSeed, 0, terrains.length - 1)];
            }

            var axial = offsetToAxial(coords.q, coords.r);

            hexes.push({
                id: id,
                q: axial.q - centreAxial.q,
                r: axial.r - centreAxial.r,
                type: type,
                label: type.charAt(0).toUpperCase()
            });
        }

        return hexes;
    }

    function generateTalismanMap() {
        var mapKey = 'r' + currentSize;
        var talismanMaps = {
            r4: buildTalismanHexes(4),
            r5: buildTalismanHexes(5)
        };

        return talismanMaps[mapKey] || talismanMaps.r4;
    }

    function buildTalismanHexes(rings) {
        var ringTypes = { 1: 'inner', 2: 'middle', 3: 'river', 4: 'outer', 5: 'dungeon' };
        var hexes = [];

        var grid = HexMath.generateHexGrid(rings);
        for (var i = 0; i < grid.length; i++) {
            var h = grid[i];
            var type;
            if (h.ring === 0) {
                type = 'ending';
            } else {
                type = ringTypes[h.ring] || 'outer';
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

    function oddqOffsetToAxial(col, row) {
        var q = col;
        var r = row - Math.floor((col + (col & 1)) / 2);
        return { q: q, r: r };
    }

    function generateTwilightMap() {
        var hexes = [];
        var layout = getTwilightLayout();
        var keys = Object.keys(layout);

        for (var i = 0; i < keys.length; i++) {
            var id = keys[i];
            var def = layout[id];
            var type = def.type;

            if (type !== 'rex' && id.indexOf('R1') !== 0) {
                if (def.type === 'lanes') {
                    type = 'lanes';
                } else if (def.type === 'legends') {
                    type = 'legends';
                }
            }

            var axial = oddqOffsetToAxial(def.q, def.r);

            hexes.push({
                id: id,
                q: axial.q,
                r: axial.r,
                type: type,
                label: def.label || type.charAt(0).toUpperCase()
            });
        }

        return hexes;
    }

    function getTwilightLayout() {
        return {
            R0: { q: 0, r: 0, type: "rex", label: "Rex" },
            R1D1: { q: 0, r: 1, type: "red" },
            R1D2: { q: 1, r: 1, type: "red" },
            R1D3: { q: 1, r: 0, type: "red" },
            R1D4: { q: 0, r: -1, type: "red" },
            R1D5: { q: -1, r: 0, type: "red" },
            R1D6: { q: -1, r: 1, type: "red" },
            R2D1: { q: 0, r: 2, type: "lanes" },
            R2D2: { q: 1, r: 2, type: "blue" },
            R2D3: { q: 2, r: 1, type: "lanes" },
            R2D4: { q: 2, r: 0, type: "blue" },
            R2D5: { q: 2, r: -1, type: "lanes" },
            R2D6: { q: 1, r: -1, type: "blue" },
            R2D7: { q: 0, r: -2, type: "lanes" },
            R2D8: { q: -1, r: -1, type: "blue" },
            R2D9: { q: -2, r: -1, type: "lanes" },
            R2D10: { q: -2, r: 0, type: "blue" },
            R2D11: { q: -2, r: 1, type: "lanes" },
            R2D12: { q: -1, r: 2, type: "blue" },
            R3D1: { q: 0, r: 3, type: "green" },
            R3D2: { q: 1, r: 3, type: "blue" },
            R3D3: { q: 2, r: 2, type: "red" },
            R3D4: { q: 3, r: 2, type: "green" },
            R3D5: { q: 3, r: 1, type: "blue" },
            R3D6: { q: 3, r: 0, type: "red" },
            R3D7: { q: 3, r: -1, type: "green" },
            R3D8: { q: 2, r: -2, type: "blue" },
            R3D9: { q: 1, r: -2, type: "red" },
            R3D10: { q: 0, r: -3, type: "green" },
            R3D11: { q: -1, r: -2, type: "blue" },
            R3D12: { q: -2, r: -2, type: "red" },
            R3D13: { q: -3, r: -1, type: "green" },
            R3D14: { q: -3, r: 0, type: "blue" },
            R3D15: { q: -3, r: 1, type: "red" },
            R3D16: { q: -3, r: 2, type: "green" },
            R3D17: { q: -2, r: 2, type: "blue" },
            R3D18: { q: -1, r: 3, type: "red" }
        };
    }

    function onHexClick(hex) {
        if (currentGame === 'nukes') {
            var terrain = NukesHexData.terrains;
            var editTypes = ['water', 'grass', 'trees', 'mount', 'sand', 'base'];
            var currentIdx = editTypes.indexOf(hex.type);
            var nextIdx = (currentIdx + 1) % editTypes.length;
            hex.type = editTypes[nextIdx];
            hex.label = hex.type.charAt(0).toUpperCase();
            HexRenderer.render(renderer);
        }
        updateInfo();
    }

    function onHexHover(hex) {
        var info = document.getElementById('hex-info');
        if (info) {
            info.textContent = hex.id + ' (' + hex.q + ',' + hex.r + ') — ' + hex.type;
        }
    }

    function updateInfo() {
        var info = document.getElementById('map-info');
        if (info) {
            info.textContent = hexData.length + ' hexes | Seed: ' + currentSeed;
        }
    }

    function updatePlayersForSize() {
        var playersSelect = document.getElementById('players-select');
        playersSelect.innerHTML = '<option value="0">No bases</option>';

        if (currentGame === 'nukes') {
            var mapData = NukesHexData.maps['r' + currentSize];
            if (mapData && mapData.bases) {
                var playerCounts = Object.keys(mapData.bases).map(function(k) {
                    return parseInt(k.substring(1));
                });
                for (var i = 0; i < playerCounts.length; i++) {
                    var opt = document.createElement('option');
                    opt.value = playerCounts[i];
                    opt.textContent = playerCounts[i] + ' Players';
                    playersSelect.appendChild(opt);
                }
            }
        }
        playersSelect.value = '0';
    }

    function updateUrl() {
        var params = new URLSearchParams();
        params.set('game', currentGame);
        params.set('seed', currentSeed);
        if (currentSize) params.set('size', currentSize);
        if (currentPlayers) params.set('players', currentPlayers);
        var newUrl = window.location.pathname + '?' + params.toString();
        window.history.replaceState({}, '', newUrl);
    }

    function exportMap() {
        var data = {
            game: currentGame,
            seed: currentSeed,
            size: currentSize,
            players: currentPlayers,
            hexes: hexData.map(function(h) {
                return { id: h.id, q: h.q, r: h.r, type: h.type };
            })
        };
        var json = JSON.stringify(data, null, 2);

        var textarea = document.getElementById('export-data');
        if (textarea) {
            textarea.value = json;
            textarea.select();
            document.execCommand('copy');
        }
    }

    return { init: init };
})();

document.addEventListener('DOMContentLoaded', HexApp.init);
