const config = {
    type: Phaser.AUTO,
    // Hier sagen wir Phaser, in welches HTML-Element das Spiel soll
    parent: 'game-container', 
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 600, // Hier breiter gemacht (vorher 450)
        height: 800
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);