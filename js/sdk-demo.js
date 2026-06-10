import { HexApp } from './game-registry.js';
import './hex-controller.js';
import './games/nukes.js';
import './games/twilight.js';

function log(id, msg) {
    var el = document.getElementById('log-' + id);
    el.textContent = msg + '\n' + el.textContent;
}

var map1 = HexApp.createMapController(document.getElementById('map-1'), {
    game: 'nukes',
    seed: 'demo-1',
    size: 4,
    players: 4,
    style: 'classic',
    hooks: {
        overlayProvider: function(hex) {
            if (hex.type === 'water') return { color: '#00bcd4', opacity: 0.2 };
            return null;
        }
    }
});

map1.on('hexClick', function(data) {
    log(1, 'Click: ' + data.hex.id + ' (' + data.hex.q + ',' + data.hex.r + ') type=' + data.hex.type);
});
map1.on('hexHover', function(data) {
    log(1, 'Hover: ' + data.hex.id + ' ' + (data.hex.tileName || data.hex.type));
});
map1.on('regenerate', function(data) {
    log(1, 'Regenerated: ' + data.hexes.length + ' hexes, seed=' + data.seed);
});

var styleIdx1 = 0;
var styles1 = ['classic', 'kenney', 'realistic'];

document.getElementById('btn-regen-1').onclick = function() {
    map1.regenerate({ seed: 'demo-' + Date.now() });
};
document.getElementById('btn-style-1').onclick = function() {
    styleIdx1 = (styleIdx1 + 1) % styles1.length;
    map1.setStyle(styles1[styleIdx1]);
    log(1, 'Style: ' + styles1[styleIdx1]);
};
document.getElementById('btn-destroy-1').onclick = function() {
    map1.destroy();
    log(1, 'Destroyed.');
};

var map2 = HexApp.createMapController(document.getElementById('map-2'), {
    game: 'twilight',
    seed: 'demo-2',
    players: 6,
    style: 'classic',
    hooks: {
        afterRender: function(ctx, hexes, controller) {
            var center = null;
            for (var i = 0; i < hexes.length; i++) {
                if (hexes[i].type === 'rex') { center = hexes[i]; break; }
            }
            if (!center) return;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
        }
    }
});

map2.on('hexClick', function(data) {
    log(2, 'Click: ' + data.hex.id + ' type=' + data.hex.type);
});
map2.on('regenerate', function(data) {
    log(2, 'Regenerated: ' + data.hexes.length + ' hexes');
});

document.getElementById('btn-regen-2').onclick = function() {
    map2.regenerate({ seed: 'tw-' + Date.now() });
};
document.getElementById('btn-highlight-2').onclick = function() {
    var hexData = map2.getHexData();
    var ring1 = hexData.filter(function(h) {
        return Math.max(Math.abs(h.q), Math.abs(h.r), Math.abs(-h.q - h.r)) === 1;
    });
    map2.highlightHexes(ring1, { color: '#ff4081', opacity: 0.4 });
    log(2, 'Highlighted ' + ring1.length + ' ring-1 hexes');
};
document.getElementById('btn-clear-2').onclick = function() {
    map2.clearHighlights();
    log(2, 'Highlights cleared');
};
