class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.cursors = null;
        this.leftKey = null;
        this.rightKey = null;

        // --- DEINE SHOP-EINSTELLUNGEN ---
        this.heliSettings = {
            startSpeedX: 120,     // Sofortige Geschwindigkeit beim ersten Tastendruck
            maxSpeedX: 280,       // Endgeschwindigkeit nach längerem Drücken
            maxSpeedY: 400,       // Maximale Fall-/Steiggeschwindigkeit
            liftPower: -350,      // Knackiger Impuls nach oben (wie in V1)
            accelerationX: 400,   // Wie schnell er von Start- auf Max-Speed beschleunigt
            dragX: 300            // Wie schnell er ausrollt (Entschleunigung)
        };
    }

    preload() {
        let canvas = this.textures.createCanvas('heli_placeholder', 40, 30);
        let ctx = canvas.context;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 40, 30);
        canvas.refresh();
    }

    create() {
        this.player = this.physics.add.sprite(300, 600, 'heli_placeholder'); 
        this.player.setCollideWorldBounds(true);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    update() {
        this.player.setAccelerationX(0);

        // LINKS FLIEGEN (Winkel: Schräg nach oben-links)
        if (this.cursors.left.isDown || this.leftKey.isDown) {
            if (this.player.body.velocity.x > -this.heliSettings.startSpeedX) {
                this.player.setVelocityX(-this.heliSettings.startSpeedX);
            }
            this.player.setAccelerationX(-this.heliSettings.accelerationX);
            this.player.setVelocityY(this.heliSettings.liftPower); // z.B. -350
        } 
        // RECHTS FLIEGEN (Winkel: Schräg nach oben-rechts)
        else if (this.cursors.right.isDown || this.rightKey.isDown) {
            if (this.player.body.velocity.x < this.heliSettings.startSpeedX) {
                this.player.setVelocityX(this.heliSettings.startSpeedX);
            }
            this.player.setAccelerationX(this.heliSettings.accelerationX);
            this.player.setVelocityY(this.heliSettings.liftPower); // z.B. -350
        }
        // SOFORTIGER FALL (Wenn keine Taste gedrückt wird)
        else {
            // Wir spiegeln den Y-Vektor sofort nach unten.
            // Wenn liftPower -350 ist, fliegt er mit +350 (Math.abs macht es positiv) sofort nach unten.
            this.player.setVelocityY(Math.abs(this.heliSettings.liftPower));
        }

        // Horizontale Geschwindigkeitsbegrenzung
        this.player.body.setMaxVelocityX(this.heliSettings.maxSpeedX);
    }

    applyLift() {
        this.player.setVelocityY(this.heliSettings.liftPower);
    }
}