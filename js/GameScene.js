class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init() {
        this.distanz = 0;
        this.aktuelleStufe = 1;
        this.maxStufen = GameState.rakete.tankStufe; // Mehr Tank-Upgrades = Mehr QTE-Stufen = Weiterer Flug
        this.phase = 'rakete'; // 'rakete' oder 'kapsel'
        
        // Unter-Zustand fuer den Raketenflug
        this.raketenUnterPhase = 'boden'; // 'boden', 'kurve', 'flug'

        // Basis-Geschwindigkeit gekoppelt an das Triebwerk-Upgrade
        this.flugGeschwindigkeit = 100 * GameState.rakete.triebwerkStufe; 

        // Timing-Fenster Parameter
        this.stufenDauer = 3000; 
        this.stufenTimer = 0;
        this.perfektFensterStart = 2300; 
        this.perfektFensterEnde = 2900;   

        // Kapsel Parameter
        this.kapselTreibstoff = GameState.kapsel.tankStufe * 100;
        this.kapselMaxTreibstoff = this.kapselTreibstoff;
    }

    create() {
        let width = this.scale.width;
        let height = this.scale.height;

        // 1. Sternen-Hintergrund
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

        // Wir definieren die feste Abschussrampen-Hoehe (wichtig fuer spaetere prozedurale Welt!)
        this.bodenY = height - 80;

        // 2. Das Spielobjekt (Rakete)
        // Startet aufrecht (-90 Grad) auf dem Boden im linken Bereich
        this.raketePositionX = width * 0.25;
        this.rakete = this.add.rectangle(this.raketePositionX, this.bodenY - 30, 60, 20, 0xffffff);
        this.rakete.angle = -90; 
        
        this.physics.add.existing(this.rakete);
        this.rakete.body.setAllowGravity(false);

        // 3. UI Elemente
        this.uiText = this.add.text(20, 20, 'Druecke LEERTASTE zum Zuenden!', {
            fontSize: '20px', fill: '#ffffff', fontFamily: 'Arial'
        });

        this.statusText = this.add.text(20, 60, '', {
            fontSize: '24px', fill: '#00ff00', fontFamily: 'Arial'
        });

        // Treibstoffbalken (Erst unsichtbar, wird nach der Kurve eingeblendet)
        this.balkenHintergrund = this.add.rectangle(width / 2, 30, 200, 20, 0x333333).setVisible(false);
        this.balkenTreibstoff = this.add.rectangle(width / 2, 30, 200, 20, 0x00ff00).setVisible(false);

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update(time, delta) {
        let width = this.scale.width;
        let height = this.scale.height;

        // === LOGIK PHASE 1: RAKETENFLUG ===
        if (this.phase === 'rakete') {
            
            // ZUSTAND A: Steht am Boden und wartet auf Zuendung
            if (this.raketenUnterPhase === 'boden') {
                if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                    this.raketenUnterPhase = 'kurve';
                    this.uiText.setText('Erhoehe Schub... Einleiten der Flugkurve!');
                    
                    // Physik-Impuls nach oben (Abhaengig von Triebwerk-Stufe)
                    let startSchub = -250 - (GameState.rakete.triebwerkStufe * 50);
                    this.rakete.body.setVelocityY(startSchub);
                }
            }
            
            // ZUSTAND B: Rakete fliegt die Kurve (Gravity Turn)
            else if (this.raketenUnterPhase === 'kurve') {
                // Berechne Fortschritt: Wie weit ist die Rakete vom Boden abgehoben?
                let zurueckgelegteHoehe = this.bodenY - this.rakete.y;
                let zielHoehe = height * 0.5; // Kurve soll in der Bildschirmmitte enden
                
                let prozent = Math.min(1, zurueckgelegteHoehe / zielHoehe);
                
                // 1. Drehe die Rakete kontinuierlich von -90 Grad auf 0 Grad (waagerecht)
                this.rakete.angle = -90 + (prozent * 90);
                
                // 2. Biege die Geschwindigkeit um (weniger nach oben, mehr nach rechts)
                let maxRechtsSpeed = this.flugGeschwindigkeit;
                this.rakete.body.setVelocityX(prozent * maxRechtsSpeed);

                // Sterne bewegen sich gaaaanz leicht mit, um das Aufsteigen zu betonen
                this.sterne.forEach(stern => {
                    stern.objekt.y += 1 * stern.speedFaktor;
                    if (stern.objekt.y > height) stern.objekt.y = 0;
                });

                // Wenn die Rakete waagerecht fliegt und die Zielhoehe erreicht hat -> Wechsel zum QTE
                if (prozent >= 1) {
                    this.raketenUnterPhase = 'flug';
                    this.rakete.body.setVelocityY(0); // Vertikale Bewegung komplett stoppen
                    this.rakete.angle = 0;
                    
                    // Blende den Treibstoffbalken ein
                    this.balkenHintergrund.setVisible(true);
                    this.balkenTreibstoff.setVisible(true);
                    this.uiText.setText('Orbit erreicht! Bereit machen fuer Stufen-Trennung...');
                }
            }
            
            // ZUSTAND C: Der eigentliche QTE-Flug im Orbit (Bereits getestet und bewaehrt)
            else if (this.raketenUnterPhase === 'flug') {
                this.distanz += Math.floor((this.flugGeschwindigkeit * delta) / 1000);
                this.uiText.setText(`Stufe: ${this.aktuelleStufe}/${this.maxStufen} | Distanz: ${this.distanz}m | Speed: ${this.flugGeschwindigkeit}km/h`);

                // Parallax-Effekt der Sterne nach links
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

                if (this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde) {
                    this.balkenTreibstoff.setFillStyle(0xffff00); 
                } else {
                    this.balkenTreibstoff.setFillStyle(0x00ff00); 
                }

                if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                    this.trenneStufeAb();
                }

                if (this.stufenTimer >= this.stufenDauer) {
                    this.verpasseStufe();
                }
            }
        }
        
        // === LOGIK PHASE 2: KAPSEL-SINKFLUG (Unveraendert stabil) ===
        else if (this.phase === 'kapsel') {
            if (this.rakete.y <= height - 50) {
                this.letzteSinkrate = this.rakete.body.velocity.y;
            }

            this.uiText.setText(`Kapsel-Phase | Treibstoff: ${Math.floor(this.kapselTreibstoff)}L | Sinkrate: ${Math.floor(this.letzteSinkrate || 0)}m/s`);
            
            let tankProzent = this.kapselTreibstoff / this.kapselMaxTreibstoff;
            this.balkenTreibstoff.width = Math.max(0, 200 * tankProzent);
            this.balkenTreibstoff.setFillStyle(0x00ffff); 

            this.sterne.forEach(stern => {
                stern.objekt.y -= (this.rakete.body.velocity.y * 0.02) * stern.speedFaktor;
                if (stern.objekt.y < 0) {
                    stern.objekt.y = height;
                    stern.objekt.x = Phaser.Math.Between(0, width);
                }
            });

            if (this.cursors.left.isDown) {
                this.rakete.angle -= 2; 
            } else if (this.cursors.right.isDown) {
                this.rakete.angle += 2; 
            }

            if (this.cursors.up.isDown && this.kapselTreibstoff > 0) {
                let schubKraft = 15 * GameState.kapsel.triebwerkStufe;
                let angleInRadians = Phaser.Math.DegToRad(this.rakete.angle - 90);
                
                this.rakete.body.velocity.x += Math.cos(angleInRadians) * schubKraft * (delta / 16);
                this.rakete.body.velocity.y += Math.sin(angleInRadians) * schubKraft * (delta / 16);

                this.kapselTreibstoff -= 0.5 * (delta / 16);
            }

            if (this.rakete.y > height - 50) {
                this.pruefeLandung();
            }
        }
    }

    trenneStufeAb() {
        if (this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde) {
            let boost = 150 * GameState.rakete.triebwerkStufe;
            this.flugGeschwindigkeit += boost;
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
            
            if (this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde) {
                this.kapselZusatzBoost = true;
                this.zeigeFeedbackText("KAPSEL-TRENNUNG: PERFEKT! +BOOST");
            } else {
                this.kapselZusatzBoost = false;
                this.zeigeFeedbackText("KAPSEL-TRENNUNG ERFOLGT");
            }
            
            this.starteKapselSinkflug();
        }
    }

    starcheKapselSinkflug() { /* ... bleibt identisch ... */ }
    starteKapselSinkflug() {
        this.statusText.setText("KAPSEL-SINKFLUG AKTIV!");
        this.balkenHintergrund.setVisible(true);
        this.balkenTreibstoff.setVisible(true);
        
        let width = this.scale.width;
        this.rakete.x = width / 2;
        this.rakete.y = 100;
        
        this.rakete.setSize(30, 30);
        this.rakete.setDisplaySize(30, 30);

        this.rakete.body.setAllowGravity(true);
        
        if (this.kapselZusatzBoost) {
            this.rakete.body.setGravityY(60); 
            this.rakete.body.setVelocityY(-50); 
        } else {
            this.rakete.body.setGravityY(120); 
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
            this.statusText.setText(`ERFOLGREICHE LANDUNG!\nRate: ${Math.floor(finaleGeschwindigkeit)} m/s | Winkel: ${Math.round(this.rakete.angle)}°`);
            this.statusText.setFill('#00ff00');
            GameState.landungErfolgreich = true;
            
            let verdienst = Math.floor(this.distanz / 10);
            GameState.muenzen += verdienst;
        } else {
            let grund = !winkelGueltig ? "KAPSEL UMGEKIPPT!" : "ZU SCHNELL!";
            this.statusText.setText(`ABSTURZ! ${grund}\nRate: ${Math.floor(finaleGeschwindigkeit)} / Max: ${maxSichereGeschwindigkeit} | Winkel: ${Math.round(this.rakete.angle)}°`);
            this.statusText.setFill('#ff0000');
            GameState.landungErfolgreich = false;
        }

        this.time.delayedCall(4000, () => {
            this.scene.start('UpgradeScene');
        });
    }

    zeigeFeedbackText(text) {
        this.statusText.setText(text);
        this.time.delayedCall(1000, () => {
            if (this.statusText) this.statusText.setText("");
        });
    }
}