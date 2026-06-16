class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // Hole die aktuellen Ausmasse des gesamten Browserfensters
        let width = this.scale.width;
        let height = this.scale.height;

        // Titel - Perfekt zentriert im oberen Drittel
        this.add.text(width / 2, height * 0.3, "LUNAR LANDER: IGNITION", {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Option 1 - Mittig
        this.add.text(width / 2, height * 0.5, "Press Enter for Shop", {
            fontSize: '20px',
            fill: '#00ff00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Option 2 - Etwas darunter
        this.add.text(width / 2, height * 0.58, "Press Space for Launch", {
            fontSize: '20px',
            fill: '#aaaaaa',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Tasten registrieren
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.scene.start('UpgradeScene');
        }
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.scene.start('GameScene');
        }
    }
}