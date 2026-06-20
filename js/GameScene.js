class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init() {
        this.distanz = 0;
        this.aktuelleStufe = 1;
        this.maxStufen = GameState.rakete.tankStufe;
        this.istAmFliegen = false;
        this.phase = 'rakete'; 
        
        this.flugGeschwindigkeit = 100; 

        // Timing-Fenster Parameter
        this.stufenDauer = 3000; 
        this.stufenTimer = 0;
        this.perfektFensterStart = 2300; 
        this.perfektFensterEnde = 2900;   

        // Kapsel Parameter
        this.kapselTreibstoff = GameState.kapsel.tankStufe * 100;
        this.kapselMaxTreibstoff = this.kapselTreibstoff;
        this.letzteSinkrate = 0;
        this.kapselZusatzBoost = false;
    }

    create() {
        let width = this.scale.width;
        let height = this.scale.height;

        // 1. PROZEDURALER STERNEN-HINTERGRUND
        this.sterne = [];
        for (let i = 0; i < 100; i++) {
            let x = Phaser.Math.Between(0, width);
            let y = Phaser.Math.Between(0, height);
            let groesse = Phaser.Math.Between(1, 3);
            let stern = this.add.rectangle(x, y, groesse, groesse, 0xffffff);
            this.sterne.push({
                objekt: stern,
                speedFaktor: groesse * 0.5
            });
        }

        // 2. DAS SPIELOBJEKT
        this.raketePositionX = width * 0.25;
        this.rakete = this.add.rectangle(this.raketePositionX, height / 2, 60, 20, 0xffffff);
        this.physics.add.existing(this.rakete);
        this.rakete.body.setAllowGravity(false);

        // 3. UI ELEMENTE
        this.uiText = this.add.text(20, 20, 'Druecke LEERTASTE zum Starten!', {
            fontSize: '20px', fill: '#ffffff', fontFamily: 'Arial'
        });

        this.statusText = this.add.text(20, 60, '', {
            fontSize: '24px', fill: '#00ff00', fontFamily: 'Arial'
        });

        this.balkenHintergrund = this.add.rectangle(width / 2, 30, 200, 20, 0x333333);
        this.balkenTreibstoff = this.add.rectangle(width / 2, 30, 200, 20, 0x00ff00);

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update(time, delta) {
        let width = this.scale.width;
        let height = this.scale.height;

        // === LOGIK PHASE 1: RAKETENFLUG ===
        if (this.phase === 'rakete') {
            if (!this.istAmFliegen && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                this.istAmFliegen = true;
                this.uiText.setText('Rakete fliegt! Timing abwarten...');
                return; 
            }

            if (this.istAmFliegen) {
                this.distanz += Math.floor((this.flugGeschwindigkeit * delta) / 1000);
                this.uiText.setText(`Stufe: ${this.aktuelleStufe}/${this.maxStufen} | Distanz: ${this.distanz}m | Speed: ${this.flugGeschwindigkeit}km/h`);

                this.sterne.forEach(stern => {
                    stern.objekt.x -= (this.flugGeschwindigkeit * 0.05) * stern.speedFaktor * (delta / 16);
                    if (stern.objekt.x < 0) {
                        stern.objekt.x = width;
                        stern.objekt.y = Phaser.Math.Between(0, height);
                    }
                });

                this.stufenTimer += delta;
                let verbleibend = 1 - (this.stufenTimer / this.stufenDauer);
                this.balkenTreibstoff.width = Math.max(0, 200 * verbleibend);
                this.balkenTreibstoff.setFillStyle(this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde ? 0xffff00 : 0x00ff00);

                if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.trenneStufeAb();
                if (this.stufenTimer >= this.stufenDauer) this.verpasseStufe();
            }
        }
        
        // === LOGIK PHASE 2: KAPSEL-SINKFLUG ===
        else if (this.phase === 'kapsel') {
            if (this.rakete.y <= height - 50) this.letzteSinkrate = this.rakete.body.velocity.y;

            this.uiText.setText(`Kapsel-Phase | Treibstoff: ${Math.floor(this.kapselTreibstoff)}L | Sinkrate: ${Math.floor(this.letzteSinkrate || 0)}m/s`);
            let tankProzent = this.kapselTreibstoff / this.kapselMaxTreibstoff;
            this.balkenTreibstoff.width = Math.max(0, 200 * tankProzent);
            this.balkenTreibstoff.setFillStyle(0x00ffff);

            this.sterne.forEach(stern => {
                stern.objekt.y -= (this.rakete.body.velocity.y * 0.02) * stern.speedFaktor;
                if (stern.objekt.y < 0) { stern.objekt.y = height; stern.objekt.x = Phaser.Math.Between(0, width); }
            });

            if (this.cursors.left.isDown) this.rakete.angle -= 2;
            else if (this.cursors.right.isDown) this.rakete.angle += 2;

            if (this.cursors.up.isDown && this.kapselTreibstoff > 0) {
                // Kraft von 15 auf 3 reduziert fuer sanfteres Gegensteuern
                let schubKraft = 5 * GameState.kapsel.triebwerkStufe;
                let angleInRadians = Phaser.Math.DegToRad(this.rakete.angle - 90);
                
                this.rakete.body.velocity.x += Math.cos(angleInRadians) * schubKraft * (delta / 16);
                this.rakete.body.velocity.y += Math.sin(angleInRadians) * schubKraft * (delta / 16);

                // Verbrauch proportional anpassen (etwas weniger Verbrauch, da man laenger druecken muss)
                this.kapselTreibstoff -= 0.25 * (delta / 16);
            }

            if (this.rakete.y > height - 50) this.pruefeLandung();
        }
    }

    trenneStufeAb() {
        if (this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde) {
            this.flugGeschwindigkeit += (150 * GameState.rakete.triebwerkStufe);
            this.zeigeFeedbackText("PERFEKT! +BOOST");
        } else {
            this.zeigeFeedbackText("ZU FRUEH!");
        }
        this.naechstePhaseLogik();
    }

    verpasseStufe() {
        this.zeigeFeedbackText("VERPASST!");
        this.naechstePhaseLogik();
    }

    naechstePhaseLogik() {
        this.stufenTimer = 0;
        this.aktuelleStufe++;
        if (this.aktuelleStufe > this.maxStufen) {
            this.phase = 'kapsel';
            this.kapselZusatzBoost = (this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde);
            this.starteKapselSinkflug();
        }
    }

    starteKapselSinkflug() {
        this.statusText.setText("KAPSEL-SINKFLUG AKTIV!");
        let width = this.scale.width;
        
        // 1. Formveraenderung (Exakt an der aktuellen Position der Rakete)
        this.rakete.setSize(30, 30);
        this.rakete.setDisplaySize(30, 30);

        // 2. Physik aktivieren (Konstante Mond-Schwerkraft)
        this.rakete.body.setAllowGravity(true);
        this.rakete.body.setGravityY(120); 

        // 3. MATHEMATISCH RECHTS-DECKELUNG:
        // Wir geben der Kapsel genau so viel Schwung nach rechts, dass sie sich
        // waehrend des Aufwaerts-Bounces elegant bis zur Bildschirmmitte schiebt.
        if (this.kapselZusatzBoost) {
            this.rakete.body.setVelocityX(130);  // Angepasst an den hoeheren Flug
            this.rakete.body.setVelocityY(-320); // Perfekter Abwurf: Hoeherer Bogen
        } else {
            this.rakete.body.setVelocityX(100);  // Angepasst an den normalen Flug
            this.rakete.body.setVelocityY(-240); // Normaler Abwurf: Solider Bogen
        }

        GameState.letzteDistanz = this.distanz;
    }

    pruefeLandung() {
        let finaleGeschwindigkeit = this.letzteSinkrate || 0;
        this.rakete.body.setAllowGravity(false);
        this.rakete.body.setVelocity(0, 0);

        let maxSichereGeschwindigkeit = 60 + (GameState.kapsel.robustheitStufe * 15);
        let aktuellerWinkel = Math.abs(this.rakete.angle);
        let winkelGueltig = (aktuellerWinkel <= 20 || aktuellerWinkel >= 340);

        if (finaleGeschwindigkeit <= maxSichereGeschwindigkeit && winkelGueltig) {
            this.statusText.setText(`ERFOLGREICHE LANDUNG!\nRate: ${Math.floor(finaleGeschwindigkeit)} | Winkel: ${Math.round(this.rakete.angle)} Grad`);
            this.statusText.setFill('#00ff00');
            GameState.landungErfolgreich = true;
            GameState.muenzen += Math.floor(this.distanz / 10);
        } else {
            this.statusText.setText(`ABSTURZ! ${!winkelGueltig ? "GEKIPPT!" : "ZU SCHNELL!"}`);
            this.statusText.setFill('#ff0000');
            GameState.landungErfolgreich = false;
        }

        this.time.delayedCall(4000, () => this.scene.start('UpgradeScene'));
    }

    zeigeFeedbackText(text) {
        this.statusText.setText(text);
        this.time.delayedCall(1000, () => { if (this.statusText) this.statusText.setText(""); });
    }
}