var HexApp = (function() {
    var gameRegistry = {};

    function registerGame(key, config) {
        gameRegistry[key] = config;
    }

    function getGameConfig(key) {
        return gameRegistry[key] || null;
    }

    function getRegisteredGames() {
        return Object.keys(gameRegistry);
    }

    return {
        registerGame: registerGame,
        getGameConfig: getGameConfig,
        getRegisteredGames: getRegisteredGames,
        gameRegistry: gameRegistry
    };
})();
