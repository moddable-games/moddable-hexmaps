var HexRenderer = (function() {

    var activeRenderer = null;
    var imageCache = {};

    function getVersionParam() {
        var link = document.querySelector('link[rel="stylesheet"][href*="?v="]');
        if (link) {
            var match = link.href.match(/\?v=([0-9.]+)/);
            if (match) return '?v=' + match[1];
        }
        return '';
    }

    function preloadImages(imagePaths, callback) {
        var keys = Object.keys(imagePaths);
        var remaining = keys.length;
        if (remaining === 0) { if (callback) callback(); return; }
        var vParam = getVersionParam();

        keys.forEach(function(key) {
            if (imageCache[imagePaths[key]]) {
                remaining--;
                if (remaining === 0 && callback) callback();
                return;
            }
            var img = new Image();
            img.onload = function() {
                imageCache[imagePaths[key]] = img;
                remaining--;
                if (remaining === 0 && callback) callback();
            };
            img.onerror = function() {
                remaining--;
                if (remaining === 0 && callback) callback();
            };
            img.src = imagePaths[key] + (imagePaths[key].indexOf('?') === -1 ? vParam : '');
        });
    }

    function create(canvasId, options) {
        var canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        if (activeRenderer && activeRenderer.cleanup) {
            activeRenderer.cleanup();
        }

        var ctx = canvas.getContext('2d');

        var renderer = {
            canvas: canvas,
            ctx: ctx,
            hexSize: options.hexSize || 40,
            flat: options.flat || false,
            hexes: [],
            offsetX: 0,
            offsetY: 0,
            hoveredHex: null,
            selectedHex: null,
            onHexClick: options.onHexClick || null,
            onHexHover: options.onHexHover || null,
            colors: options.colors || {},
            images: options.images || null,
            labels: options.labels || false,
            cleanup: null
        };

        setupCanvas(renderer);
        setupEvents(renderer);
        activeRenderer = renderer;

        return renderer;
    }

    function setupCanvas(renderer) {
        var parent = renderer.canvas.parentElement;
        renderer.canvas.width = parent.clientWidth;
        renderer.canvas.height = parent.clientHeight;
        renderer.offsetX = renderer.canvas.width / 2;
        renderer.offsetY = renderer.canvas.height / 2;
    }

    function resize(renderer) {
        setupCanvas(renderer);
        if (renderer.hexes.length > 0) {
            fitToCanvas(renderer);
        }
        render(renderer);
    }

    function setHexes(renderer, hexes) {
        renderer.hexes = hexes;
        fitToCanvas(renderer);
        render(renderer);
    }

    function fitToCanvas(renderer) {
        if (renderer.hexes.length === 0) return;

        renderer.hexSize = 40;

        var minX = Infinity, maxX = -Infinity;
        var minY = Infinity, maxY = -Infinity;

        for (var i = 0; i < renderer.hexes.length; i++) {
            var hex = renderer.hexes[i];
            var pos;
            if (renderer.flat) {
                pos = HexMath.axialToPixelFlat(hex.q, hex.r, renderer.hexSize);
            } else {
                pos = HexMath.axialToPixelPointy(hex.q, hex.r, renderer.hexSize);
            }
            if (pos.x < minX) minX = pos.x;
            if (pos.x > maxX) maxX = pos.x;
            if (pos.y < minY) minY = pos.y;
            if (pos.y > maxY) maxY = pos.y;
        }

        var gridWidth = maxX - minX + renderer.hexSize * 2.5;
        var gridHeight = maxY - minY + renderer.hexSize * 2.5;

        var scaleX = renderer.canvas.width / gridWidth;
        var scaleY = renderer.canvas.height / gridHeight;
        var scale = Math.min(scaleX, scaleY) * 0.9;

        renderer.hexSize = renderer.hexSize * scale;

        var centerGridX = (minX + maxX) / 2 * scale;
        var centerGridY = (minY + maxY) / 2 * scale;
        renderer.offsetX = renderer.canvas.width / 2 - centerGridX;
        renderer.offsetY = renderer.canvas.height / 2 - centerGridY;
    }

    function getHexCenter(renderer, q, r) {
        var pos;
        if (renderer.flat) {
            pos = HexMath.axialToPixelFlat(q, r, renderer.hexSize);
        } else {
            pos = HexMath.axialToPixelPointy(q, r, renderer.hexSize);
        }
        return {
            x: pos.x + renderer.offsetX,
            y: pos.y + renderer.offsetY
        };
    }

    function render(renderer) {
        var ctx = renderer.ctx;
        ctx.clearRect(0, 0, renderer.canvas.width, renderer.canvas.height);

        for (var i = 0; i < renderer.hexes.length; i++) {
            var hex = renderer.hexes[i];
            drawHex(renderer, hex);
        }
    }

    function drawHex(renderer, hex) {
        var ctx = renderer.ctx;
        var center = getHexCenter(renderer, hex.q, hex.r);
        var corners = HexMath.getHexCorners(center.x, center.y, renderer.hexSize * 0.95, renderer.flat);

        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (var i = 1; i < 6; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();

        var imgPath = renderer.images ? (hex.imagePath || renderer.images[hex.type]) : null;
        var img = imgPath && imageCache[imgPath];

        if (img) {
            ctx.save();
            ctx.clip();
            var size = renderer.hexSize * 2;
            ctx.drawImage(img, center.x - size / 2, center.y - size / 2, size, size);
            ctx.restore();
        } else {
            var fillColor = getTerrainColor(renderer, hex.type);
            ctx.fillStyle = fillColor;
            ctx.fill();
        }

        var isHovered = renderer.hoveredHex &&
            renderer.hoveredHex.q === hex.q &&
            renderer.hoveredHex.r === hex.r;
        var isSelected = renderer.selectedHex &&
            renderer.selectedHex.q === hex.q &&
            renderer.selectedHex.r === hex.r;

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

        if (hex.overlay) {
            var radius = renderer.hexSize * (hex.overlay.size || 0.4);
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
        } else if (renderer.labels && hex.label) {
            ctx.fillStyle = getTextColor(fillColor);
            ctx.font = Math.round(renderer.hexSize * 0.35) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hex.label, center.x, center.y);
        }
    }

    function getTerrainColor(renderer, type) {
        if (renderer.colors[type]) return renderer.colors[type];

        var defaults = {
            water: '#2196F3',
            trees: '#4CAF50',
            forest: '#4CAF50',
            mount: '#795548',
            mountain: '#795548',
            grass: '#8BC34A',
            plains: '#8BC34A',
            sand: '#FFC107',
            desert: '#FFC107',
            base: '#F44336',
            hq: '#F44336',
            random: '#9E9E9E',
            inner: '#CE93D8',
            middle: '#90CAF9',
            river: '#42A5F5',
            outer: '#A5D6A7',
            dungeon: '#616161',
            ending: '#FFD700',
            rex: '#FFD700',
            blue: '#1565C0',
            red: '#C62828',
            green: '#2E7D32',
            lanes: '#37474F',
            legends: '#FF8F00',
            empty: '#263238'
        };

        return defaults[type] || '#757575';
    }

    function getTextColor(bgColor) {
        var r = parseInt(bgColor.slice(1, 3), 16);
        var g = parseInt(bgColor.slice(3, 5), 16);
        var b = parseInt(bgColor.slice(5, 7), 16);
        var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    function setupEvents(renderer) {
        var onMouseMove = function(e) {
            var rect = renderer.canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var hex = pixelToHex(renderer, x, y);

            if (hex !== renderer.hoveredHex) {
                renderer.hoveredHex = hex;
                render(renderer);
                if (renderer.onHexHover && hex) {
                    renderer.onHexHover(hex);
                }
            }
        };

        var onMouseLeave = function() {
            renderer.hoveredHex = null;
            render(renderer);
        };

        var onClick = function(e) {
            var rect = renderer.canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var hex = pixelToHex(renderer, x, y);

            if (hex) {
                renderer.selectedHex = hex;
                render(renderer);
                if (renderer.onHexClick) {
                    renderer.onHexClick(hex);
                }
            }
        };

        var onResize = function() {
            resize(renderer);
        };

        renderer.canvas.addEventListener('mousemove', onMouseMove);
        renderer.canvas.addEventListener('mouseleave', onMouseLeave);
        renderer.canvas.addEventListener('click', onClick);
        window.addEventListener('resize', onResize);

        renderer.cleanup = function() {
            renderer.canvas.removeEventListener('mousemove', onMouseMove);
            renderer.canvas.removeEventListener('mouseleave', onMouseLeave);
            renderer.canvas.removeEventListener('click', onClick);
            window.removeEventListener('resize', onResize);
        };
    }

    function pixelToHex(renderer, px, py) {
        var closest = null;
        var closestDist = Infinity;

        for (var i = 0; i < renderer.hexes.length; i++) {
            var hex = renderer.hexes[i];
            var center = getHexCenter(renderer, hex.q, hex.r);
            var dx = px - center.x;
            var dy = py - center.y;
            var dist = dx * dx + dy * dy;
            if (dist < closestDist && dist < renderer.hexSize * renderer.hexSize) {
                closestDist = dist;
                closest = hex;
            }
        }
        return closest;
    }

    return {
        create: create,
        setHexes: setHexes,
        render: render,
        resize: resize,
        fitToCanvas: fitToCanvas,
        preloadImages: preloadImages
    };
})();
