class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Hier werden spaeter Assets geladen.
        // Fuer den Dummy zeichnen wir nur einen kurzen Text.
        this.add.text(20, 20, "Lade Assets...", { fill: '#ffffff' });
    }

    create() {
        // Sofortiger Wechsel zum Hauptmenue
       this.scene.start('GameScene'); // Startet direkt die GameScene mit dem integrierten Menue!
    }
}