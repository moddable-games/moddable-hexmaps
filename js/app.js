var HexApp = (function() {
    var renderer = null;
    var currentGame = null;
    var currentSeed = null;
    var currentSize = null;
    var currentPlayers = 0;
    var currentStyle = 'classic';
    var hexData = [];

    var embedMode = false;
    var viewOnly = false;

    function init() {
        var params = new URLSearchParams(window.location.search);
        var game = params.get('game') || 'nukes';
        var seed = params.get('seed') || String(Math.floor(Date.now() / 9876));
        var size = parseInt(params.get('size')) || null;
        var players = parseInt(params.get('players')) || 0;
        currentStyle = params.get('theme') || params.get('style') || 'classic';

        var boardOnly = params.get('boardonly') === '1';
        var bgColor = params.get('bg');
        var mode = params.get('mode');

        embedMode = boardOnly;
        viewOnly = mode === 'view' || (boardOnly && mode !== 'edit');

        currentGame = game;
        currentSeed = seed;

        if (embedMode) {
            applyEmbedMode(bgColor);
        }

        document.getElementById('seed-input').value = seed;

        setupGameSelector(game);
        loadGame(game, size, players);
        setupControls();
        buildEditorPanel();
        applyStyle();

        if (game !== 'nukes') {
            document.getElementById('style-group').style.display = 'none';
            document.querySelector('[data-tab="editor"]').style.display = 'none';
        }

        if (embedMode) {
            setTimeout(function() { HexRenderer.resize(renderer); }, 50);
            window.addEventListener('load', function() { HexRenderer.resize(renderer); });
        }

        // Small bridge for embedding apps (e.g. Nukes) to import map JSON.
        // Parent can postMessage({ type: 'hexmaps:requestExport' }) and receive
        // { type: 'hexmaps:export', mapData: <nukes ring-format> }.
        initEmbedBridge();
    }

    function applyEmbedMode(bgColor) {
        document.body.classList.add('embed-mode');

        var nav = document.querySelector('.site-nav');
        var sidebar = document.querySelector('.sidebar');
        var footer = document.querySelector('.site-footer');
        var gameTabs = document.querySelector('.game-tabs-bar');
        var canvasFooter = document.querySelector('.canvas-footer');

        if (nav) nav.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        if (footer) footer.style.display = 'none';
        if (gameTabs) gameTabs.style.display = 'none';
        if (canvasFooter) canvasFooter.style.display = 'none';

        if (bgColor) {
            var color = bgColor.match(/^[0-9a-fA-F]{3,8}$/) ? '#' + bgColor : bgColor;
            document.body.style.background = color;
            document.querySelector('.canvas-area').style.background = color;
        }
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
        setupSidebarTabs();

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
            buildEditorPanel();
        });

        var playersSelect = document.getElementById('players-select');
        playersSelect.addEventListener('change', function() {
            currentPlayers = parseInt(this.value) || 0;
            regenerateMap();
            updateUrl();
        });

        var styleSelect = document.getElementById('style-select');
        styleSelect.value = currentStyle;
        styleSelect.addEventListener('change', function() {
            currentStyle = this.value;
            applyStyle();
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

        var importBtn = document.getElementById('import-btn');
        importBtn.addEventListener('click', function() {
            importMap();
        });

        var copyBtn = document.getElementById('copy-btn');
        copyBtn.addEventListener('click', function() {
            var textarea = document.getElementById('export-data');
            if (textarea.value) {
                navigator.clipboard.writeText(textarea.value);
            }
        });
    }

    function setupSidebarTabs() {
        var tabs = document.querySelectorAll('.sidebar-tab');
        var panels = document.querySelectorAll('.sidebar-panel');

        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function() {
                var target = this.getAttribute('data-tab');
                for (var j = 0; j < tabs.length; j++) {
                    tabs[j].classList.remove('active');
                }
                for (var j = 0; j < panels.length; j++) {
                    panels[j].classList.remove('active');
                }
                this.classList.add('active');
                document.getElementById('panel-' + target).classList.add('active');
            });
        }
    }

    function buildEditorPanel() {
        var container = document.getElementById('ring-resets');
        container.innerHTML = '';

        if (currentGame !== 'nukes') {
            container.innerHTML = '<p class="editor-hint">Click hexes to cycle terrain type.</p>';
            return;
        }

        var terrainOptions = [
            { value: '', label: 'No change' },
            { value: 'grass', label: 'Fields' },
            { value: 'trees', label: 'Forests' },
            { value: 'mount', label: 'Mountains' },
            { value: 'water', label: 'Water' },
            { value: 'sand', label: 'Desert' }
        ];

        for (var ring = 0; ring <= currentSize; ring++) {
            var group = document.createElement('div');
            group.className = 'ring-reset-group';

            var label = document.createElement('label');
            label.textContent = ring === 0 ? 'Centre Hex' : 'Ring ' + ring;

            var select = document.createElement('select');
            select.setAttribute('data-ring', ring);

            for (var t = 0; t < terrainOptions.length; t++) {
                var opt = document.createElement('option');
                opt.value = terrainOptions[t].value;
                opt.textContent = terrainOptions[t].label;
                select.appendChild(opt);
            }

            select.addEventListener('change', function() {
                var ringNum = parseInt(this.getAttribute('data-ring'));
                var terrain = this.value;
                if (terrain) {
                    resetRingTerrain(ringNum, terrain);
                }
            });

            group.appendChild(label);
            group.appendChild(select);
            container.appendChild(group);
        }
    }

    function resetRingTerrain(ring, terrain) {
        for (var i = 0; i < hexData.length; i++) {
            var hex = hexData[i];
            var hexRing = getHexRing(hex.id);
            if (hexRing === ring) {
                hex.type = terrain;
                hex.label = terrain.charAt(0).toUpperCase();
            }
        }
        if (renderer) {
            HexRenderer.render(renderer);
        }
    }

    function getHexRing(id) {
        if (id === 'R0') return 0;
        var match = id.match(/^R(\d+)D/);
        return match ? parseInt(match[1]) : -1;
    }

    function importMap() {
        var textarea = document.getElementById('import-data');
        var json = textarea.value.trim();
        if (!json) return;

        try {
            var data = JSON.parse(json);
            if (Array.isArray(data)) {
                importRingFormat(data);
            } else if (data.hexes && Array.isArray(data.hexes)) {
                importHexFormat(data);
            }
        } catch (e) {
            textarea.style.borderColor = '#C62828';
            setTimeout(function() { textarea.style.borderColor = ''; }, 1500);
        }
    }

    function importRingFormat(data) {
        for (var ring = 0; ring < data.length; ring++) {
            if (!Array.isArray(data[ring])) continue;
            for (var h = 0; h < data[ring].length; h++) {
                var entry = data[ring][h];
                for (var i = 0; i < hexData.length; i++) {
                    if (hexData[i].id === entry.id) {
                        hexData[i].type = entry.t;
                        hexData[i].label = entry.t.charAt(0).toUpperCase();
                        break;
                    }
                }
            }
        }
        if (renderer) {
            HexRenderer.render(renderer);
        }
    }

    function importHexFormat(data) {
        if (data.game) currentGame = data.game;
        if (data.seed) {
            currentSeed = data.seed;
            document.getElementById('seed-input').value = currentSeed;
        }
        if (data.size) {
            currentSize = data.size;
            document.getElementById('size-select').value = currentSize;
        }

        hexData = [];
        for (var i = 0; i < data.hexes.length; i++) {
            var h = data.hexes[i];
            hexData.push({
                id: h.id,
                q: h.q,
                r: h.r,
                type: h.type,
                label: h.type.charAt(0).toUpperCase()
            });
        }

        if (renderer) {
            HexRenderer.setHexes(renderer, hexData);
        }
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

        var editorTab = document.querySelector('[data-tab="editor"]');
        var styleGroup = document.getElementById('style-group');

        if (game === 'nukes') {
            editorTab.style.display = '';
            styleGroup.style.display = '';
        } else {
            editorTab.style.display = 'none';
            styleGroup.style.display = 'none';
            var activeTab = document.querySelector('.sidebar-tab.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'editor') {
                document.querySelector('[data-tab="random"]').click();
            }
        }

        loadGame(game, null, 0);
        buildEditorPanel();
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
        var terrainPools = {
            inner: ['plains', 'desert', 'ruins', 'temple', 'glade', 'castle'],
            middle: ['plains', 'desert', 'ruins', 'oasis', 'fields', 'runes'],
            river: ['river'],
            outer: ['plains', 'forest', 'desert', 'ruins', 'fields', 'treasure'],
            dungeon: ['dungeon']
        };
        var hexes = [];
        var rng = createSeededRng(currentSeed + '_talisman_' + rings);

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

    function oddqOffsetToAxial(col, row) {
        var q = col;
        var r = row - Math.floor((col + (col & 1)) / 2);
        return { q: q, r: r };
    }

    function generateTwilightMap() {
        var hexes = [];
        var layout = getTwilightLayout();
        var keys = Object.keys(layout);

        var rng = createSeededRng(currentSeed + '_twilight');
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
        if (viewOnly) return;
        if (currentGame === 'nukes') {
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
            var name = hex.tileName || hex.type;
            info.textContent = hex.id + ' (' + hex.q + ',' + hex.r + ') — ' + name;
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
        if (embedMode) return;
        var params = new URLSearchParams();
        params.set('game', currentGame);
        params.set('seed', currentSeed);
        if (currentSize) params.set('size', currentSize);
        if (currentPlayers) params.set('players', currentPlayers);
        if (currentStyle && currentStyle !== 'classic') params.set('style', currentStyle);
        var newUrl = window.location.pathname + '?' + params.toString();
        window.history.replaceState({}, '', newUrl);
    }

    function applyStyle() {
        if (!renderer) return;

        if (currentStyle === 'classic') {
            renderer.colors = getClassicColors();
            renderer.labels = true;
        } else if (currentStyle === 'ascii') {
            renderer.colors = getAsciiColors();
            renderer.labels = true;
        } else if (currentStyle === 'artistic') {
            renderer.colors = getClassicColors();
            renderer.labels = false;
        }

        HexRenderer.render(renderer);
    }

    function getClassicColors() {
        if (currentGame === 'nukes') {
            return {
                water: '#2196F3',
                trees: '#4CAF50',
                mount: '#795548',
                grass: '#8BC34A',
                sand: '#FFC107',
                base: '#F44336'
            };
        } else if (currentGame === 'talisman') {
            return {
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
        } else {
            return {
                rex: '#FFD700',
                blue: '#1565C0',
                red: '#C62828',
                green: '#2E7D32',
                lanes: '#37474F',
                legends: '#FF8F00'
            };
        }
    }

    function getAsciiColors() {
        return {
            water: '#1a1a2e',
            trees: '#1a2e1a',
            mount: '#2e2a1a',
            grass: '#1a2e20',
            sand: '#2e2e1a',
            base: '#2e1a1a',
            inner: '#2a1a2e',
            middle: '#1a2a2e',
            river: '#1a1a2e',
            outer: '#1a2e1a',
            dungeon: '#1a1a1a',
            ending: '#2e2e1a',
            rex: '#2e2e1a',
            blue: '#0a1a2e',
            red: '#2e0a0a',
            green: '#0a2e0a',
            lanes: '#1a1a1a',
            legends: '#2e1a0a'
        };
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
        }
    }

    function normalizeNukesTerrain(type) {
        if (!type) return 'fields';
        var t = String(type).toLowerCase();
        if (t === 'grass') return 'fields';
        if (t === 'trees') return 'forests';
        if (t === 'mount') return 'mountains';
        if (t === 'sand') return 'desert';
        if (t === 'forest') return 'forests';
        return t;
    }

    function exportNukesRingFormat() {
        // Nukes app expects: [ [ {id:'R0',t:'water'} ], [..ring1..], [..ring2..], [..ring3..] ]
        var maxRing = 0;
        for (var i = 0; i < hexData.length; i++) {
            var id = hexData[i].id;
            if (id === 'R0') continue;
            var m = id.match(/^R(\d+)D/);
            if (m) {
                var r = parseInt(m[1], 10);
                if (r > maxRing) maxRing = r;
            }
        }

        var rings = [];
        for (var ring = 0; ring <= maxRing; ring++) rings.push([]);

        for (var i = 0; i < hexData.length; i++) {
            var h = hexData[i];
            var ringNum = 0;
            var pos = 0;
            if (h.id !== 'R0') {
                var m = h.id.match(/^R(\d+)D(\d+)$/);
                if (!m) continue;
                ringNum = parseInt(m[1], 10);
                pos = parseInt(m[2], 10);
            }

            var terrain = normalizeNukesTerrain(h.type);
            if (terrain === 'base') terrain = 'base';
            if (ringNum === 0) {
                rings[0] = [{ id: 'R0', t: terrain }];
            } else {
                // Ensure stable ordering by filling index (pos-1)
                rings[ringNum][pos - 1] = { id: h.id, t: terrain };
            }
        }

        // Fill any gaps (shouldn't happen, but keep shape consistent)
        for (var ring = 1; ring <= maxRing; ring++) {
            var expected = ring * 6;
            for (var i = 0; i < expected; i++) {
                if (!rings[ring][i]) {
                    rings[ring][i] = { id: 'R' + ring + 'D' + (i + 1), t: 'fields' };
                }
            }
        }

        return rings;
    }

    function initEmbedBridge() {
        if (!embedMode) return;
        if (window.__hexmapsBridgeAttached) return;
        window.__hexmapsBridgeAttached = true;

        window.addEventListener('message', function(ev) {
            var data = ev && ev.data;
            if (!data || typeof data !== 'object') return;
            if (data.type !== 'hexmaps:requestExport') return;

            // Only support Nukes ring format right now (that's what the Nukes app imports).
            var mapData = exportNukesRingFormat();
            try {
                window.parent.postMessage({ type: 'hexmaps:export', mapData: mapData }, '*');
            } catch (_) {}
        });
    }

    return { init: init };
})();

document.addEventListener('DOMContentLoaded', HexApp.init);
