const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.dirname(__filename);

const context = vm.createContext({ module: {}, exports: {}, console: console, Math: Math, Infinity: Infinity });

const files = ['hex-math.js', 'xorshift.js', 'hex-svg.js'];
for (const file of files) {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
}

module.exports = {
    HexMath: context.HexMath,
    HexSvg: context.HexSvg,
    XorShift128: context.XorShift128
};
