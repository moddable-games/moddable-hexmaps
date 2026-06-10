import { HexApp } from './game-registry.js';
import './hex-controller.js';
import './games/nukes.js';
import './games/talisman.js';
import './games/twilight.js';
import './games/colony.js';
import './games/mongo.js';
import './games/endless.js';

function track(action) {
    if (typeof window.gtag === 'function') window.gtag('event', 'sdk_demo_interact', { action: action });
}

var GAMES = [
    { key: 'nukes', label: 'Nukes', bg: '#1a2e1f', size: 4, players: 4 },
    { key: 'talisman', label: 'Talisman Worlds', bg: '#1a1e2e', size: 4, players: 0 },
    { key: 'twilight', label: 'Twilight Imperium', bg: '#0f1a2a', players: 6 },
    { key: 'colony', label: 'Colony', bg: '#1e2a1a', players: 0 },
    { key: 'mongo', label: 'Planet Mongo', bg: '#2a1a1a', size: 6, players: 8 },
    { key: 'endless', label: 'Endless Skies', bg: '#0a0f1e', size: 5, players: 6 }
];

var galleryMaps = {};
var controlMap = null;
var editMode = false;

function buildGallery() {
    var container = document.getElementById('gallery');
    GAMES.forEach(function(g) {
        var panel = document.createElement('div');
        panel.className = 'demo-panel';

        var header = document.createElement('div');
        header.className = 'demo-panel__header';
        header.innerHTML = '<h3>' + g.label + '</h3>';
        panel.appendChild(header);

        var canvas = document.createElement('div');
        canvas.className = 'demo-panel__canvas demo-panel__canvas--gallery';
        canvas.id = 'gallery-' + g.key;
        canvas.style.background = g.bg;
        panel.appendChild(canvas);

        var config = HexApp.getGameConfig(g.key);
        var styles = config && config.styles ? config.styles : [];
        if (styles.length > 1) {
            var bar = document.createElement('div');
            bar.className = 'demo-panel__style-bar';
            styles.forEach(function(s) {
                var btn = document.createElement('button');
                btn.className = 'demo-style-btn' + (s === (styles[0]) ? ' active' : '');
                btn.textContent = s;
                btn.addEventListener('click', function() {
                    bar.querySelectorAll('.demo-style-btn').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    track('gallery_style_' + s);
                    galleryMaps[g.key].setStyle(s);
                });
                bar.appendChild(btn);
            });
            panel.appendChild(bar);
        }

        container.appendChild(panel);

        var opts = { game: g.key, seed: 'showcase', style: styles[0] || 'classic', bgColor: g.bg, interactive: false, basePath: '../' };
        if (g.size) opts.size = g.size;
        if (g.players) opts.players = g.players;

        galleryMaps[g.key] = HexApp.createMapController(canvas, opts);
    });
}

function buildControlMap() {
    var el = document.getElementById('control-map');
    el.style.background = '#1a2e1f';

    controlMap = HexApp.createMapController(el, {
        game: 'nukes',
        seed: 'hello-world',
        size: 4,
        players: 4,
        style: 'classic',
        bgColor: '#1a2e1f',
        basePath: '../'
    });

    controlMap.on('hexClick', function(data) {
        var h = data.hex;
        document.getElementById('hex-info').innerHTML =
            '<strong>' + h.id + '</strong> (' + h.q + ', ' + h.r + ')<br>' +
            'Type: <strong>' + h.type + '</strong><br>' +
            'Label: ' + (h.label || '—');
        logEvent('click ' + h.id + ' type=' + h.type);

        if (editMode) {
            var types = ['water', 'trees', 'mount', 'grass', 'sand', 'base'];
            var idx = types.indexOf(h.type);
            var next = types[(idx + 1) % types.length];
            controlMap.setHexType(h.q, h.r, next);
            logEvent('edit ' + h.id + ' → ' + next);
        }
    });

    controlMap.on('hexHover', function(data) {
        var h = data.hex;
        document.getElementById('hex-info').innerHTML =
            '<strong>' + h.id + '</strong> (' + h.q + ', ' + h.r + ')<br>' +
            'Type: <strong>' + h.type + '</strong><br>' +
            'Label: ' + (h.label || '—');
    });

    controlMap.on('regenerate', function(data) {
        logEvent('regenerated: ' + data.hexes.length + ' hexes, seed=' + data.seed);
        updateStats();
    });

    updateStats();

    document.getElementById('btn-seed').addEventListener('click', function() {
        var seed = document.getElementById('seed-input').value || 'default';
        track('set_seed');
        controlMap.regenerate({ seed: seed });
    });

    document.getElementById('btn-randomise').addEventListener('click', function() {
        var seed = 'rng-' + Date.now();
        document.getElementById('seed-input').value = seed;
        track('randomise');
        controlMap.regenerate({ seed: seed });
    });

    document.getElementById('btn-highlight').addEventListener('click', function() {
        var hexes = controlMap.getHexData();
        var water = hexes.filter(function(h) { return h.type === 'water'; });
        controlMap.highlightHexes(water, { color: '#00bcd4', opacity: 0.35 });
        track('highlight');
        logEvent('highlighted ' + water.length + ' water hexes');
    });

    document.getElementById('btn-clear-hl').addEventListener('click', function() {
        controlMap.clearHighlights();
        track('clear_highlights');
        logEvent('highlights cleared');
    });

    document.getElementById('btn-edit-mode').addEventListener('click', function() {
        editMode = !editMode;
        var btn = document.getElementById('btn-edit-mode');
        btn.textContent = 'Edit Mode: ' + (editMode ? 'On' : 'Off');
        btn.classList.toggle('demo-btn--active', editMode);
        track('toggle_edit_mode');
        logEvent('edit mode ' + (editMode ? 'enabled' : 'disabled'));
    });

    document.getElementById('btn-export-svg').addEventListener('click', function() {
        var svg = controlMap.exportSVG();
        var blob = new Blob([svg], { type: 'image/svg+xml' });
        downloadBlob(blob, 'hexmap.svg');
        track('export_svg');
        logEvent('exported SVG (' + svg.length + ' bytes)');
    });

    document.getElementById('btn-export-png').addEventListener('click', function() {
        controlMap.exportPNG({ scale: 2, bgColor: '#1a2e1f' }).then(function(blob) {
            downloadBlob(blob, 'hexmap.png');
            track('export_png');
            logEvent('exported PNG');
        });
    });
}

function buildHookDemos() {
    var painterEl = document.getElementById('hook-painter');
    painterEl.style.background = '#1e1e2e';

    HexApp.createMapController(painterEl, {
        game: 'nukes',
        seed: 'painter-demo',
        size: 3,
        players: 2,
        style: 'classic',
        bgColor: '#1e1e2e',
        interactive: false,
        basePath: '../',
        hooks: {
            tilePainter: function(ctx, hex, bounds) {
                var grad = ctx.createRadialGradient(
                    bounds.center.x, bounds.center.y, 0,
                    bounds.center.x, bounds.center.y, bounds.hexSize
                );
                var hue = hex.type === 'water' ? 200 : hex.type === 'trees' ? 140 :
                    hex.type === 'mount' ? 30 : hex.type === 'sand' ? 45 :
                    hex.type === 'base' ? 0 : 100;
                grad.addColorStop(0, 'hsl(' + hue + ', 70%, 60%)');
                grad.addColorStop(1, 'hsl(' + hue + ', 50%, 25%)');
                ctx.fillStyle = grad;
                ctx.fill();
                return true;
            }
        }
    });

    var overlayEl = document.getElementById('hook-overlay');
    overlayEl.style.background = '#1a2e1f';

    HexApp.createMapController(overlayEl, {
        game: 'colony',
        seed: 'overlay-demo',
        style: 'classic',
        bgColor: '#1a2e1f',
        interactive: false,
        basePath: '../',
        hooks: {
            overlayProvider: function(hex) {
                if (hex.type === 'forest') return { color: '#00ff88', opacity: 0.25 };
                if (hex.type === 'hills') return { color: '#ff8800', opacity: 0.2 };
                if (hex.type === 'mountains') return { color: '#ff0044', opacity: 0.2 };
                if (hex.type === 'fields') return { color: '#ffdd00', opacity: 0.15 };
                return null;
            }
        }
    });

    var afterEl = document.getElementById('hook-after');
    afterEl.style.background = '#0f1a2a';

    HexApp.createMapController(afterEl, {
        game: 'twilight',
        seed: 'after-demo',
        players: 6,
        style: 'classic',
        bgColor: '#0f1a2a',
        interactive: false,
        basePath: '../',
        hooks: {
            afterRender: function(ctx, hexes, controller) {
                for (var i = 0; i < hexes.length; i++) {
                    var h = hexes[i];
                    if (h.type === 'green') {
                        var data = controller.getHexAt(h.q, h.r);
                        if (!data) continue;
                        ctx.save();
                        ctx.fillStyle = '#FFD700';
                        ctx.font = 'bold 8px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.restore();
                    }
                }
            }
        }
    });
}

function buildStyleComparison() {
    var container = document.getElementById('style-compare');
    var styles = ['artistic', 'classic', 'kenney', 'realistic'];

    styles.forEach(function(s) {
        var panel = document.createElement('div');
        panel.className = 'demo-panel';

        var header = document.createElement('div');
        header.className = 'demo-panel__header';
        header.innerHTML = '<h3>' + s.charAt(0).toUpperCase() + s.slice(1) + '</h3>';
        panel.appendChild(header);

        var canvas = document.createElement('div');
        canvas.className = 'demo-panel__canvas demo-panel__canvas--short';
        canvas.id = 'style-' + s;
        canvas.style.background = '#1a2e1f';
        panel.appendChild(canvas);

        container.appendChild(panel);

        HexApp.createMapController(canvas, {
            game: 'nukes',
            seed: 'compare',
            size: 3,
            players: 3,
            style: s,
            bgColor: '#1a2e1f',
            interactive: false,
            basePath: '../'
        });
    });
}

function updateStats() {
    var hexes = controlMap.getHexData();
    var types = {};
    hexes.forEach(function(h) { types[h.type] = (types[h.type] || 0) + 1; });
    var lines = ['<strong>' + hexes.length + '</strong> hexes total'];
    Object.keys(types).sort().forEach(function(t) {
        lines.push(t + ': ' + types[t]);
    });
    document.getElementById('map-stats').innerHTML = lines.join('<br>');
}

function logEvent(msg) {
    var el = document.getElementById('event-log');
    el.textContent = msg + '\n' + el.textContent;
}

function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

buildGallery();
buildControlMap();
buildHookDemos();
buildStyleComparison();
