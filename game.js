// game.js - Dynamische Anpassung fuer perfekte Schaerfe
const config = {
    type: Phaser.AUTO,
    // Wir entfernen feste Breiten/Hoehen, da RESIZE das dynamisch regelt
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.RESIZE, // Passt die Aufloesung dynamisch an das Fenster an
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, UpgradeScene, GameScene]
};

const game = new Phaser.Game(config);