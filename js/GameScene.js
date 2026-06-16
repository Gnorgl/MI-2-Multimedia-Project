class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init() {
        let width = this.scale.width;
        let height = this.scale.height;

        this.distanz = 0;
        this.aktuelleStufe = 1;
        this.maxStufen = GameState.rakete.tankStufe;
        this.istAmFliegen = false;
        this.phase = 'rakete'; // 'rakete' oder 'kapsel'
        
        // Flug-Geschwindigkeit (wird durch Boosts erhoeht)
        this.flugGeschwindigkeit = 100; 

        // Timing-Fenster Parameter
        this.stufenDauer = 3000; 
        this.stufenTimer = 0;
        this.perfektFensterStart = 2300; 
        this.perfektFensterEnde = 2900;   
    }

    create() {
        let width = this.scale.width;
        let height = this.scale.height;

        // 1. Rakete optisch in der linken Haelfte platzieren
        this.rakete = this.add.rectangle(width * 0.2, height / 2, 60, 20, 0xffffff);
        this.physics.add.existing(this.rakete);
        this.rakete.body.setAllowGravity(false);

        // 2. Benutzeroberflaeche (UI)
        this.uiText = this.add.text(20, 20, 'Druecke LEERTASTE zum Starten!', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });

        this.statusText = this.add.text(20, 60, '', {
            fontSize: '24px',
            fill: '#00ff00',
            fontFamily: 'Arial'
        });

        // Treibstoffbalken zentriert oben
        this.balkenHintergrund = this.add.rectangle(width / 2, 30, 200, 20, 0x333333);
        this.balkenTreibstoff = this.add.rectangle(width / 2, 30, 200, 20, 0x00ff00);

        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update(time, delta) {
        // Start-Input
        if (!this.istAmFliegen && Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.phase === 'rakete') {
            this.istAmFliegen = true;
            this.uiText.setText('Rakete fliegt! Timing abwarten...');
            return; 
        }

        // Waehrend des Raketenflugs
        if (this.istAmFliegen && this.phase === 'rakete') {
            // Distanz erhoeht sich fortlaufend basierend auf der aktuellen Geschwindigkeit
            this.distanz += Math.floor((this.flugGeschwindigkeit * delta) / 1000);
            this.uiText.setText(`Stufe: ${this.aktuelleStufe}/${this.maxStufen} | Distanz: ${this.distanz}m | Speed: ${this.flugGeschwindigkeit}km/h`);

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

    trenneStufeAb() {
        if (this.stufenTimer >= this.perfektFensterStart && this.stufenTimer <= this.perfektFensterEnde) {
            // Boost erhoeht die rechnerische Geschwindigkeit
            let boost = 100 * GameState.rakete.triebwerkStufe;
            this.flugGeschwindigkeit += boost;
            this.zeigeFeedbackText("PERFEKT! +BOOST");
            
            // Kleiner optischer "Ruck" nach vorne als direktes Feedback
            this.rakete.x += 20;
        } else {
            this.zeigeFeedbackText("ZU FRUEH!");
            // Kleiner optischer "Ruck" nach hinten bei schlechtem Timing
            this.rakete.x -= 10;
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
            this.starteKapselSinkflug();
        }
    }

    starteKapselSinkflug() {
        this.uiText.setText(`Rakete ausgebrannt! End-Distanz: ${this.distanz}m`);
        this.statusText.setText("KAPSEL-SINKFLUG STARTET...");
        
        // Setze die Rakete auf ihre Startposition zurueck fuer die Kapselphase
        let width = this.scale.width;
        this.rakete.x = width * 0.2;
        
        GameState.letzteDistanz = this.distanz;
    }

    zeigeFeedbackText(text) {
        this.statusText.setText(text);
        this.time.delayedCall(1000, () => {
            if (this.statusText) this.statusText.setText("");
        });
    }
}