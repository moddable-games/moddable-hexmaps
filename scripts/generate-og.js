import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WIDTH = 1200;
const HEIGHT = 630;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#0a1a0d';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Draw hex grid pattern
const hexSize = 28;
const colors = ['#2196F3', '#4CAF50', '#795548', '#8BC34A', '#FFC107', '#4CAF50', '#2196F3', '#8BC34A', '#795548', '#4CAF50', '#FFC107', '#8BC34A', '#4CAF50'];

function drawHex(cx, cy, size, fillColor, alpha) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 30);
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// Seed the RNG for consistent output
let seed = 42;
function rng() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
}

// Generate hex grid across the image
const rowHeight = hexSize * Math.sqrt(3);
const colWidth = hexSize * 1.5;

for (let row = -1; row < HEIGHT / rowHeight + 1; row++) {
    for (let col = -1; col < WIDTH / colWidth + 1; col++) {
        const cx = col * colWidth + 100;
        const cy = row * rowHeight + (col % 2 ? rowHeight / 2 : 0) + 50;
        const color = colors[Math.floor(rng() * colors.length)];

        // Fade out toward edges and right side for text space
        let alpha = 0.6;
        const distFromCenter = Math.sqrt(Math.pow((cx - WIDTH * 0.35) / WIDTH, 2) + Math.pow((cy - HEIGHT / 2) / HEIGHT, 2));
        alpha = Math.max(0.15, 0.7 - distFromCenter * 1.2);

        // Fade on right side for text
        if (cx > WIDTH * 0.55) {
            alpha *= Math.max(0, 1 - (cx - WIDTH * 0.55) / (WIDTH * 0.35));
        }

        drawHex(cx, cy, hexSize * 0.92, color, alpha);
    }
}

// Overlay gradient from right for text legibility
const grad = ctx.createLinearGradient(WIDTH * 0.45, 0, WIDTH, 0);
grad.addColorStop(0, 'rgba(10,26,13,0)');
grad.addColorStop(0.4, 'rgba(10,26,13,0.7)');
grad.addColorStop(1, 'rgba(10,26,13,0.95)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Bottom gradient
const gradBot = ctx.createLinearGradient(0, HEIGHT * 0.7, 0, HEIGHT);
gradBot.addColorStop(0, 'rgba(10,26,13,0)');
gradBot.addColorStop(1, 'rgba(10,26,13,0.8)');
ctx.fillStyle = gradBot;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Text - title
ctx.textAlign = 'left';
ctx.fillStyle = '#4cdf7a';
ctx.font = '600 14px sans-serif';
ctx.letterSpacing = '2px';
ctx.fillText('MODDABLE HEXMAPS', WIDTH * 0.55, HEIGHT * 0.35);

ctx.fillStyle = '#ffffff';
ctx.font = '700 52px sans-serif';
ctx.fillText('One engine.', WIDTH * 0.55, HEIGHT * 0.48);

ctx.fillStyle = '#4cdf7a';
ctx.font = '700 52px sans-serif';
ctx.fillText('Six worlds.', WIDTH * 0.55, HEIGHT * 0.56 + 20);

ctx.fillStyle = 'rgba(255,255,255,0.6)';
ctx.font = '400 16px sans-serif';
ctx.fillText('Nukes · Talisman · Twilight Imperium', WIDTH * 0.55, HEIGHT * 0.68);
ctx.fillText('Colony · Planet Mongo · Endless Skies', WIDTH * 0.55, HEIGHT * 0.73);

ctx.fillStyle = 'rgba(255,255,255,0.35)';
ctx.font = '400 14px sans-serif';
ctx.fillText('hex.moddable.games', WIDTH * 0.55, HEIGHT * 0.85);

// Save
const outputPath = path.join(__dirname, '..', 'assets', 'og-image.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);
console.log('OG image saved to', outputPath);
