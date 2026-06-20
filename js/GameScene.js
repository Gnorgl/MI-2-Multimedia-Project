class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init() {
        this.distanz = 0;
        this.hoehe = 0; 
        this.aktuelleStufe = 1;
        this.maxStufen = GameState.rakete.tankStufe;
        this.phase = 'rakete'; 
        this.istAmFliegen = false;

        this.aufstiegsGeschwindigkeit = 80 * GameState.rakete.triebwerkStufe; 

        this.stufenDauer = 3000; 
        this.stufenTimer = 0;
        
        this.berechneTimingFenster();

        this.kapselTreibstoff = GameState.kapsel.tankStufe * 100;
        this.kapselMaxTreibstoff = this.kapselTreibstoff;
        this.kapselZusatzBoost = false;

        // Arrays fuer die prozedurale Welt
        this.gelaendePunkte = [];
        this.gelaendeScrollY = 0; 
        this.letzteSinkrate = 0;
    }

    berechneTimingFenster() {
        let fensterBreite = Math.max(150, 600 - (this.aktuelleStufe - 1) * 120);
        this.perfektFensterEnde = 2900; 
        this.perfektFensterStart = this.perfektFensterEnde - fensterBreite;
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

        // Prozedurales Gelaende generieren
        this.generiereGelaende(width, height);

        // Grafik-Objekt zum Zeichnen der Weltoberflaeche erstellen
        this.gelaendeGrafik = this.add.graphics();

        this.startX = width * 0.15;   
        this.startY = this.getBodenHoeheBeiX(this.startX) - 30; // Exakt auf die Rampe setzen
        
        this.zielX = width * 0.35;     
        this.zielY = height * 0.40;

        this.raketeBreite = 60;
        this.raketeHoehe = 20;

        this.rakete = this.add.rectangle(this.startX, this.startY, this.raketeBreite, this.raketeHoehe, 0xffffff);
        this.rakete.angle = -90; 
        
        this.physics.add.existing(this.rakete);
        this.rakete.body.setAllowGravity(false);

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

    generiereGelaende(width, height) {
        let basisY = height - 100; 
        
        let berechnetesStartX = width * 0.15; 
        let startPlattformStart = berechnetesStartX - 80;
        let startPlattformEnde = berechnetesStartX + 80;
        let startPlattformY = basisY + 30; 

        for (let x = 0; x <= width; x += 5) {
            let y = basisY;

            if (x >= startPlattformStart && x <= startPlattformEnde) {
                y = startPlattformY;
            } else {
                y += Math.sin(x * 0.02) * 40 + Math.cos(x * 0.05) * 15;
            }
            this.gelaendePunkte.push({ x: x, y: y });
        }
    }

    // FIX: Komplett bereinigtes Zeichnen verhindert Farbflackern
    zeichneGelaende() {
        this.gelaendeGrafik.clear();
        this.gelaendeGrafik.lineStyle(3, 0xffa500, 1);
        this.gelaendeGrafik.fillStyle(0x000000, 1);
        this.gelaendeGrafik.beginPath();
        
        // Wir nutzen hier das feste Boden-Niveau
        let startYWithScroll = this.gelaendePunkte[0].y + this.gelaendeScrollY;
        this.gelaendeGrafik.moveTo(this.gelaendePunkte[0].x, startYWithScroll);
        
        for (let i = 1; i < this.gelaendePunkte.length; i++) {
            let currentYWithScroll = this.gelaendePunkte[i].y + this.gelaendeScrollY;
            this.gelaendeGrafik.lineTo(this.gelaendePunkte[i].x, currentYWithScroll);
        }
        
        // Diese zwei Zeilen stellen sicher, dass die untere Flaeche 
        // immer bis zum unteren Bildschirmrand (this.scale.height) reicht.
        this.gelaendeGrafik.lineTo(this.scale.width, this.scale.height);
        this.gelaendeGrafik.lineTo(0, this.scale.height);
        this.gelaendeGrafik.closePath();
        
        this.gelaendeGrafik.fillPath();
        this.gelaendeGrafik.strokePath();
    }

    getBodenHoeheBeiX(x) {
        let naechsterPunkt = this.gelaendePunkte.find(p => p.x >= x);
        return naechsterPunkt ? naechsterPunkt.y : this.scale.height;
    }

    update(time, delta) {
        let width = this.scale.width;
        let height = this.scale.height;

        this.zeichneGelaende();

        if (this.phase === 'rakete') {
            if (!this.istAmFliegen) {
                if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                    this.istAmFliegen = true;
                    this.uiText.setText('Liftoff! Majestaetischer Aufstieg...');
                }
                return;
            }

            if (this.istAmFliegen) {
                this.stufenTimer += delta;

                let flugFortschritt = (this.aktuelleStufe - 1 + (this.stufenTimer / this.stufenDauer)) / this.maxStufen;
                flugFortschritt = Math.min(1, flugFortschritt);
                
                let neigungsFaktor = Math.pow(flugFortschritt, 2); 
                this.rakete.angle = -90 + (neigungsFaktor * 90);

                this.rakete.x = Phaser.Math.Interpolation.Linear([this.startX, this.zielX], neigungsFaktor);
                this.rakete.y = Phaser.Math.Interpolation.Linear([this.startY, this.zielY], neigungsFaktor);
                this.rakete.body.setVelocity(0, 0);

                let winkelImBogenmass = Phaser.Math.DegToRad(this.rakete.angle);
                let frameSchub = (this.aufstiegsGeschwindigkeit * delta) / 1000;
                
                this.hoehe += Math.abs(Math.sin(winkelImBogenmass) * frameSchub);
                this.distanz += Math.abs(Math.cos(winkelImBogenmass) * frameSchub);

                // Boden scrollt beim Aufstieg nach unten weg
                this.gelaendeScrollY = this.hoehe * 2;

                this.uiText.setText(`Stufe: ${this.aktuelleStufe}/${this.maxStufen} | Hoehe: ${Math.floor(this.hoehe)}m | Distanz: ${Math.floor(this.distanz)}m`);

                this.sterne.forEach(stern => {
                    stern.objekt.y += Math.abs(Math.sin(winkelImBogenmass)) * (this.aufstiegsGeschwindigkeit * 0.03) * stern.speedFaktor * (delta / 16);
                    stern.objekt.x -= Math.abs(Math.cos(winkelImBogenmass)) * (this.aufstiegsGeschwindigkeit * 0.05) * stern.speedFaktor * (delta / 16);

                    if (stern.objekt.x < 0) { stern.objekt.x = width; stern.objekt.y = Phaser.Math.Between(0, height); }
                    if (stern.objekt.y > height) { stern.objekt.y = 0; stern.objekt.x = Phaser.Math.Between(0, width); }
                });

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
        
        else if (this.phase === 'kapsel') {
            // FIX: Die simulierte Resthoehe sinkt basierend auf der Zeit/Gravitation
            // Wir verringernthis.kapselSimulierteHoehe kontinuierlich, bis sie 0 erreicht.
                if (this.kapselSimulierteHoehe > 0) {
                    let fallSpeed = this.rakete.body.velocity.y * (delta / 1000) * 1.5;
                    this.kapselSimulierteHoehe -= fallSpeed;
                    
                    // LIMITIERUNG: Der Boden soll nicht weiter nach oben wandern, 
                    // wenn die Kapsel kurz vor der Landung ist.
                    this.gelaendeScrollY = Math.max(0, this.kapselSimulierteHoehe);
                } else {
                    // Boden ist fest am Boden (Y = 0 Offset)
                    this.gelaendeScrollY = 0;
                }

                // WICHTIG: Die Kollisionslogik muss jetzt immer gegen das 
                // "festgehaltene" Boden-Niveau pruefen.
                let aktuellerBodenY = this.getBodenHoeheBeiX(this.rakete.x) + this.gelaendeScrollY;
                
                // ... restlicher Code ...
            
            if (this.rakete.y <= aktuellerBodenY - 15) {
                this.letzteSinkrate = this.rakete.body.velocity.y;
            }

            this.uiText.setText(`Kapsel-Phase | Treibstoff: ${Math.floor(this.kapselTreibstoff)}L | Sinkrate: ${Math.floor(this.letzteSinkrate)}m/s`);
            
            let tankProzent = this.kapselTreibstoff / this.kapselMaxTreibstoff;
            this.balkenTreibstoff.width = Math.max(0, 200 * tankProzent);
            this.balkenTreibstoff.setFillStyle(0x00ffff); 

            this.sterne.forEach(stern => {
                stern.objekt.y -= (this.rakete.body.velocity.y * 0.02) * stern.speedFaktor;
                stern.objekt.x -= (this.rakete.body.velocity.x * 0.02) * stern.speedFaktor;
                
                if (stern.objekt.y < 0) { stern.objekt.y = height; stern.objekt.x = Phaser.Math.Between(0, width); }
                if (stern.objekt.x < 0) { stern.objekt.x = width; stern.objekt.y = Phaser.Math.Between(0, height); }
                if (stern.objekt.x > width) { stern.objekt.x = 0; stern.objekt.y = Phaser.Math.Between(0, height); }
            });

            if (this.cursors.left.isDown) {
                this.rakete.angle -= 2; 
            } else if (this.cursors.right.isDown) {
                this.rakete.angle += 2; 
            }

            if (this.cursors.up.isDown && this.kapselTreibstoff > 0) {
                let schubKraft = 4 * GameState.kapsel.triebwerkStufe;
                let angleInRadians = Phaser.Math.DegToRad(this.rakete.angle - 90);
                
                let neuerSchubX = Math.cos(angleInRadians) * schubKraft * (delta / 16);
                let neuerSchubY = Math.sin(angleInRadians) * schubKraft * (delta / 16);

                this.rakete.body.velocity.x += neuerSchubX;
                this.rakete.body.velocity.y += neuerSchubY;

                this.kapselTreibstoff -= 0.5 * (delta / 16);
            }

            if (this.rakete.body.velocity.y < 0 && !this.kapselZusatzBoost) {
                this.rakete.body.setVelocityY(0);
            }

            let maxFallGeschwindigkeit = 220; 
            let maxSeitwaertsDrift = 150;     

            if (this.rakete.body.velocity.y > maxFallGeschwindigkeit) {
                this.rakete.body.setVelocityY(maxFallGeschwindigkeit);
            }
            if (Math.abs(this.rakete.body.velocity.x) > maxSeitwaertsDrift) {
                this.rakete.body.setVelocityX(Phaser.Math.Clamp(this.rakete.body.velocity.x, -maxSeitwaertsDrift, maxSeitwaertsDrift));
            }

            // Wenn die Kapsel den Boden beruehrt (egal ob eingerastet oder im Anflug)
            if (this.rakete.y >= aktuellerBodenY - 15) {
                this.pruefeLandung();
            }
        }
    }

    trenneStufeAb() {
        if (this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde) {
            let boost = 120 * GameState.rakete.triebwerkStufe;
            this.aufstiegsGeschwindigkeit += boost;
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
        // Berechne den finalen Punkt der Rakete bei Stufenabschluss
        let flugFortschritt = (this.aktuelleStufe - 1 + (this.stufenTimer / this.stufenDauer)) / this.maxStufen;
        flugFortschritt = Math.min(1, flugFortschritt);
        let neigungsFaktor = Math.pow(flugFortschritt, 2);

        // Setze die Rakete exakt auf den Endpunkt, bevor sie zur Kapsel wird
        this.rakete.x = Phaser.Math.Interpolation.Linear([this.startX, this.zielX], neigungsFaktor);
        this.rakete.y = Phaser.Math.Interpolation.Linear([this.startY, this.zielY], neigungsFaktor);

        let zeitBeimKlick = this.stufenTimer;
        this.stufenTimer = 0;
        this.aktuelleStufe++;

        if (this.aktuelleStufe > this.maxStufen) {
            this.phase = 'kapsel';
            // ... (dein restlicher Kapsel-Trennungs-Logik-Code)
            this.starteKapselSinkflug();
        } else {
            this.berechneTimingFenster();
        }
    }

    starteKapselSinkflug() {
        this.statusText.setText("KAPSEL-SINKFLUG AKTIV!");
        
        // Die Kapsel behält ihre aktuelle Position (X/Y) bei, 
        // an der die Rakete aufgehört hat zu fliegen.
        this.rakete.setSize(20, 20);
        this.rakete.setDisplaySize(20, 20);

        this.rakete.body.setAllowGravity(true);
        
        let basisDriftX = 50; 

        if (this.kapselZusatzBoost) {
            this.rakete.body.setGravityY(50); 
            this.rakete.body.setVelocityY(20); 
            this.rakete.body.setVelocityX(basisDriftX + 20); 
        } else {
            this.rakete.body.setGravityY(90); 
            this.rakete.body.setVelocityY(40);
            this.rakete.body.setVelocityX(basisDriftX);
        }

        // Die simulierte Hoehe startet bei einem Wert, 
        // der proportional zu der im Aufstieg erreichten Hoehe ist.
        this.kapselSimulierteHoehe = Math.min(1200, this.hoehe * 1.5);
        this.gelaendeScrollY = this.kapselSimulierteHoehe;

        GameState.letzteDistanz = this.distanz;

        this.kapselSimulierteHoehe = 500; 
        this.gelaendeScrollY = this.kapselSimulierteHoehe;
    }

    pruefeLandung() {
        let finaleGeschwindigkeit = this.letzteSinkrate;
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
            let grund = "ZU SCHNELL!";
            if (!winkelGueltig) grund = "KAPSEL UMGEKIPPT!";

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