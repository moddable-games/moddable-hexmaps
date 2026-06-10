import { HexApp } from './game-registry.js';
import './games/nukes.js';
import './games/talisman.js';
import './games/twilight.js';
import './games/colony.js';
import './games/mongo.js';
import './games/endless.js';

export { HexApp };

if (typeof window !== 'undefined') {
    window.HexApp = HexApp;
}
