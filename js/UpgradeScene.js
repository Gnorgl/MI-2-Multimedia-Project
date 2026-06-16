class UpgradeScene extends Phaser.Scene {
    constructor() {
        super('UpgradeScene');
    }

    create() {
        let width = this.scale.width;
        let height = this.scale.height;

        this.add.text(width / 2, height * 0.2, "=== UPGRADE SHOP ===", {
            fontSize: '28px',
            fill: '#ffff00',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.4, `Münzen: ${GameState.muenzen}`, {
            fontSize: '22px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.7, "Press Space for Launch", {
            fontSize: '20px',
            fill: '#00ff00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.scene.start('GameScene');
        }
    }
}