class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.cursors = null;
        this.leftKey = null;
        this.rightKey = null;

        // --- TUNING-EINSTELLUNGEN ---
        this.heliSettings = {
            startSpeedX: 120,     // Sofortige Geschwindigkeit beim ersten Tastendruck
            maxSpeedX: 280,       // Endgeschwindigkeit nach laengerem Druecken
            maxSpeedY: 400,       // Maximale Fall-/Steiggeschwindigkeit
            liftPower: -350,      // Knackiger Impuls nach oben
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
        // --- 1. WELTGRENZEN ---
        // Die Breite der Weltgrenzen wurde von 600 auf 800 erhoeht
        this.physics.world.setBounds(0, -999999, 800, 999999 + 800); 

        // --- 2. LANDEPLATTFORM ERZEUGEN (SCHMAL) ---
        this.platforms = this.physics.add.staticGroup();
        
        let platCanvas = this.textures.createCanvas('landing_pad', 100, 20);
        let platCtx = platCanvas.context;
        platCtx.fillStyle = '#555555'; 
        platCtx.fillRect(0, 0, 100, 20);
        platCanvas.refresh();

        // Genau in der neuen Mitte platziert (X = 400 statt vorher 300)
        let startPlatform = this.platforms.create(400, 790, 'landing_pad');
        startPlatform.refreshBody();

        // --- 3. HELIKOPTER ERZEUGEN ---
        // Startet nun ebenfalls zentriert bei X = 400
        this.player = this.physics.add.sprite(400, 765, 'heli_placeholder'); 
        this.player.setCollideWorldBounds(true, 0, 0, true);

        // --- 4. KOLLISIONEN & STEUERUNG ---
        this.physics.add.collider(this.player, this.platforms);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    update() {
        // --- ABSTURZ-CHECK (UNTERER RAND) ---
        // Wenn der Heli neben die Plattform faellt und den Bildschirm verlaesst, 
        // startet das Spiel neu.
        if (this.player.y > 820) {
            this.scene.restart();
            return;
        }

        // Wir setzen die Beschleunigungen am Anfang des Frames komplett zurueck
        this.player.setAccelerationX(0);
        this.player.setAccelerationY(0);    

        // --- BODEN-STOPP-CHECK ---
        // Wenn der Heli den Boden beruehrt UND keine Taste gedrueckt wird, 
        // stoppen wir ihn komplett, damit er nicht schlittert.
        if (this.player.body.blocked.down && !this.cursors.left.isDown && !this.leftKey.isDown && !this.cursors.right.isDown && !this.rightKey.isDown) {
            this.player.setVelocity(0, 0);
            return; // Wir brechen das restliche Update ab, der Heli ruht am Boden
        }

        // LINKS FLIEGEN (Steigen nach links-oben)
        if (this.cursors.left.isDown || this.leftKey.isDown) {
            if (this.player.body.velocity.x > -this.heliSettings.startSpeedX) {
                this.player.setVelocityX(-this.heliSettings.startSpeedX);
            }
            this.player.setAccelerationX(-this.heliSettings.accelerationX);
            this.applyLift();
        } 
        // RECHTS FLIEGEN (Steigen nach rechts-oben)
        else if (this.cursors.right.isDown || this.rightKey.isDown) {
            if (this.player.body.velocity.x < this.heliSettings.startSpeedX) {
                this.player.setVelocityX(this.heliSettings.startSpeedX);
            }
            this.player.setAccelerationX(this.heliSettings.accelerationX);
            this.applyLift();
        }
        // KONSTANTER FALL (Version 3)
        else {
            // Der Heli faellt augenblicklich mit der vollen Kraft des Lift-Werts nach unten
            this.player.setVelocityY(Math.abs(this.heliSettings.liftPower));
            
            // Auf der X-Achse laeuft er einfach mit seiner aktuellen Geschwindigkeit weiter (Spiegelung)
            this.player.setAccelerationX(0);
        }

        // Geschwindigkeitsbegrenzungen (Caps) fuer beide Achsen
        this.player.body.setMaxVelocityX(this.heliSettings.maxSpeedX);
        this.player.body.setMaxVelocityY(this.heliSettings.maxSpeedY);
    }

    applyLift() {
        this.player.setVelocityY(this.heliSettings.liftPower);
    }

    // Hilfsfunktion: Diese rufen wir spaeter auf, wenn das Spiel vorbei ist
    updateHighScoreHTML(newScore) {
        let highScore = localStorage.getItem('heli_highscore') || 0;
        
        if (newScore > highScore) {
            highScore = newScore;
            localStorage.setItem('heli_highscore', highScore);
        }

        // Updatet die Zahl direkt im linken HTML-Panel (wird mit fuehrenden Nullen formatiert)
        document.querySelector('.score-display').innerText = String(highScore).padStart(4, '0');
    }
}