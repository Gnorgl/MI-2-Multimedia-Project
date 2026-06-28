const config = {
    type: Phaser.AUTO,
    // Hier sagen wir Phaser, in welches HTML-Element das Spiel soll
    parent: 'game-container', 
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800, // Hier breiter gemacht (vorher 450)
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

// Beim Laden der Seite den Highscore aus dem LocalStorage holen und im HTML anzeigen
document.addEventListener("DOMContentLoaded", () => {
    const savedHighScore = localStorage.getItem('heli_highscore') || 0;
    const scoreDisplay = document.querySelector('.score-display');
    if (scoreDisplay) {
        scoreDisplay.innerText = String(savedHighScore).padStart(4, '0');
    }
});