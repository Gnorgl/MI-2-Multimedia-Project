// Phaser 3 Hauptkonfiguration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container', // Verweist auf die ID in der index.html
    backgroundColor: '#000000', // Tiefschwarzer Weltraum-Hintergrund
    
    // Physik-Einstellungen
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // Keine globale Schwerkraft, da Phase 1 (Rakete) schwerelos fliegt.
            // Die Schwerkraft fuer Phase 2 aktivieren wir spaeter gezielt nur fuer die Kapsel.
            debug: false // Auf true setzen, um Hitboxen als Linien zu sehen
        }
    },
    
    // Registrierung aller Szenen in der richtigen Reihenfolge
    // Phaser startet automatisch mit der ersten Szene in dieser Liste
    scene: [
        BootScene,
        MenuScene,
        UpgradeScene,
        GameScene
    ]
};

// Starten der Phaser-Spielinstanz
const game = new Phaser.Game(config);