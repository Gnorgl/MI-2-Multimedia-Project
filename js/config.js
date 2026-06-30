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

// Beim Laden der Seite Highscore UND Münzen aus dem LocalStorage holen
document.addEventListener("DOMContentLoaded", () => {
    // 1. Highscore laden (Nutzt den korrekten Key für die Personen)
    const savedHighScore = localStorage.getItem('heli_people_highscore') || 0;
    const scoreDisplay = document.querySelector('.score-display');
    if (scoreDisplay) {
        scoreDisplay.innerText = String(savedHighScore).padStart(4, '0');
    }

    // 2. NEU: Münzen laden
    const savedCoins = localStorage.getItem('heli_total_coins') || 0;
    const coinDisplay = document.querySelector('.coin-display');
    if (coinDisplay) {
        coinDisplay.innerText = String(savedCoins).padStart(4, '0');
    }
});