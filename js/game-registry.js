var gameRegistry = {};

export function registerGame(key, config) {
    gameRegistry[key] = config;
}

export function getGameConfig(key) {
    return gameRegistry[key] || null;
}

export function getRegisteredGames() {
    return Object.keys(gameRegistry);
}

export var HexApp = {
    registerGame: registerGame,
    getGameConfig: getGameConfig,
    getRegisteredGames: getRegisteredGames
};
