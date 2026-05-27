function XorShift128(seed) {
    this.x = (seed ? seed >>> 0 : 123456789);
    this.y = 362436069;
    this.z = 521288629;
    this.w = 88675123;
}

XorShift128.prototype.next = function() {
    var t = this.x ^ (this.x << 11) & 0x7FFFFFFF;
    this.x = this.y;
    this.y = this.z;
    this.z = this.w;
    this.w = (this.w ^ (this.w >> 19)) ^ (t ^ (t >> 8));
    return this.w;
};

XorShift128.prototype.unit = function() {
    return this.next() / 0x80000000;
};

XorShift128.prototype.integer = function(min, max) {
    min = Math.floor(min);
    max = Math.floor(max);
    return Math.floor(this.unit() * (max - min + 1)) + min;
};

XorShift128.prototype.reseed = function(seed) {
    this.x = (seed ? seed >>> 0 : 123456789);
    this.y = 362436069;
    this.z = 521288629;
    this.w = 88675123;
};

function createSeededRng(seed) {
    var numericSeed = 0;
    if (typeof seed === 'number') {
        numericSeed = seed;
    } else {
        var str = String(seed);
        for (var i = 0; i < str.length; i++) {
            numericSeed = ((numericSeed << 5) - numericSeed) + str.charCodeAt(i);
            numericSeed = numericSeed | 0;
        }
    }
    return new XorShift128(numericSeed);
}

function seededRandom(id, seed, min, max) {
    var encoder = new TextEncoder();
    var encoded = encoder.encode(String(id)).join('');
    var idNum = parseInt(encoded) || 321;
    var seedNum = parseInt(seed) || 1979;
    var finalSeed = ((idNum * seedNum) * 123) + idNum + seedNum;
    var rng = new XorShift128(finalSeed);
    return rng.integer(min, max);
}
