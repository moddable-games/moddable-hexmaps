import { HexMath } from './hex-math.js';
import { HexSvg } from './hex-svg.js';
import { getGameConfig, HexApp } from './game-registry.js';

var defaultBasePath = new URL('./', import.meta.url).href;

export function createMapController(container, opts) {
    if (!container || !container.appendChild) {
        throw new Error('createMapController: container must be a DOM element');
    }
    if (!opts || !opts.game) {
        throw new Error('createMapController: opts.game is required');
    }

    var config = getGameConfig(opts.game);
    if (!config) {
        throw new Error('createMapController: unknown game "' + opts.game + '"');
    }

    var game = opts.game;
    var seed = opts.seed != null ? String(opts.seed) : String(Date.now());
    var size = opts.size || config.defaultSize;
    var players = opts.players != null ? opts.players : config.defaultPlayers;
    var layout = opts.layout || (config.layouts ? (config.defaultLayout || config.layouts[0].value) : null);
    var style = opts.style || (config.styles ? config.styles[0] : 'classic');
    var interactive = opts.interactive !== false;
    var bgColor = opts.bgColor || null;
    var basePath = opts.basePath || defaultBasePath;
    var hooks = opts.hooks || {};

    var destroyed = false;
    var hexes = [];
    var highlights = [];
    var imageCache = {};
    var hoveredHex = null;
    var selectedHex = null;
    var listeners = {};
    var hexSize = 40;
    var offsetX = 0;
    var offsetY = 0;
    var flat = config.orientation === 'flat';

    var dpr = window.devicePixelRatio || 1;
    var canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var colors = config.getColors ? config.getColors(style) : {};
    var images = null;
    var labels = style === 'classic' && config.labels !== false;

    var resizeObserver = null;
    var cleanupFn = null;

    function sizeCanvas() {
        var w = container.clientWidth;
        var h = container.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        offsetX = w / 2;
        offsetY = h / 2;
    }

    function fitToCanvas() {
        if (hexes.length === 0) return;
        var w = container.clientWidth;
        var h = container.clientHeight;
        hexSize = 40;

        var minX = Infinity, maxX = -Infinity;
        var minY = Infinity, maxY = -Infinity;
        for (var i = 0; i < hexes.length; i++) {
            var pos = flat
                ? HexMath.axialToPixelFlat(hexes[i].q, hexes[i].r, hexSize)
                : HexMath.axialToPixelPointy(hexes[i].q, hexes[i].r, hexSize);
            if (pos.x < minX) minX = pos.x;
            if (pos.x > maxX) maxX = pos.x;
            if (pos.y < minY) minY = pos.y;
            if (pos.y > maxY) maxY = pos.y;
        }

        var gridW = maxX - minX + hexSize * 2.5;
        var gridH = maxY - minY + hexSize * 2.5;
        var scaleX = w / gridW;
        var scaleY = h / gridH;
        var scale = Math.min(scaleX, scaleY) * 0.9;

        hexSize = hexSize * scale;
        var centerGridX = (minX + maxX) / 2 * scale;
        var centerGridY = (minY + maxY) / 2 * scale;
        offsetX = w / 2 - centerGridX;
        offsetY = h / 2 - centerGridY;
    }

    function getHexCenter(q, r) {
        var pos = flat
            ? HexMath.axialToPixelFlat(q, r, hexSize)
            : HexMath.axialToPixelPointy(q, r, hexSize);
        return { x: pos.x + offsetX, y: pos.y + offsetY };
    }

    function render() {
        if (destroyed) return;
        var w = container.clientWidth;
        var h = container.clientHeight;
        ctx.clearRect(0, 0, w, h);

        if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, w, h);
        }

        for (var i = 0; i < hexes.length; i++) {
            drawHex(hexes[i]);
        }

        for (var i = 0; i < highlights.length; i++) {
            drawHighlight(highlights[i]);
        }

        if (hooks.afterRender) {
            hooks.afterRender(ctx, hexes, publicApi);
        }
    }

    function drawHex(hex) {
        var center = getHexCenter(hex.q, hex.r);
        var corners = HexMath.getHexCorners(center.x, center.y, hexSize * 0.95, flat);

        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (var i = 1; i < 6; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();

        if (hooks.tilePainter) {
            var handled = hooks.tilePainter(ctx, hex, {
                center: center,
                corners: corners,
                hexSize: hexSize
            });
            if (handled) {
                drawStroke(hex);
                drawOverlay(hex);
                return;
            }
        }

        var imgPath = images ? (hex.imagePath || images[hex.type]) : null;
        var img = imgPath && imageCache[imgPath];

        if (img) {
            ctx.save();
            ctx.clip();
            var sz = hexSize * 2;
            ctx.drawImage(img, center.x - sz / 2, center.y - sz / 2, sz, sz);
            ctx.restore();
        } else {
            ctx.fillStyle = getTerrainColor(hex.type);
            ctx.fill();
        }

        drawStroke(hex);
        drawOverlay(hex);

        if (hex.overlay) {
            var radius = hexSize * (hex.overlay.size || 0.4);
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = hex.overlay.color || '#FFF8E1';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            var textColor = hex.overlay.textColor || ((hex.overlay.color === '#C62828' || hex.overlay.color === '#D32F2F') ? '#fff' : '#000');
            ctx.fillStyle = textColor;
            ctx.font = 'bold ' + Math.round(radius * 1.1) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hex.overlay.text, center.x, center.y);
        } else if (labels && hex.label) {
            ctx.fillStyle = getTextColor(getTerrainColor(hex.type));
            ctx.font = Math.round(hexSize * 0.35) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hex.label, center.x, center.y);
        }
    }

    function drawStroke(hex) {
        var isHovered = hoveredHex && hoveredHex.q === hex.q && hoveredHex.r === hex.r;
        var isSelected = selectedHex && selectedHex.q === hex.q && selectedHex.r === hex.r;

        if (isSelected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
        } else if (isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
        }
        ctx.stroke();
    }

    function drawOverlay(hex) {
        if (!hooks.overlayProvider) return;
        var overlay = hooks.overlayProvider(hex);
        if (!overlay) return;

        var center = getHexCenter(hex.q, hex.r);
        var corners = HexMath.getHexCorners(center.x, center.y, hexSize * 0.95, flat);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (var i = 1; i < 6; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = overlay.color || '#ffff00';
        ctx.globalAlpha = overlay.opacity != null ? overlay.opacity : 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    function drawHighlight(hl) {
        var hex = findHex(hl.q, hl.r);
        if (!hex) return;
        var center = getHexCenter(hl.q, hl.r);
        var corners = HexMath.getHexCorners(center.x, center.y, hexSize * 0.95, flat);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (var i = 1; i < 6; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = hl.color || '#ffff00';
        ctx.globalAlpha = hl.opacity != null ? hl.opacity : 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    function getTerrainColor(type) {
        if (colors[type]) return colors[type];
        var defaults = {
            water: '#2196F3', trees: '#4CAF50', forest: '#4CAF50',
            mount: '#795548', mountain: '#795548', grass: '#8BC34A',
            plains: '#8BC34A', sand: '#FFC107', desert: '#FFC107',
            base: '#F44336', hq: '#F44336', random: '#9E9E9E',
            inner: '#CE93D8', middle: '#90CAF9', river: '#42A5F5',
            outer: '#A5D6A7', dungeon: '#616161', ending: '#FFD700',
            rex: '#FFD700', blue: '#1565C0', red: '#C62828',
            green: '#2E7D32', lanes: '#37474F', legends: '#1565C0',
            empty: '#263238'
        };
        return defaults[type] || '#757575';
    }

    function getTextColor(bgColor) {
        if (!bgColor || bgColor.charAt(0) !== '#') return '#ffffff';
        var r = parseInt(bgColor.slice(1, 3), 16);
        var g = parseInt(bgColor.slice(3, 5), 16);
        var b = parseInt(bgColor.slice(5, 7), 16);
        var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    function pixelToHex(px, py) {
        var closest = null;
        var closestDist = Infinity;
        for (var i = 0; i < hexes.length; i++) {
            var center = getHexCenter(hexes[i].q, hexes[i].r);
            var dx = px - center.x;
            var dy = py - center.y;
            var dist = dx * dx + dy * dy;
            if (dist < closestDist && dist < hexSize * hexSize) {
                closestDist = dist;
                closest = hexes[i];
            }
        }
        return closest;
    }

    function findHex(q, r) {
        for (var i = 0; i < hexes.length; i++) {
            if (hexes[i].q === q && hexes[i].r === r) return hexes[i];
        }
        return null;
    }

    function emit(event, data) {
        var fns = listeners[event];
        if (!fns) return;
        for (var i = 0; i < fns.length; i++) {
            fns[i](data);
        }
    }

    function preloadImages(paths, callback) {
        var keys = Object.keys(paths);
        var remaining = keys.length;
        if (remaining === 0) { if (callback) callback(); return; }

        keys.forEach(function(key) {
            var src = paths[key];
            if (imageCache[src]) {
                remaining--;
                if (remaining === 0 && callback) callback();
                return;
            }
            var img = new Image();
            img.onload = function() {
                imageCache[src] = img;
                remaining--;
                if (remaining === 0 && callback) callback();
            };
            img.onerror = function() {
                remaining--;
                if (remaining === 0 && callback) callback();
            };
            img.src = src;
        });
    }

    function generateMap() {
        hexes = config.generate(size, players, seed, layout);

        if (config.constraints) {
            var attempts = 0;
            while (!config.constraints(hexes) && attempts < 100) {
                attempts++;
                hexes = config.generate(size, players, seed + '_' + attempts, layout);
            }
        }

        loadImagesAndRender();
        emit('regenerate', { hexes: hexes, seed: seed, size: size, players: players, layout: layout });
    }

    function loadImagesAndRender() {
        if (config.getImages) {
            var imgMap = config.getImages(style);
            if (imgMap && imgMap._perHex) {
                images = imgMap;
                var perHexPaths = {};
                for (var i = 0; i < hexes.length; i++) {
                    if (hexes[i].imagePath) perHexPaths[hexes[i].imagePath] = hexes[i].imagePath;
                }
                preloadImages(perHexPaths, function() {
                    fitToCanvas();
                    render();
                });
            } else if (imgMap) {
                images = imgMap;
                preloadImages(imgMap, function() {
                    fitToCanvas();
                    render();
                });
            } else {
                images = null;
                fitToCanvas();
                render();
            }
        } else {
            images = null;
            fitToCanvas();
            render();
        }
    }

    function setupEvents() {
        if (!interactive) return;

        var onMouseMove = function(e) {
            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var hex = pixelToHex(x, y);

            if (hex !== hoveredHex) {
                hoveredHex = hex;
                render();
                if (hex) emit('hexHover', { hex: hex, event: e });
                if (!hex) emit('hexLeave', {});
            }
        };

        var onMouseLeave = function() {
            hoveredHex = null;
            render();
            emit('hexLeave', {});
        };

        var onClick = function(e) {
            var rect = canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var hex = pixelToHex(x, y);
            if (hex) {
                selectedHex = hex;
                render();
                emit('hexClick', { hex: hex, event: e });
            }
        };

        var onTouchEnd = function(e) {
            if (e.changedTouches.length === 0) return;
            var touch = e.changedTouches[0];
            var rect = canvas.getBoundingClientRect();
            var x = touch.clientX - rect.left;
            var y = touch.clientY - rect.top;
            var hex = pixelToHex(x, y);
            if (hex) {
                selectedHex = hex;
                render();
                emit('hexClick', { hex: hex, event: e });
            }
        };

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseLeave);
        canvas.addEventListener('click', onClick);
        canvas.addEventListener('touchend', onTouchEnd);

        resizeObserver = new ResizeObserver(function() {
            if (destroyed) return;
            sizeCanvas();
            if (hexes.length > 0) fitToCanvas();
            render();
        });
        resizeObserver.observe(container);

        cleanupFn = function() {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseleave', onMouseLeave);
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('touchend', onTouchEnd);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }

    var publicApi = {
        regenerate: function(newOpts) {
            if (destroyed) return;
            if (newOpts) {
                if (newOpts.seed != null) seed = String(newOpts.seed);
                if (newOpts.size != null) size = newOpts.size;
                if (newOpts.players != null) players = newOpts.players;
                if (newOpts.layout != null) layout = newOpts.layout;
            }
            generateMap();
        },

        setStyle: function(newStyle) {
            if (destroyed) return;
            style = newStyle;
            colors = config.getColors ? config.getColors(style) : {};
            labels = style === 'classic' && config.labels !== false;
            loadImagesAndRender();
            emit('styleChange', { style: style });
        },

        getHexData: function() {
            return hexes.slice();
        },

        getHexAt: function(q, r) {
            return findHex(q, r) || null;
        },

        setHexType: function(q, r, type) {
            if (destroyed) return;
            var hex = findHex(q, r);
            if (hex) {
                hex.type = type;
                render();
            }
        },

        highlightHexes: function(coords, hlOpts) {
            if (destroyed) return;
            var color = (hlOpts && hlOpts.color) || '#ffff00';
            var opacity = (hlOpts && hlOpts.opacity != null) ? hlOpts.opacity : 0.3;
            for (var i = 0; i < coords.length; i++) {
                highlights.push({ q: coords[i].q, r: coords[i].r, color: color, opacity: opacity });
            }
            render();
        },

        clearHighlights: function() {
            if (destroyed) return;
            highlights = [];
            render();
        },

        exportSVG: function(svgOpts) {
            var exportColors = config.getColors ? config.getColors(style) : {};
            var exportImages = config.getImages ? config.getImages(style) : null;
            return HexSvg.toSVG(hexes, {
                hexSize: (svgOpts && svgOpts.hexSize) || 30,
                flat: flat,
                colors: exportColors,
                images: exportImages,
                imageMode: exportImages ? 'reference' : 'none',
                strokeColor: 'rgba(0,0,0,0.3)',
                strokeWidth: 1,
                labels: false,
                bgColor: (svgOpts && svgOpts.bgColor) || null
            });
        },

        exportPNG: function(pngOpts) {
            var scale = (pngOpts && pngOpts.scale) || 2;
            var pngBg = (pngOpts && pngOpts.bgColor) || null;
            var padding = hexSize * 1.2;

            var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (var i = 0; i < hexes.length; i++) {
                var pos = flat
                    ? HexMath.axialToPixelFlat(hexes[i].q, hexes[i].r, hexSize)
                    : HexMath.axialToPixelPointy(hexes[i].q, hexes[i].r, hexSize);
                if (pos.x < minX) minX = pos.x;
                if (pos.x > maxX) maxX = pos.x;
                if (pos.y < minY) minY = pos.y;
                if (pos.y > maxY) maxY = pos.y;
            }

            var w = (maxX - minX + padding * 2) * scale;
            var h = (maxY - minY + padding * 2) * scale;
            var offCanvas = document.createElement('canvas');
            offCanvas.width = Math.ceil(w);
            offCanvas.height = Math.ceil(h);
            var offCtx = offCanvas.getContext('2d');
            if (pngBg) {
                offCtx.fillStyle = pngBg;
                offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
            }
            offCtx.scale(scale, scale);
            var ox = -minX + padding;
            var oy = -minY + padding;

            for (var i = 0; i < hexes.length; i++) {
                var hex = hexes[i];
                var pos = flat
                    ? HexMath.axialToPixelFlat(hex.q, hex.r, hexSize)
                    : HexMath.axialToPixelPointy(hex.q, hex.r, hexSize);
                var cx = pos.x + ox;
                var cy = pos.y + oy;
                var corners = HexMath.getHexCorners(cx, cy, hexSize * 0.95, flat);

                offCtx.beginPath();
                offCtx.moveTo(corners[0].x, corners[0].y);
                for (var c = 1; c < corners.length; c++) offCtx.lineTo(corners[c].x, corners[c].y);
                offCtx.closePath();

                var imgPath = images ? (hex.imagePath || images[hex.type]) : null;
                var img = imgPath && imageCache[imgPath];
                if (img) {
                    offCtx.save();
                    offCtx.clip();
                    var sz = hexSize * 2;
                    offCtx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz);
                    offCtx.restore();
                } else {
                    offCtx.fillStyle = getTerrainColor(hex.type);
                    offCtx.fill();
                }
                offCtx.strokeStyle = 'rgba(0,0,0,0.3)';
                offCtx.lineWidth = 1;
                offCtx.stroke();
            }

            return new Promise(function(resolve) {
                offCanvas.toBlob(function(blob) { resolve(blob); }, 'image/png');
            });
        },

        on: function(event, fn) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(fn);
        },

        off: function(event, fn) {
            if (!listeners[event]) return;
            listeners[event] = listeners[event].filter(function(f) { return f !== fn; });
        },

        resize: function() {
            if (destroyed) return;
            sizeCanvas();
            if (hexes.length > 0) fitToCanvas();
            render();
        },

        render: function() {
            if (destroyed) return;
            render();
        },

        destroy: function() {
            if (destroyed) return;
            destroyed = true;
            emit('destroy', {});
            if (cleanupFn) cleanupFn();
            if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
            hexes = [];
            imageCache = {};
            listeners = {};
        }
    };

    sizeCanvas();
    setupEvents();
    generateMap();

    return publicApi;
}

HexApp.createMapController = createMapController;
