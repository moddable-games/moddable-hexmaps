const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const TILE_SIZE = 400;
const STAR_SCALE = 0.55;
const STARFIELD_DOTS = 60;
const OUTPUT_DIR = path.join(__dirname, '..', 'img', 'tiles', 'endless');
const SOURCE_DIR = '/tmp/Systems';

const BG_CENTER = '#3d3d3d';
const BG_EDGE = '#2a2a2a';

function slugify(name) {
    return name.replace(/\.png$/i, '').replace(/\s+/g, '_');
}

function drawStarfield(ctx, width, height, seed) {
    var rng = seed;
    function pseudoRandom() {
        rng = (rng * 1664525 + 1013904223) & 0xFFFFFFFF;
        return (rng >>> 0) / 0xFFFFFFFF;
    }

    for (var i = 0; i < STARFIELD_DOTS; i++) {
        var x = pseudoRandom() * width;
        var y = pseudoRandom() * height;
        var brightness = 80 + Math.floor(pseudoRandom() * 120);
        var size = 0.5 + pseudoRandom() * 1.2;
        ctx.fillStyle = 'rgba(' + brightness + ',' + brightness + ',' + (brightness + 20) + ',0.6)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
}

async function compositeTile(spritePath, outputPath, index) {
    const canvas = createCanvas(TILE_SIZE, TILE_SIZE);
    const ctx = canvas.getContext('2d');

    var gradient = ctx.createRadialGradient(
        TILE_SIZE / 2, TILE_SIZE / 2, 0,
        TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2
    );
    gradient.addColorStop(0, BG_CENTER);
    gradient.addColorStop(1, BG_EDGE);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

    drawStarfield(ctx, TILE_SIZE, TILE_SIZE, index * 7919);

    try {
        const sprite = await loadImage(spritePath);
        var maxDim = Math.max(sprite.width, sprite.height);
        var targetSize = TILE_SIZE * STAR_SCALE;
        var scale = targetSize / maxDim;
        var drawW = sprite.width * scale;
        var drawH = sprite.height * scale;
        var x = (TILE_SIZE - drawW) / 2;
        var y = (TILE_SIZE - drawH) / 2;

        ctx.drawImage(sprite, x, y, drawW, drawH);
    } catch (e) {
        console.error('  Failed to load sprite: ' + spritePath, e.message);
    }

    var buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    var existing = fs.readdirSync(OUTPUT_DIR);
    for (var f of existing) {
        if (f.endsWith('.png')) fs.unlinkSync(path.join(OUTPUT_DIR, f));
    }

    var sprites = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.png'));
    console.log('Found ' + sprites.length + ' star sprites');

    var imageMap = {};

    for (var i = 0; i < sprites.length; i++) {
        var filename = sprites[i];
        var systemName = filename.replace(/\.png$/i, '');
        var slug = slugify(filename);
        var outputFile = slug + '.png';
        var spritePath = path.join(SOURCE_DIR, filename);
        var outputPath = path.join(OUTPUT_DIR, outputFile);

        await compositeTile(spritePath, outputPath, i);
        imageMap[systemName] = 'endless/' + outputFile;
        process.stdout.write('  [' + (i + 1) + '/' + sprites.length + '] ' + systemName + '\n');
    }

    console.log('\nGenerated ' + Object.keys(imageMap).length + ' tiles in img/tiles/endless/');

    var dataContent = 'var EndlessSystems = ' + JSON.stringify({
        images: imageMap
    }, null, 4) + ';\n';

    var dataPath = path.join(__dirname, '..', 'data', 'endless-systems.js');
    fs.writeFileSync(dataPath, dataContent);
    console.log('Wrote data/endless-systems.js');
}

main().catch(e => { console.error(e); process.exit(1); });
