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
    }

    create() {
        let width = this.scale.width;
        let height = this.scale.height;

        // 1. PROZEDURALER STERNEN-HINTERGRUND (Fuer die Bewegungillusion)
        this.sterne = [];
        for (let i = 0; i < 100; i++) {
            // Erzeuge zufaellige weisse Punkte im Raum
            let x = Phaser.Math.Between(0, width);
            let y = Phaser.Math.Between(0, height);
            let groesse = Phaser.Math.Between(1, 3);
            let stern = this.add.rectangle(x, y, groesse, groesse, 0xffffff);
            // Speichere den Stern und eine individuelle Tiefe (fuer Parallax-Effekt)
            this.sterne.push({
                objekt: stern,
                speedFaktor: groesse * 0.5 // Groessere Sterne bewegen sich schneller = wirken naeher
            });
        }

        // 2. Das Spielobjekt (Rakete / Kapsel)
        // Wir lassen sie nun fest auf ihrer X-Position (width * 0.25)
        this.raketePositionX = width * 0.25;
        this.rakete = this.add.rectangle(this.raketePositionX, height / 2, 60, 20, 0xffffff);
        this.physics.add.existing(this.rakete);
        this.rakete.body.setAllowGravity(false);

        // 3. UI Elemente
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
                // Distanz erhoehen
                this.distanz += Math.floor((this.flugGeschwindigkeit * delta) / 1000);
                this.uiText.setText(`Stufe: ${this.aktuelleStufe}/${this.maxStufen} | Distanz: ${this.distanz}m | Speed: ${this.flugGeschwindigkeit}km/h`);

                // PARALLAX-BACKGROUND MOVEMENT: Sterne nach links bewegen basierend auf Flug-Geschwindigkeit
                this.sterne.forEach(stern => {
                    stern.objekt.x -= (this.flugGeschwindigkeit * 0.05) * stern.speedFaktor * (delta / 16);
                    // Wenn ein Stern links aus dem Bild fliegt, rechts wieder reinsetzen
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
        
        // === LOGIK PHASE 2: KAPSEL-SINKFLUG ===
        // === IN DER UPDATE-METHODE (Unter Phase 2 einbauen) ===
        else if (this.phase === 'kapsel') {
            // Sichere die aktuelle Sinkrate, solange wir noch in der Luft sind!
            if (this.rakete.y <= height - 50) {
                this.letzteSinkrate = this.rakete.body.velocity.y;
            }

            this.uiText.setText(`Kapsel-Phase | Treibstoff: ${Math.floor(this.kapselTreibstoff)}L | Sinkrate: ${Math.floor(this.letzteSinkrate || 0)}m/s`);
            
            let tankProzent = this.kapselTreibstoff / this.kapselMaxTreibstoff;
            this.balkenTreibstoff.width = Math.max(0, 200 * tankProzent);
            this.balkenTreibstoff.setFillStyle(0x00ffff); 

            // Sterne-Animation im Sinkflug
            this.sterne.forEach(stern => {
                stern.objekt.y -= (this.rakete.body.velocity.y * 0.02) * stern.speedFaktor;
                if (stern.objekt.y < 0) {
                    stern.objekt.y = height;
                    stern.objekt.x = Phaser.Math.Between(0, width);
                }
            });

            // Steuerung
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

            // Wenn die Kapsel den Boden erreicht
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

    // Ersetze die bestehende Funktion mit dieser Version (inklusive perfektem Kapsel-Abwurf)
    naechstePhaseLogik() {
        this.stufenTimer = 0;
        this.aktuelleStufe++;

        if (this.aktuelleStufe > this.maxStufen) {
            this.phase = 'kapsel';
            
            // DEINE IDEE: Ein letztes QTE fuer den Kapsel-Abwurf!
            // Wir pruefen, ob die Leertaste beim allerletzten Klick im perfektem Fenster war
            if (this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde) {
                this.kapselZusatzBoost = true;
                this.zeigeFeedbackText("KAPSEL-TRENUNG: PERFEKT! +BOOST");
            } else {
                this.kapselZusatzBoost = false;
                this.zeigeFeedbackText("KAPSEL-TRENNUNG ERFOLGT");
            }
            
            this.starteKapselSinkflug();
        }
    }

    starteKapselSinkflug() {
        let width = this.scale.width;
        this.rakete.x = width / 2;
        this.rakete.y = 100;
        
        this.rakete.setSize(30, 30);
        this.rakete.setDisplaySize(30, 30);

        this.rakete.body.setAllowGravity(true);
        
        // Wenn das letzte QTE perfekt war, hat die Kapsel weniger Fallgeschwindigkeit beim Start!
        if (this.kapselZusatzBoost) {
            this.rakete.body.setGravityY(60); // Halbe Schwerkraft zum Start (Kapsel schwebt laenger)
            this.rakete.body.setVelocityY(-50); // Kleiner Kick nach oben
        } else {
            this.rakete.body.setGravityY(120); // Normale Schwerkraft
        }

        GameState.letzteDistanz = this.distanz;
    }

    pruefeLandung() {
        let finaleGeschwindigkeit = this.letzteSinkrate || 0;

        this.rakete.body.setAllowGravity(false);
        this.rakete.body.setVelocity(0, 0);

        let maxSichereGeschwindigkeit = 60 + (GameState.kapsel.robustheitStufe * 15);
        
        // NEU: Winkel pruefen. Aufrecht ist 0 Grad. Wir erlauben +/- 20 Grad Toleranz
        let aktuellerWinkel = Math.abs(this.rakete.angle);
        let winkelGueltig = (aktuellerWinkel <= 20 || aktuellerWinkel >= 340);

        // Beide Bedingungen muessen erfuellt sein (Geschwindigkeit UND Winkel)
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