(function() {
    var renderer = null;
    var currentGame = null;
    var currentSeed = null;
    var currentSize = null;
    var currentPlayers = 0;
    var currentStyle = 'classic';
    var currentLayout = null;
    var gameStyles = {};
    var hexData = [];

    var embedMode = false;
    var viewOnly = false;
    var embedBgColor = null;

    function init() {
        var params = new URLSearchParams(window.location.search);
        var game = params.get('game') || 'nukes';
        var seed = params.get('seed') || String(Date.now());
        if (params.get('random') === '1') seed = String(Date.now());
        var size = parseInt(params.get('size')) || null;
        var players = parseInt(params.get('players')) || 0;
        currentStyle = params.get('theme') || params.get('style') || null;
        currentLayout = params.get('layout') || null;

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

        var config = HexApp.getGameConfig(game);
        if (config && config.styles) {
            var styleSelect = document.getElementById('style-select');
            styleSelect.innerHTML = '';
            for (var i = 0; i < config.styles.length; i++) {
                var opt = document.createElement('option');
                opt.value = config.styles[i];
                opt.textContent = config.styles[i].charAt(0).toUpperCase() + config.styles[i].slice(1);
                styleSelect.appendChild(opt);
            }
            if (config.styles.indexOf(currentStyle) === -1) {
                currentStyle = config.styles[0];
            }
            styleSelect.value = currentStyle;
            gameStyles[game] = currentStyle;
        } else {
            document.getElementById('style-group').style.display = 'none';
        }
        if (!config || !config.layouts) {
            document.getElementById('layout-group').style.display = 'none';
        } else {
            document.getElementById('size-group').style.display = 'none';
        }
        if (!config || !config.hasEditor) {
            document.querySelector('[data-tab="editor"]').style.display = 'none';
        }

        if (embedMode) {
            setupEmbedBridge();
            setTimeout(function() { HexRenderer.resize(renderer); }, 50);
            setTimeout(function() { HexRenderer.resize(renderer); }, 200);
            window.addEventListener('load', function() { HexRenderer.resize(renderer); });
            var wrap = document.querySelector('.canvas-wrap');
            if (wrap && window.ResizeObserver) {
                new ResizeObserver(function() { HexRenderer.resize(renderer); }).observe(wrap);
            }
        }
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
            embedBgColor = color;
            document.documentElement.style.background = color;
            document.body.style.background = color;
            document.querySelector('.canvas-area').style.background = color;
        }
    }

    function setupGameSelector(activeGame) {
        var bar = document.getElementById('game-tabs');
        if (!bar) return;
        bar.innerHTML = '';

        var games = HexApp.getRegisteredGames();
        for (var i = 0; i < games.length; i++) {
            var config = HexApp.getGameConfig(games[i]);
            var btn = document.createElement('button');
            btn.className = 'game-tab';
            btn.setAttribute('data-game', games[i]);
            btn.textContent = config.label;
            if (games[i] === activeGame) btn.classList.add('active');
            btn.addEventListener('click', function() {
                switchGame(this.getAttribute('data-game'));
            });
            bar.appendChild(btn);
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

        var layoutSelect = document.getElementById('layout-select');
        layoutSelect.addEventListener('change', function() {
            currentLayout = this.value;
            regenerateMap();
            updateUrl();
        });

        var styleSelect = document.getElementById('style-select');
        styleSelect.value = currentStyle;
        styleSelect.addEventListener('change', function() {
            currentStyle = this.value;
            gameStyles[currentGame] = currentStyle;
            applyStyle();
            updateUrl();
        });

        var randomBtn = document.getElementById('random-btn');
        randomBtn.addEventListener('click', function() {
            currentSeed = String(Date.now());
            document.getElementById('seed-input').value = currentSeed;
            regenerateMap();
            updateUrl();
        });

        var exportBtn = document.getElementById('export-btn');
        exportBtn.addEventListener('click', function() { exportMap(); });

        var exportSvgBtn = document.getElementById('export-svg-btn');
        if (exportSvgBtn) {
            exportSvgBtn.addEventListener('click', function() { exportSvg(); });
        }

        var exportPngBtn = document.getElementById('export-png-btn');
        if (exportPngBtn) {
            exportPngBtn.addEventListener('click', function() { exportPng(); });
        }

        var exportPdfBtn = document.getElementById('export-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', function() { exportPdf(); });
        }

        var importBtn = document.getElementById('import-btn');
        importBtn.addEventListener('click', function() { importMap(); });

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
                for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
                for (var j = 0; j < panels.length; j++) panels[j].classList.remove('active');
                this.classList.add('active');
                document.getElementById('panel-' + target).classList.add('active');
            });
        }
    }

    function loadGame(game, size, players) {
        var config = HexApp.getGameConfig(game);
        if (!config) return;

        var sizeSelect = document.getElementById('size-select');
        var playersSelect = document.getElementById('players-select');
        var layoutSelect = document.getElementById('layout-select');
        sizeSelect.innerHTML = '';
        playersSelect.innerHTML = '<option value="0">No bases</option>';
        layoutSelect.innerHTML = '';

        if (config.layouts) {
            for (var i = 0; i < config.layouts.length; i++) {
                var l = config.layouts[i];
                var opt = document.createElement('option');
                opt.value = l.value;
                opt.textContent = l.label;
                layoutSelect.appendChild(opt);
            }
            currentLayout = currentLayout || config.defaultLayout || config.layouts[0].value;
            layoutSelect.value = currentLayout;
        } else {
            currentLayout = null;
        }

        for (var i = 0; i < config.sizes.length; i++) {
            var s = config.sizes[i];
            var opt = document.createElement('option');
            opt.value = s.value;
            opt.textContent = s.label;
            sizeSelect.appendChild(opt);
        }

        currentSize = size || config.defaultSize;
        sizeSelect.value = currentSize;

        var playerOptions = config.playerCounts(currentSize);
        var playersGroup = document.getElementById('players-group');
        if (playerOptions.length === 0) {
            playersGroup.style.display = 'none';
        } else {
            playersGroup.style.display = '';
            for (var i = 0; i < playerOptions.length; i++) {
                var opt = document.createElement('option');
                opt.value = playerOptions[i];
                opt.textContent = playerOptions[i] + ' Players';
                playersSelect.appendChild(opt);
            }
        }

        currentPlayers = players || config.defaultPlayers;
        playersSelect.value = currentPlayers;

        var opts = config.rendererOptions ? config.rendererOptions(currentSize) : {};
        renderer = HexRenderer.create('hex-canvas', {
            hexSize: opts.hexSize || 40,
            flat: opts.flat || false,
            colors: config.getColors(currentStyle),
            labels: currentStyle === 'classic',
            onHexClick: onHexClick,
            onHexHover: onHexHover,
            bgColor: embedBgColor,
            fitScale: embedMode ? 0.98 : 0.9,
            useViewport: embedMode
        });

        regenerateMap();
    }

    function switchGame(game) {
        currentGame = game;
        currentPlayers = 0;

        var buttons = document.querySelectorAll('[data-game]');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('active');
            if (buttons[i].getAttribute('data-game') === game) {
                buttons[i].classList.add('active');
            }
        }

        var config = HexApp.getGameConfig(game);
        var editorTab = document.querySelector('[data-tab="editor"]');
        var styleGroup = document.getElementById('style-group');

        if (config && config.hasEditor) {
            editorTab.style.display = '';
        } else {
            editorTab.style.display = 'none';
            var activeTab = document.querySelector('.sidebar-tab.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'editor') {
                document.querySelector('[data-tab="random"]').click();
            }
        }

        if (config && config.styles) {
            styleGroup.style.display = '';
            var styleSelect = document.getElementById('style-select');
            styleSelect.innerHTML = '';
            for (var i = 0; i < config.styles.length; i++) {
                var opt = document.createElement('option');
                opt.value = config.styles[i];
                opt.textContent = config.styles[i].charAt(0).toUpperCase() + config.styles[i].slice(1);
                styleSelect.appendChild(opt);
            }
            currentStyle = gameStyles[game] || config.styles[0];
            styleSelect.value = currentStyle;
        } else {
            styleGroup.style.display = 'none';
        }

        var layoutGroup = document.getElementById('layout-group');
        var sizeGroup = document.getElementById('size-group');
        if (config && config.layouts) {
            layoutGroup.style.display = '';
            sizeGroup.style.display = 'none';
        } else {
            layoutGroup.style.display = 'none';
            sizeGroup.style.display = '';
            currentLayout = null;
        }

        loadGame(game, null, config ? config.defaultPlayers : 0);
        buildEditorPanel();
        updateUrl();
    }

    function regenerateMap() {
        var config = HexApp.getGameConfig(currentGame);
        if (!config) return;

        hexData = config.generate(currentSize, currentPlayers, currentSeed, currentLayout);

        if (config.constraints) {
            var attempts = 0;
            while (!config.constraints(hexData) && attempts < 100) {
                attempts++;
                hexData = config.generate(currentSize, currentPlayers, currentSeed + '_' + attempts, currentLayout);
            }
        }

        if (!renderer) { updateInfo(); return; }

        if (config.getImages) {
            var images = config.getImages(currentStyle);
            if (images && images._perHex) {
                renderer.images = images;
                var perHexPaths = {};
                for (var i = 0; i < hexData.length; i++) {
                    if (hexData[i].imagePath) perHexPaths[hexData[i].imagePath] = hexData[i].imagePath;
                }
                HexRenderer.preloadImages(perHexPaths, function() {
                    HexRenderer.setHexes(renderer, hexData);
                });
            } else if (images) {
                renderer.images = images;
                HexRenderer.preloadImages(images, function() {
                    HexRenderer.setHexes(renderer, hexData);
                });
            } else {
                renderer.images = null;
                HexRenderer.setHexes(renderer, hexData);
            }
        } else {
            renderer.images = null;
            HexRenderer.setHexes(renderer, hexData);
        }

        updateInfo();
    }

    function onHexClick(hex) {
        if (viewOnly) return;

        var config = HexApp.getGameConfig(currentGame);
        if (config && config.onHexClick) {
            config.onHexClick(hex);
            HexRenderer.render(renderer);
        }
        updateInfo();
    }

    function onHexHover(hex) {
        var info = document.getElementById('hex-info');
        if (info) {
            var name = hex.tileName || hex.type;
            var detail = '';
            var config = HexApp.getGameConfig(currentGame);
            if (config && config.getDescriptions) {
                var descs = config.getDescriptions();
                if (descs[hex.type]) {
                    name = descs[hex.type].name;
                    detail = descs[hex.type].desc;
                }
            }
            var text = hex.id + ' (' + hex.q + ',' + hex.r + ') — ' + name;
            if (detail) text += ': ' + detail;
            info.textContent = text;
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
        var playersGroup = document.getElementById('players-group');
        playersSelect.innerHTML = '<option value="0">No bases</option>';

        var config = HexApp.getGameConfig(currentGame);
        if (config) {
            var playerOptions = config.playerCounts(currentSize);
            if (playerOptions.length === 0) {
                playersGroup.style.display = 'none';
            } else {
                playersGroup.style.display = '';
                for (var i = 0; i < playerOptions.length; i++) {
                    var opt = document.createElement('option');
                    opt.value = playerOptions[i];
                    opt.textContent = playerOptions[i] + ' Players';
                    playersSelect.appendChild(opt);
                }
            }
        }
        playersSelect.value = '0';
    }

    function buildEditorPanel() {
        var container = document.getElementById('ring-resets');
        container.innerHTML = '';

        var config = HexApp.getGameConfig(currentGame);
        if (config && config.editorPanel) {
            config.editorPanel(container, {
                size: currentSize,
                resetRing: function(ring, terrain) {
                    if (config.resetRing) {
                        config.resetRing(ring, terrain, hexData);
                        if (renderer) HexRenderer.render(renderer);
                    }
                }
            });
        } else {
            container.innerHTML = '<p class="editor-hint">Click hexes to cycle terrain type.</p>';
        }
    }

    function applyStyle() {
        if (!renderer) return;
        var config = HexApp.getGameConfig(currentGame);
        if (!config) return;

        renderer.colors = config.getColors(currentStyle);
        renderer.labels = currentStyle === 'classic' && !(config.labels === false);

        if (config.getImages) {
            var images = config.getImages(currentStyle);
            if (images && images._perHex) {
                renderer.images = images;
                var perHexPaths = {};
                for (var i = 0; i < hexData.length; i++) {
                    if (hexData[i].imagePath) {
                        perHexPaths[hexData[i].imagePath] = hexData[i].imagePath;
                    }
                }
                HexRenderer.preloadImages(perHexPaths, function() {
                    HexRenderer.render(renderer);
                });
                return;
            } else if (images) {
                renderer.images = images;
                HexRenderer.preloadImages(images, function() {
                    HexRenderer.render(renderer);
                });
                return;
            } else {
                renderer.images = null;
            }
        } else {
            renderer.images = null;
        }

        HexRenderer.render(renderer);
    }

    function exportMap() {
        var config = HexApp.getGameConfig(currentGame);
        var data;

        if (config && config.exportMap) {
            data = config.exportMap(hexData, {
                game: currentGame,
                seed: currentSeed,
                size: currentSize,
                players: currentPlayers
            });
        } else {
            data = {
                game: currentGame,
                seed: currentSeed,
                size: currentSize,
                players: currentPlayers,
                hexes: hexData.map(function(h) {
                    return { id: h.id, q: h.q, r: h.r, type: h.type };
                })
            };
        }

        var textarea = document.getElementById('export-data');
        if (textarea) {
            textarea.value = JSON.stringify(data, null, 2);
        }
    }

    function exportSvg() {
        if (typeof HexSvg === 'undefined') return;
        var config = HexApp.getGameConfig(currentGame);
        var colors = (config && config.getColors) ? config.getColors(currentStyle) : {};
        var images = (config && config.getImages) ? config.getImages(currentStyle) : null;
        var flat = (config && config.orientation === 'flat');
        var svg = HexSvg.toSVG(hexData, {
            hexSize: 30,
            flat: flat,
            colors: colors,
            images: images,
            imageMode: images ? 'reference' : 'none',
            strokeColor: 'rgba(0,0,0,0.3)',
            strokeWidth: 1,
            labels: false
        });
        var blob = new Blob([svg], { type: 'image/svg+xml' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = currentGame + '-' + currentSize + 'r-' + currentSeed + '.svg';
        a.click();
        URL.revokeObjectURL(url);
    }

    function renderOffscreen(scale) {
        var config = HexApp.getGameConfig(currentGame);
        var flat = config && config.orientation === 'flat';
        var hexSize = renderer.hexSize;
        var padding = hexSize * 1.2;

        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (var i = 0; i < hexData.length; i++) {
            var hex = hexData[i];
            var pos = flat ? HexMath.axialToPixelFlat(hex.q, hex.r, hexSize) : HexMath.axialToPixelPointy(hex.q, hex.r, hexSize);
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
        var ctx = offCanvas.getContext('2d');
        ctx.scale(scale, scale);

        var ox = -minX + padding;
        var oy = -minY + padding;

        for (var i = 0; i < hexData.length; i++) {
            var hex = hexData[i];
            var pos = flat ? HexMath.axialToPixelFlat(hex.q, hex.r, hexSize) : HexMath.axialToPixelPointy(hex.q, hex.r, hexSize);
            var cx = pos.x + ox;
            var cy = pos.y + oy;
            var corners = HexMath.getHexCorners(cx, cy, hexSize * 0.95, flat);

            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (var c = 1; c < corners.length; c++) ctx.lineTo(corners[c].x, corners[c].y);
            ctx.closePath();

            var color = (renderer.colors && renderer.colors[hex.type]) || '#666';
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (renderer.images && renderer.images[hex.type] && renderer.imageCache && renderer.imageCache[hex.type]) {
                ctx.save();
                ctx.clip();
                var img = renderer.imageCache[hex.type];
                var imgSize = hexSize * 2 * 0.95;
                ctx.drawImage(img, cx - imgSize / 2, cy - imgSize / 2, imgSize, imgSize);
                ctx.restore();
            }

            if (hex.overlay) {
                var r = hexSize * (hex.overlay.size || 0.35);
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fillStyle = hex.overlay.color || '#C62828';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                if (hex.overlay.text) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold ' + (r * 1.2) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(hex.overlay.text, cx, cy + 1);
                }
            }
        }
        return offCanvas;
    }

    function exportPng() {
        if (!renderer || !hexData.length) return;
        var offCanvas = renderOffscreen(2);
        offCanvas.toBlob(function(blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = currentGame + '-' + currentSeed + '-' + currentSize + '.png';
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    function exportPdf() {
        if (!renderer || !hexData.length) return;
        var offCanvas = renderOffscreen(2);
        var imgW = offCanvas.width;
        var imgH = offCanvas.height;

        var pageW = 595.28;
        var pageH = 841.89;
        var margin = 30;
        var availW = pageW - margin * 2;
        var availH = pageH - margin * 2;
        var ratio = Math.min(availW / imgW, availH / imgH);
        var drawW = imgW * ratio;
        var drawH = imgH * ratio;
        var offsetX = (pageW - drawW) / 2;
        var offsetY = (pageH - drawH) / 2;

        offCanvas.toBlob(function(jpegBlob) {
            var reader = new FileReader();
            reader.onload = function() {
                var jpegBytes = new Uint8Array(reader.result);
                var imgObjStr = '5 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + imgW + ' /Height ' + imgH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpegBytes.length + ' >>\nstream\n';
                var imgEndStr = '\nendstream\nendobj\n';

                var offset = 0;
                var offsets = [];
                var parts = [];

                var header = '%PDF-1.4\n';
                parts.push(header); offset += header.length;

                var obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
                offsets.push(offset); parts.push(obj1); offset += obj1.length;

                var obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
                offsets.push(offset); parts.push(obj2); offset += obj2.length;

                var obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW + ' ' + pageH + '] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n';
                offsets.push(offset); parts.push(obj3); offset += obj3.length;

                var stream = 'q ' + drawW.toFixed(2) + ' 0 0 ' + drawH.toFixed(2) + ' ' + offsetX.toFixed(2) + ' ' + (pageH - offsetY - drawH).toFixed(2) + ' cm /Img Do Q';
                var obj4 = '4 0 obj\n<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream\nendobj\n';
                offsets.push(offset); parts.push(obj4); offset += obj4.length;

                offsets.push(offset);
                offset += imgObjStr.length + jpegBytes.length + imgEndStr.length;

                var xrefStart = offset;
                var xrefStr = 'xref\n0 6\n0000000000 65535 f \n';
                for (var x = 0; x < offsets.length; x++) {
                    xrefStr += String(offsets[x]).padStart(10, '0') + ' 00000 n \n';
                }
                xrefStr += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF';

                var textEncoder = new TextEncoder();
                var textBytes = textEncoder.encode(parts.join(''));
                var imgObjBytes = textEncoder.encode(imgObjStr);
                var imgEndBytes = textEncoder.encode(imgEndStr);
                var xrefBytes = textEncoder.encode(xrefStr);

                var totalLen = textBytes.length + imgObjBytes.length + jpegBytes.length + imgEndBytes.length + xrefBytes.length;
                var pdfBuffer = new Uint8Array(totalLen);
                var p = 0;
                pdfBuffer.set(textBytes, p); p += textBytes.length;
                pdfBuffer.set(imgObjBytes, p); p += imgObjBytes.length;
                pdfBuffer.set(jpegBytes, p); p += jpegBytes.length;
                pdfBuffer.set(imgEndBytes, p); p += imgEndBytes.length;
                pdfBuffer.set(xrefBytes, p);

                var blob = new Blob([pdfBuffer], { type: 'application/pdf' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = currentGame + '-' + currentSeed + '-' + currentSize + '.pdf';
                a.click();
                URL.revokeObjectURL(url);
            };
            reader.readAsArrayBuffer(jpegBlob);
        }, 'image/jpeg', 0.95);
    }

    function importMap() {
        var textarea = document.getElementById('import-data');
        var json = textarea.value.trim();
        if (!json) return;

        try {
            var data = JSON.parse(json);
            var config = HexApp.getGameConfig(currentGame);

            if (Array.isArray(data) && config && config.importMap) {
                var result = config.importMap(data, hexData);
                if (result) {
                    hexData = result;
                    if (renderer) HexRenderer.render(renderer);
                }
            } else if (data.hexes && Array.isArray(data.hexes)) {
                importHexFormat(data);
            }
        } catch (e) {
            textarea.style.borderColor = '#C62828';
            setTimeout(function() { textarea.style.borderColor = ''; }, 1500);
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

    function setupEmbedBridge() {
        window.addEventListener('message', function(event) {
            var msg = event.data;
            if (!msg || typeof msg !== 'object' || !msg.type) return;

            if (msg.type === 'hexmap:getMap') {
                var config = HexApp.getGameConfig(currentGame);
                var response;

                if (config && config.exportForParent) {
                    response = {
                        type: 'hexmap:mapData',
                        format: currentGame,
                        game: currentGame,
                        data: config.exportForParent(hexData, {
                            seed: currentSeed,
                            size: currentSize,
                            players: currentPlayers
                        })
                    };
                } else {
                    response = {
                        type: 'hexmap:mapData',
                        format: 'hex',
                        game: currentGame,
                        data: {
                            game: currentGame,
                            seed: currentSeed,
                            size: currentSize,
                            players: currentPlayers,
                            hexes: hexData.map(function(h) {
                                return { id: h.id, q: h.q, r: h.r, type: h.type };
                            })
                        }
                    };
                }

                if (event.source) {
                    event.source.postMessage(response, event.origin !== 'null' ? event.origin : '*');
                }
            }

            if (msg.type === 'hexmap:exportSvg') {
                if (typeof HexSvg !== 'undefined' && event.source) {
                    var config2 = HexApp.getGameConfig(currentGame);
                    var colors2 = (config2 && config2.getColors) ? config2.getColors(currentStyle) : {};
                    var flat2 = (config2 && config2.orientation === 'flat');
                    var svgStr = HexSvg.toSVG(hexData, {
                        hexSize: msg.hexSize || 30,
                        flat: flat2,
                        colors: colors2,
                        strokeColor: 'rgba(0,0,0,0.3)',
                        strokeWidth: 1
                    });
                    event.source.postMessage({ type: 'hexmap:svgData', svg: svgStr }, event.origin !== 'null' ? event.origin : '*');
                }
            }

            if (msg.type === 'hexmap:setMap') {
                var config = HexApp.getGameConfig(currentGame);
                if (config && config.importFromParent) {
                    var imported = config.importFromParent(msg.data);
                    if (imported && Array.isArray(imported)) {
                        config.importMap(imported, hexData);
                        if (renderer) HexRenderer.render(renderer);
                    }
                }
            }

            if (msg.type === 'hexmap:regenerate') {
                if (msg.random) {
                    currentSeed = String(Date.now());
                    document.getElementById('seed-input').value = currentSeed;
                } else if (msg.seed) {
                    currentSeed = msg.seed;
                    document.getElementById('seed-input').value = currentSeed;
                }
                if (msg.size) currentSize = msg.size;
                if (msg.players !== undefined) currentPlayers = msg.players;
                if (msg.layout) currentLayout = msg.layout;
                if (msg.style) {
                    currentStyle = msg.style;
                    gameStyles[currentGame] = currentStyle;
                }
                regenerateMap();
                if (msg.style) applyStyle();
            }

            if (msg.type === 'hexmap:setStyle') {
                if (msg.style) {
                    currentStyle = msg.style;
                    gameStyles[currentGame] = currentStyle;
                    applyStyle();
                }
            }

            if (msg.type === 'hexmap:setGame') {
                if (msg.game) {
                    switchGame(msg.game);
                    if (msg.style) {
                        currentStyle = msg.style;
                        gameStyles[msg.game] = msg.style;
                        applyStyle();
                    }
                }
            }
        });
    }

    function updateUrl() {
        if (embedMode) return;
        var params = new URLSearchParams();
        params.set('game', currentGame);
        params.set('seed', currentSeed);
        if (currentSize) params.set('size', currentSize);
        if (currentPlayers) params.set('players', currentPlayers);
        if (currentStyle && currentStyle !== 'classic') params.set('style', currentStyle);
        if (currentLayout) params.set('layout', currentLayout);
        var newUrl = window.location.pathname + '?' + params.toString();
        window.history.replaceState({}, '', newUrl);
    }

    HexApp.init = init;
})();

document.addEventListener('DOMContentLoaded', HexApp.init);
