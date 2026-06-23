class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init() {
        // ZUSTAENDE: 'menu', 'shop', 'rakete', 'kapsel'
        this.phase = 'menu'; 
        
        this.distanz = 0;
        this.aktuelleStufe = 1;
        this.maxStufen = GameState.rakete.tankStufe;
        this.istAmFliegen = false;
        
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

        // PHASE III PARAMETER: Wo befindet sich der Boden?
        // Wir legen den Boden weit unter das normale Sichtfeld (z.B. bei Y = 1200)
        this.bodenBasisY = 1200;
    }

    create() {
        let width = this.scale.width;
        let height = this.scale.height;

        // 1. STERNEN-HINTERGRUND
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

        // 2. PHASE III: PROZEDURALER MONDBODEN
        // Wir zeichnen die Huegelkette als statische Grafik ueber die doppelte Bildschirmbreite
        this.bodenGrafik = this.add.graphics();
        this.bodenGrafik.lineStyle(4, 0x888888, 1); // Graue Mond-Oberflaeche
        this.bodenGrafik.fillStyle(0x222222, 1);    // Dunkles Inneres der Huegel

        this.bodenGrafik.beginPath();
        this.bodenGrafik.moveTo(0, height * 2); // Startpunkt ganz unten links

        // Loop ueber die gesamte Breite der Welt, um Punkte mathematisch zu verbinden
        this.bodenPunkte = [];
        let weltBreite = width * 2;
        
        for (let x = 0; x <= weltBreite; x += 20) {
            // Kombinierte Sinus-Wellen fuer unebenes Gelaende
            let welle1 = Math.sin(x * 0.005) * 80;  // Grosse, weite Huegel
            let welle2 = Math.cos(x * 0.02) * 20;   // Kleine, steinige Unebenheiten
            let bodenY = this.bodenBasisY + welle1 + welle2;

            this.bodenGrafik.lineTo(x, bodenY);
            this.bodenPunkte.push({ x: x, y: bodenY });
        }
        
        this.bodenGrafik.lineTo(weltBreite, height * 2); // Abschluss unten rechts
        this.bodenGrafik.closePath();
        this.bodenGrafik.strokePath();
        this.bodenGrafik.fillPath();

        // 3. DAS SPIELOBJEKT
        this.raketePositionX = width * 0.25;
        this.rakete = this.add.rectangle(this.raketePositionX, height / 2, 60, 20, 0xffffff);
        this.physics.add.existing(this.rakete);
        this.rakete.body.setAllowGravity(false);

        // Weltgrenzen erweitern, damit die Kamera weit nach unten scrollen darf
        this.physics.world.setBounds(0, 0, width * 2, this.bodenBasisY + 200);

        // 4. UI-TEXT-ELEMENTE
        this.menueTitel = this.add.text(width / 2, height * 0.25, "LUNAR LANDER: GRAVITY BOUND", {
            fontSize: '32px', fill: '#ffffff', fontFamily: 'Arial', fontWeight: 'bold'
        }).setOrigin(0.5);

        let ergebnisInhalt = GameState.letzteDistanz !== undefined
            ? `Letzter Flug: ${GameState.landungErfolgreich ? "ERFOLG" : "ABSTURZ"} | ${GameState.letzteDistanz}m | ${GameState.landungErfolgreich ? "+ " : "- "}${GameState.landungErfolgreich ? Math.floor(GameState.letzteDistanz / 10) : 0} Muenzen`
            : "Bereit fuer den Abflug, Kommandant!";

        this.menueErgebnisInfo = this.add.text(width / 2, height * 0.40, ergebnisInhalt, {
            fontSize: '20px', fill: GameState.landungErfolgreich ? '#00ff00' : (GameState.letzteDistanz !== undefined ? '#ff0000' : '#ffff00'), fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.menueShopInfo = this.add.text(width / 2, height * 0.52, "Druecke ENTER fuer den Shop", {
            fontSize: '20px', fill: '#00ff00', fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.menueStartInfo = this.add.text(width / 2, height * 0.60, "Druecke LEERTASTE fuer den Start", {
            fontSize: '20px', fill: '#aaaaaa', fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.uiText = this.add.text(20, 20, '', { fontSize: '20px', fill: '#ffffff', fontFamily: 'Arial' }).setVisible(false);
        this.statusText = this.add.text(20, 60, '', { fontSize: '24px', fill: '#00ff00', fontFamily: 'Arial' });

        this.balkenHintergrund = this.add.rectangle(width / 2, 30, 200, 20, 0x333333).setVisible(false);
        this.balkenTreibstoff = this.add.rectangle(width / 2, 30, 200, 20, 0x00ff00).setVisible(false);

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update(time, delta) {
        let width = this.scale.width;
        let height = this.scale.height;

        // Sterne bewegen sich im Menue horizontal
        if (this.phase === 'menu' || this.phase === 'shop' || this.phase === 'rakete') {
            this.sterne.forEach(stern => {
                stern.objekt.x -= (this.flugGeschwindigkeit * 0.05) * stern.speedFaktor * (delta / 16);
                if (stern.objekt.x < 0) { stern.objekt.x = width; stern.objekt.y = Phaser.Math.Between(0, height); }
            });
        }

        if (this.phase === 'menu') {
            if (Phaser.Input.Keyboard.JustDown(this.enterKey)) this.schalteZuShop();
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.starteRaketenFlugVorbereitung();
        }
        else if (this.phase === 'shop') {
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.starteRaketenFlugVorbereitung();
        }
        else if (this.phase === 'rakete') {
            if (this.istAmFliegen) {
                this.distanz += Math.floor((this.flugGeschwindigkeit * delta) / 1000);
                this.uiText.setText(`Stufe: ${this.aktuelleStufe}/${this.maxStufen} | Distanz: ${this.distanz}m | Speed: ${this.flugGeschwindigkeit}km/h`);

                this.stufenTimer += delta;
                let verbleibend = 1 - (this.stufenTimer / this.stufenDauer);
                this.balkenTreibstoff.width = Math.max(0, 200 * verbleibend);
                this.balkenTreibstoff.setFillStyle(this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde ? 0xffff00 : 0x00ff00);

                if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.trenneStufeAb();
                if (this.stufenTimer >= this.stufenDauer) this.verpasseStufe();
            }
        }
        else if (this.phase === 'kapsel') {
            // Solange wir nicht gelandet sind, tracken wir die vertikale Sinkrate
            this.letzteSinkrate = this.rakete.body.velocity.y;

            this.uiText.setText(`Kapsel-Phase | Treibstoff: ${Math.floor(this.kapselTreibstoff)}L | Sinkrate: ${Math.floor(this.letzteSinkrate || 0)}m/s`);
            let tankProzent = this.kapselTreibstoff / this.kapselMaxTreibstoff;
            this.balkenTreibstoff.width = Math.max(0, 200 * tankProzent);

            // Sterne driften passend zur Kapselbewegung mit
            this.sterne.forEach(stern => {
                stern.objekt.y -= (this.rakete.body.velocity.y * 0.02) * stern.speedFaktor * (delta / 16);
                if (stern.objekt.y < 0) { stern.objekt.y = height; stern.objekt.x = Phaser.Math.Between(0, width); }
            });

            if (this.cursors.left.isDown) this.rakete.angle -= 2;
            else if (this.cursors.right.isDown) this.rakete.angle += 2;

            if (this.cursors.up.isDown && this.kapselTreibstoff > 0) {
                let schubKraft = 3 * GameState.kapsel.triebwerkStufe;
                let angleInRadians = Phaser.Math.DegToRad(this.rakete.angle - 90);
                this.rakete.body.velocity.x += Math.cos(angleInRadians) * schubKraft * (delta / 16);
                this.rakete.body.velocity.y += Math.sin(angleInRadians) * schubKraft * (delta / 16);
                this.kapselTreibstoff -= 0.25 * (delta / 16);
            }

            // COLLISION DETECTION MIT DEM PROZEDURALEN BODEN
            let aktuellerBodenY = this.getBodenHoeheAnPosition(this.rakete.x);
            if (this.rakete.y >= aktuellerBodenY - 15) { // 15 ist der halbe Kapselradius
                this.rakete.y = aktuellerBodenY - 15; // Kapsel exakt auf den Boden setzen
                this.pruefeLandung();
            }
        }
    }

    // Mathematische Abfrage der genauen Bodenhoehe an jeder X-Koordinate
    getBodenHoeheAnPosition(x) {
        let welle1 = Math.sin(x * 0.005) * 80;
        let welle2 = Math.cos(x * 0.02) * 20;
        return this.bodenBasisY + welle1 + welle2;
    }

    schalteZuShop() {
        this.phase = 'shop';
        this.menueTitel.setText("=== UPGRADE SHOP ===");
        this.menueErgebnisInfo.setText(`Verfuegbare Muenzen: ${GameState.muenzen}`).setFill('#ffff00');
        this.menueShopInfo.setText("");
        this.menueStartInfo.setText("Druecke LEERTASTE um das QTE zu starten");
    }

    starteRaketenFlugVorbereitung() {
        this.phase = 'rakete';
        this.istAmFliegen = true;

        this.menueTitel.setVisible(false);
        this.menueErgebnisInfo.setVisible(false);
        this.menueShopInfo.setVisible(false);
        this.menueStartInfo.setVisible(false);

        this.uiText.setVisible(true);
        this.balkenHintergrund.setVisible(true);
        this.balkenTreibstoff.setVisible(true);
        
        this.uiText.setText('Rakete fliegt! Timing abwarten...');
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
        this.balkenTreibstoff.setFillStyle(0x00ffff);

        this.rakete.setSize(30, 30);
        this.rakete.setDisplaySize(30, 30);
        this.rakete.body.setAllowGravity(true);
        this.rakete.body.setGravityY(120); 
        this.rakete.body.setMaxVelocity(250, 300);

        if (this.kapselZusatzBoost) {
            this.rakete.body.setVelocityX(90);   
            this.rakete.body.setVelocityY(-160); 
        } else {
            this.rakete.body.setVelocityX(60);   
            this.rakete.body.setVelocityY(-100); 
        }

        // KAMERA FOCOUS: Die Kamera heftet sich jetzt an die Kapsel!
        this.cameras.main.startFollow(this.rakete, true, 0.1, 0.1);
        
        GameState.letzteDistanz = this.distanz;
    }

    pruefeLandung() {
        let finaleGeschwindigkeit = this.letzteSinkrate || 0;
        
        this.rakete.body.setAllowGravity(false);
        this.rakete.body.setVelocity(0, 0);

        // Kamera-Verfolgung loesen, damit das UI beim Reset nicht verschoben ist
        this.cameras.main.stopFollow();

        let maxSichereGeschwindigkeit = 60 + (GameState.kapsel.robustheitStufe * 15);
        let aktuellerWinkel = Math.abs(this.rakete.angle);
        let winkelGueltig = (aktuellerWinkel <= 20 || aktuellerWinkel >= 340);

        this.uiText.setVisible(false);
        this.balkenHintergrund.setVisible(false);
        this.balkenTreibstoff.setVisible(false);

        if (finaleGeschwindigkeit <= maxSichereGeschwindigkeit && winkelGueltig) {
            this.statusText.setText("ERFOLGREICHE LANDUNG!");
            this.statusText.setFill('#00ff00');
            GameState.landungErfolgreich = true;
            GameState.muenzen += Math.floor(this.distanz / 10);
        } else {
            let grund = !winkelGueltig ? "GEKIPPT!" : "ZU HART!";
            this.statusText.setText(`ABSTURZ! (${grund})`);
            this.statusText.setFill('#ff0000');
            GameState.landungErfolgreich = false;
            this.rakete.setFillStyle(0xff0000); 
        }

        GameState.letzteDistanz = this.distanz;

        this.time.delayedCall(1000, () => {
            // Kamera-Scrollposition vor dem Neustart zwingend nullen!
            this.cameras.main.scrollY = 0;
            this.scene.restart();
        });
    }

    zeigeFeedbackText(text) {
        this.statusText.setText(text);
        this.time.delayedCall(1000, () => { if (this.statusText) this.statusText.setText(""); });
    }
}