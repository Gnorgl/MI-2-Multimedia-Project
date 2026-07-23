class GameScene extends Phaser.Scene {

    constructor() {
        super({ key: 'GameScene' });

        this.bgStatic = null;

        this.player = null;
        this.cursors = null;
        this.leftKey = null;
        this.rightKey = null;
        
        // Tasten für Fähigkeiten
        this.keyQ = null;
        this.keyW = null;
        this.keyE = null;

        this.walls = null;
        this.highestGeneratedY = 840; 
        this.wallBlockHeight = 40; 
        
        this.highestGeneratedHazardY = 800; 
        this.hazardIntervalY = 400;         

        this.flyingHazardTimer = 0;
        this.flyingHazardInterval = 2500; 

        this.lavaGraphics = null;
        this.lavaStarted = false;
        this.lavaTriggered = false; 
        this.lavaCurrentY = 1200;       
        this.maxLavaDistance = 550; 

        this.survivors = null;
        this.rescuedCount = 0; 
        this.rescueChance = 0.50; 

        // Münzkonto
        this.totalCoins = parseInt(localStorage.getItem('heli_total_coins')) || 0;

        // --- AKTIVE FÄHIGKEITEN STATE ---
        this.shieldHP = 0;       // Q: Schild
        this.isGrowthActive = false;  // W: Personen-Wachstum
        this.isPhasing = false;       // E: Phase

        // Item-Kosten
        this.itemCosts = {
            shield: 15,
            growth: 20,
            phase: 25
        };

        this.isBouncing = false; 
        this.bounceTimer = 0;   

        // Erweiterte Heli-Setting -> abhängig vom ausgewählten Helicopter, siehe loadActiveHeliSetting
        this.heliSettings = {
            startSpeedX: 120,
            maxSpeedX: 280,
            maxSpeedY: 400,
            liftPower: -350,
            accelerationX: 400,
            dragX: 300,
            phaseDuration: 5000,
            growthDuration: 6000
        };

        // Direkt beim Instanziieren die Attribute laden
        this.loadActiveHeliSettings();
    }

    // Lädt die spezifischen Attribute des aktuell ausgewählten Hubschraubers aus der Config-Datenbank
    loadActiveHeliSettings() {
        const activeId = localStorage.getItem('heli_active_id') || 'shop-heli-1';
        
        if (typeof HELI_DATABASE !== 'undefined' && HELI_DATABASE[activeId]) {
            const newSettings = HELI_DATABASE[activeId].settings;
            
            this.heliSettings.startSpeedX = newSettings.startSpeedX;
            this.heliSettings.maxSpeedX = newSettings.maxSpeedX;
            this.heliSettings.maxSpeedY = newSettings.maxSpeedY;
            this.heliSettings.accelerationX = newSettings.accelerationX;
            this.heliSettings.phaseDuration = newSettings.phaseDuration;
            this.heliSettings.growthDuration = newSettings.growthDuration;
            
            console.log(`Phaser verwendet jetzt Settings für: ${HELI_DATABASE[activeId].name}`, this.heliSettings);
        }
    }

    create() {
        this.loadActiveHeliSettings();

        this.bgDynamic = this.add.image(0, 800, 'bg_jungle_dynamic');
            
        // 2. Ankerpunkt (Origin) auf unten-links setzen (X=0, Y=1.0)
        // Y=1.0 bedeutet: Der Bezugspunkt liegt ganz unten an der Bildkante!
        this.bgDynamic.setOrigin(0, 1.0); 
        
        this.bgDynamic.setScrollFactor(0); // Bleibt am Fenster fixiert
        this.bgDynamic.setDepth(-100);

        this.physics.world.setBounds(0, -999999, 800, 999999 + 800); 

        this.hazards = this.physics.add.staticGroup();
        this.platforms = this.physics.add.staticGroup();
        this.flyingHazards = this.physics.add.group({ allowGravity: false });
        this.survivors = this.physics.add.staticGroup();
        this.walls = this.physics.add.staticGroup();

        const activeTexture = this.getActiveHeliTextureKey();
        this.player = this.physics.add.sprite(400, 785, activeTexture);

        this.player.setScale(0.15);
        const targetWidth = 60;
        const targetHeight = 55;

        this.player.body.setSize(
            targetWidth / this.player.scaleX, 
            targetHeight / this.player.scaleY
        );

        this.player.body.setOffset(
            (this.player.width - (targetWidth / this.player.scaleX)) / 2,
            (this.player.height - (targetHeight / this.player.scaleY)) / 2
        );

        this.player.setFlipX(true);

        this.player.setCollideWorldBounds(true, 0, 0, true);
        this.player.setBounce(1, 0);

        this.lavaGraphics = this.add.graphics();
        this.lavaGraphics.setDepth(100); 

        // --- COLLIDER---
        this.physics.add.collider(this.player, this.walls, this.handleWallCollision, null, this);
        
        this.physics.add.overlap(this.player, this.hazards, this.handleHazardCollision, null, this);
        this.physics.add.overlap(this.player, this.flyingHazards, this.handleHazardCollision, null, this);

        this.physics.add.collider(this.player, this.platforms, (player, platform) => {
            if (this.isPhasing) return; 
            if (!player.body.touching.down && !player.body.blocked.down) {
                this.handleHazardCollision();
            }
        }, null, this);

        this.physics.add.overlap(this.player, this.survivors, this.collectPerson, null, this);

        // STEUERUNG KEYS
        this.cursors = this.input.keyboard.createCursorKeys();
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // FÄHIGKEITEN KEYS (Q, W, E)
        this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.cameras.main.startFollow(this.player, true, 0, 1, 0, 200);
        this.cameras.main.setBounds(0, -999999, 800, 999999 + 800);

        //Sound:
        this.heliSound = this.sound.add('heli_loop', { loop: true, volume: 0 });
        this.heliSound.play();

        this.lavaSound = this.sound.add('lava', { loop: true, volume: 0 });
        this.lavaSound.play();

        //Background Song:
        this.bgMusic = this.sound.add('song', { loop: true, volume: 0.25 });
        this.bgMusic.play();
    }

    update(time, delta) {
        let cameraBottom = this.cameras.main.scrollY + this.cameras.main.height;
        let cameraTop = this.cameras.main.scrollY;

        let heightFlown = Math.max(0, 785 - this.player.y);

        // 2. Exakte Reserve deines 1692px hohen Bildes im 800px Fenster
        let maxOffset = 1692 - 800; // 892 Pixel Reserve

        // 3. Asymptotischer Fortschritt (0.0 bis max ~0.999)
        let progress = heightFlown / (heightFlown + 12000); 

        // 4. Das Bild startet bei Y = 800 und schiebt sich mit steigender Höhe nach unten
        this.bgDynamic.y = 800 + (progress * maxOffset);

        if (this.player.y > cameraBottom + 50) {
            this.resetGameManual(); 
            return;
        }

        // Tasten-Abfragen für Fähigkeiten-Aktivierung während des Flugs
        if (Phaser.Input.Keyboard.JustDown(this.keyQ)) { this.activateShield(); } // Q = Shield
        if (Phaser.Input.Keyboard.JustDown(this.keyW)) { this.activateGrowth(); } // W = Growth
        if (Phaser.Input.Keyboard.JustDown(this.keyE)) { this.activatePhase(); }  // E = Phase

        let anyKeyDown = this.cursors.left.isDown || this.leftKey.isDown || 
                          this.cursors.right.isDown || this.rightKey.isDown;

        // Sobald das Spiel startet und abgehoben wird
        if (anyKeyDown && !this.lavaTriggered) {
            this.lavaTriggered = true;
            
            // Den Shop im UI sofort sperren
            if (typeof window.disableShopMenu === 'function') {
                window.disableShopMenu();
            }

            this.time.delayedCall(1000, () => {
                this.lavaStarted = true;
            }, [], this);
        }

        this.generateWalls();
        this.generateHazards();
        this.handleFlyingHazards(delta, cameraTop, cameraBottom);
        this.handleLava(delta, cameraBottom);

        // Lava-Berührungs-Check
        if (this.player.y >= this.lavaCurrentY) {
            this.resetGameManual();
            return;
        }

        // Check ob eine Person von der Lava getroffen wurde -> Game reset
        let lavaSwallowedSomeone = false;
        this.survivors.children.iterate((person) => {
            if (person && person.active) {
                if (person.y >= this.lavaCurrentY) {
                    lavaSwallowedSomeone = true;
                }
            }
        });

        if (lavaSwallowedSomeone) {
            console.log("Game Over: Eine Person wurde nicht aufgesammelt!");
            this.resetGameManual();
            return;
        }

        if (this.bounceTimer > 0) {
            this.bounceTimer -= delta;
            let leftPressed = this.cursors.left.isDown || this.leftKey.isDown;
            let rightPressed = this.cursors.right.isDown || this.rightKey.isDown;
            if (!leftPressed && !rightPressed) {
                this.player.setVelocityY(Math.abs(this.heliSettings.liftPower));
            } else {
                this.applyLift();
            }
            return; 
        }

        this.player.setAccelerationX(0);
        this.player.setAccelerationY(0);

        if (this.player.body.blocked.down && !this.cursors.left.isDown && !this.leftKey.isDown && !this.cursors.right.isDown && !this.rightKey.isDown) {
            this.player.setVelocity(0, 0);
            return; 
        }

        if (this.cursors.left.isDown || this.leftKey.isDown) {
            this.player.flipX = true;
            if (this.player.body.velocity.x > -this.heliSettings.startSpeedX) {
                this.player.setVelocityX(-this.heliSettings.startSpeedX);
            }
            this.player.setAccelerationX(-this.heliSettings.accelerationX);
            this.applyLift();
        } 
        else if (this.cursors.right.isDown || this.rightKey.isDown) {
            this.player.flipX = false;
            if (this.player.body.velocity.x < this.heliSettings.startSpeedX) {
                this.player.setVelocityX(this.heliSettings.startSpeedX);
            }
            this.player.setAccelerationX(this.heliSettings.accelerationX);
            this.applyLift();
        }
        else {
            this.player.setVelocityY(Math.abs(this.heliSettings.liftPower));
            this.player.setAccelerationX(0);
        }

        this.player.body.setMaxVelocityX(this.heliSettings.maxSpeedX);
        this.player.body.setMaxVelocityY(this.heliSettings.maxSpeedY);

        //Sound
        // --- DYNAMISCHER ROTOR-SOUND MIT INPUT-CHECK ---
        if (this.heliSound && this.heliSound.isPlaying) {
            let leftPressed = this.cursors.left.isDown || this.leftKey.isDown;
            let rightPressed = this.cursors.right.isDown || this.rightKey.isDown;
            
            // Wenn eine Taste gedrückt wird, dann ändert sich Intensität von Sound
            if (leftPressed || rightPressed) {
                let speedY = Math.abs(this.player.body.velocity.y);
                let speedFactor = Phaser.Math.Clamp(speedY / this.heliSettings.maxSpeedY, 0, 1);
                
                // Sound wird schneller/höher und lauter bei Bewegung
                this.heliSound.setRate(0.9 + (speedFactor * 0.5));
                this.heliSound.setVolume(0.25 + (speedFactor * 0.25));
            } else {
                // Kein Input -> Hubschrauber wird lautlos (volume = 0)
                this.heliSound.setVolume(0);
            }
        }
    }

    applyLift() {
        this.player.setVelocityY(this.heliSettings.liftPower);
    }

    handleLava(delta, cameraBottom) {
        if (this.lavaStarted) {
            let lavaSpeed = Math.abs(this.heliSettings.liftPower) * 0.5;
            this.lavaCurrentY -= (lavaSpeed * delta) / 1000;

            if (this.lavaCurrentY > this.player.y + this.maxLavaDistance) {
                this.lavaCurrentY = this.player.y + this.maxLavaDistance;
            }
        }

        this.lavaGraphics.clear();

        // --- Lava-Sound ---
        if (this.lavaCurrentY < cameraBottom) {
            // Lava ist auf dem Bildschirm sichtbar!
            this.lavaGraphics.fillStyle(0xff2200, 1.0);
            let height = cameraBottom - this.lavaCurrentY + 200;
            this.lavaGraphics.fillRect(0, this.lavaCurrentY, 800, height);

            // Abstand zwischen Spieler und Lava berechnen
            let distanceToLava = this.lavaCurrentY - this.player.y;
            
            // Je kleiner der Abstand (min 0, max maxLavaDistance), desto lauter der Sound
            let proximityFactor = 1 - Phaser.Math.Clamp(distanceToLava / this.maxLavaDistance, 0, 1);
            
            if (this.lavaSound && this.lavaSound.isPlaying) {
                // Sound wird lauter, je näher die Lava kommt (maximaler Volume-Wert hier: 0.6)
                this.lavaSound.setVolume(proximityFactor * 0.6);
            }
        } else {
            // Lava ist noch unterhalb des Bildschirms -> stummschalten
            if (this.lavaSound && this.lavaSound.isPlaying) {
                this.lavaSound.setVolume(0);
            }
        }
        
        if (this.lavaCurrentY < cameraBottom + 100) {
            this.lavaGraphics.fillStyle(0xff2200, 1.0);
            let height = cameraBottom - this.lavaCurrentY + 200;
            this.lavaGraphics.fillRect(0, this.lavaCurrentY, 800, height);
        }
    }

    // --- FÄHIGKEITEN LOGIK-METHODEN ---
    activateShield() {
        // Prüfen, ob bereits ein Schild aktiv ist ODER nicht genug Münzen vorhanden sind
        if (this.shieldHP > 0 || this.totalCoins < this.itemCosts.shield) return;
        
        this.totalCoins -= this.itemCosts.shield;
        
        // --- DOPPELTES SCHILD FÜR DEN SHIELD SPECIALIST -> Hubschrauber Special ---
        const activeHeliId = localStorage.getItem('heli_active_id') || 'shop-heli-1';
        if (activeHeliId === 'shop-heli-3') {
            this.shieldHP = 2; // Darf 2x getroffen werden
            this.player.setTint(0x00ffff); // Farbe, mal gucken
            console.log("Doppeltes Spezial-Schild gekauft & aktiviert!");
        } else {
            this.shieldHP = 1; // Standard-Heli darf 1x getroffen werden
            this.player.setTint(0x00aaff); // Normales Blau
            console.log("Standard-Schild gekauft & aktiviert!");
        }
        
        this.updateCoinDisplayHTML();
        this.sound.play('powerUp_shield', { volume: 0.6 });
        
        document.getElementById('card-shield')?.classList.add('active-item');
    }

    activateGrowth() {
        if (this.isGrowthActive || this.totalCoins < this.itemCosts.growth) return;

        this.totalCoins -= this.itemCosts.growth;
        this.isGrowthActive = true;
        this.updateCoinDisplayHTML();

        // Sound abspielen
        this.sound.play('powerUp_growth', { volume: 0.6 });
        
        document.getElementById('card-growth')?.classList.add('active-item');
        console.log("Riesen-Wachstum aktiviert!");

        this.survivors.children.iterate((person) => {
            if (person && person.active) {
                person.setScale(2);
                person.refreshBody();
            }
        });

        this.time.delayedCall(this.heliSettings.growthDuration, () => {
            this.isGrowthActive = false;
            
            document.getElementById('card-growth')?.classList.remove('active-item');
            console.log("Wachstum abgelaufen!");
            
            this.survivors.children.iterate((person) => {
                if (person && person.active) {
                    person.setScale(1);
                    person.refreshBody();
                }
            });
        });
    }

    activatePhase() {
        if (this.isPhasing || this.totalCoins < this.itemCosts.phase) return;

        this.totalCoins -= this.itemCosts.phase;
        this.isPhasing = true;
        this.updateCoinDisplayHTML();
        this.player.setAlpha(0.4);

        // Sound abspielen
        this.sound.play('powerUp_phase', { volume: 0.6 });
        
        document.getElementById('card-phase')?.classList.add('active-item');
        console.log("Phase-Modus gekauft!");

        this.time.delayedCall(this.heliSettings.phaseDuration, () => {
            this.isPhasing = false;
            if (!this.hasShield) this.player.clearTint();
            this.player.setAlpha(1.0);
            
            document.getElementById('card-phase')?.classList.remove('active-item');
            console.log("Phase-Modus beendet!");
        });
    }

    handleHazardCollision() {
        if (this.isPhasing) return; 

        // --- SCHILD-PUNKTE ABZIEHEN -> Special Heli ---
        if (this.shieldHP > 0) {
            this.shieldHP -= 1; // Einen Schildpunkt abziehen
            
            // Kurzer Soundeffekt für den Schild-Treffer
            this.sound.play('explosion', { volume: 0.5, rate: 1.5 });

            if (this.shieldHP === 1) {
                // Reduziertes Schild
                this.player.setTint(0x00aaff); // Färbung auf normales Schild-Blau abschwächen
                console.log("Erste Schildstufe zerstört! Noch 1 Schildpunkt übrig.");
                
                // Kurze Unverwundbarkeit, damit man nicht sofort den zweiten Punkt verliert, wie bei standard schild
                this.isPhasing = true;
                this.player.setAlpha(0.6);
                this.time.delayedCall(400, () => {
                    this.isPhasing = false;
                    this.player.setAlpha(1.0);
                });
                return;
            } else if (this.shieldHP === 0) {
                // Schild ist komplett weg
                this.player.clearTint(); 
                console.log("Schild komplett zerstört!");
                
                document.getElementById('card-shield')?.classList.remove('active-item');
                
                // Kurze Unverwundbarkeit nach komplettem Schildbruch
                this.isPhasing = true;
                this.player.setAlpha(0.6);
                this.time.delayedCall(500, () => {
                    this.isPhasing = false;
                    this.player.setAlpha(1.0);
                });
                return;
            }
        }

        // Fataler Crash ohne Schild -> Explosion & Game Over
        this.sound.play('explosion', { volume: 0.8 });
        this.resetGameManual();
    }

    collectPerson(player, person) {
        this.survivors.killAndHide(person);
        person.body.enable = false; 
        
        this.rescuedCount += 1;

        // Sound abspielen
        this.sound.play('pickup_person', { volume: 0.5 });
        
        let currentDisplay = document.querySelector('.current-rescue-display');
        if (currentDisplay) {
            currentDisplay.innerHTML = String(this.rescuedCount).padStart(4, '0');
        }
    }

    generateHazards() {
        let targetY = this.player.y - 1000;
        while (this.highestGeneratedHazardY > targetY) {
            this.highestGeneratedHazardY -= this.hazardIntervalY;

            let randomX = Phaser.Math.Between(150, 650);
            let blockType = Phaser.Math.Between(0, 2);
            let block = null;

            if (blockType === 0) {
                block = this.platforms.create(randomX, this.highestGeneratedHazardY, 'block_apartment');
                block.refreshBody();
            } else if (blockType === 1) {
                block = this.hazards.create(randomX, this.highestGeneratedHazardY, 'block_forest');
                block.refreshBody();
            } else {
                block = this.hazards.create(randomX, this.highestGeneratedHazardY, 'block_house'); 
                block.refreshBody();
            }

            if (Math.random() < this.rescueChance) {
                let personX = randomX;
                let personY = this.highestGeneratedHazardY;

                if (blockType === 0) personY = block.y - (block.height / 2) - 10;
                else if (blockType === 1) personY = block.y - (block.height / 2) - 10;
                else personY = block.y - (block.height / 2) - 10;

                let person = this.survivors.create(personX, personY, 'person_new');
                
                if (this.isGrowthActive) {
                    person.setScale(2);
                }
                
                person.refreshBody();
            }
        }
        this.clearOldObjectsFromGroup(this.hazards);
        this.clearOldObjectsFromGroup(this.platforms);
        this.clearOldObjectsFromGroup(this.survivors);
    }

    handleFlyingHazards(delta, cameraTop, cameraBottom) {
        this.flyingHazardTimer += delta;
        if (this.flyingHazardTimer >= this.flyingHazardInterval && this.player.y < 600) {
            this.flyingHazardTimer = 0;
            if (Phaser.Math.Between(0, 1) === 1) {
                let isRocket = Phaser.Math.Between(0, 1) === 1;
                if (isRocket) {
                    let spawnX = Phaser.Math.Between(150, 650); 
                    let spawnY = cameraBottom + 50; 
                    let rocket = this.flyingHazards.create(spawnX, spawnY, 'block_rocket');
                    let rocketSpeed = -(this.heliSettings.maxSpeedY + 150);
                    rocket.setVelocityY(rocketSpeed);
                    // Rakete zeigt nach oben, also 0 Grad lassen

                    // Sound abspielen
                    this.sound.play('rocket', { volume: 0.5 });

                } else {
                    let fromLeft = Phaser.Math.Between(0, 1) === 1;
                    let spawnX = fromLeft ? -200 : 1000;
                    let spawnY = Phaser.Math.Between(cameraTop - 50, cameraTop + 250);
                    let bar = this.flyingHazards.create(spawnX, spawnY, 'block_flight');
                    let speedX = Phaser.Math.Between(150, 250);

                    // Sound abspielen, Stereo Planning abhängig von richunng!
                    this.sound.play('plane', { volume: .75, pan: fromLeft ? -0.6 : 0.6 });
                    
                    // Rotation anpassen:
                    if (fromLeft) {
                        bar.setAngle(90); // Spitze zeigt nach rechts
                        bar.setVelocityX(speedX);
                    } else {
                        bar.setAngle(-90); // Spitze zeigt nach links
                        bar.setVelocityX(-speedX);
                    }
                }
            }
        }
        
        // Iteration 
        this.flyingHazards.getChildren().forEach((child) => {
            if (child.active) {
                if (child.texture.key === 'block_rocket' && child.y < cameraTop - 100) {
                    this.flyingHazards.killAndHide(child);
                    child.body.enable = false;
                }
                else if (child.texture.key === 'block_flight' && (child.x < -300 || child.x > 1100)) {
                    this.flyingHazards.killAndHide(child);
                    child.body.enable = false;
                }
                else if (child.y > cameraBottom + 200) {
                    this.flyingHazards.killAndHide(child);
                    child.body.enable = false;
                }
            }
        });
    }

    clearOldObjectsFromGroup(group) {
        group.children.iterate((child) => {
            if (child && child.y > this.player.y + 1000) {
                group.killAndHide(child);
                child.body.enable = false; 
            }
        });
    }

    resetGameManual() {
        if (this.heliSound) {
            this.heliSound.stop();
        }

        // Prüfen, ob der Spieler die Lava berührt hat ODER die Lava gestartet war und jemanden verschlungen hat
        if (this.player.y >= this.lavaCurrentY) {
            // Spieler ist in die Lava gestürzt -> Lava-Explosion!
            this.sound.play('explosion_lava', { volume: 0.85 });
        } else {
            // Überprüfen, ob eine Person von Lava verschlungen wurde
            let lavaSwallowedSomeone = false;
            this.survivors.children.iterate((person) => {
                if (person && person.active && person.y >= this.lavaCurrentY) {
                    lavaSwallowedSomeone = true;
                }
            });

            if (lavaSwallowedSomeone) {
                this.sound.play('explosion_lava', { volume: 0.7, rate: 0.8 });
            } else {
                //normale explosion dann hier
            }
        }
        
        this.loadActiveHeliSettings();

        const activeTexture = this.getActiveHeliTextureKey();
        this.player.setTexture(activeTexture);

        if (this.rescuedCount > 0) {
            let coinsEarned = this.rescuedCount * 2; 
            this.totalCoins += coinsEarned;
            localStorage.setItem('heli_total_coins', this.totalCoins);
            
            console.log(`--- RUNDEN-ABRECHNUNG ---`);
            this.updateHighScoreHTML(this.rescuedCount);
            this.updateCoinDisplayHTML();
        }

        // Fähigkeiten-Zustände zurücksetzen
        this.shieldHP = 0;
        this.isPhasing = false;
        this.isGrowthActive = false;
        this.player.clearTint();
        this.player.setAlpha(1.0);

        // Alle HTML-Leuchteffekte beim Game Over komplett entfernen
        document.getElementById('card-shield')?.classList.remove('active-item');
        document.getElementById('card-phase')?.classList.remove('active-item');
        document.getElementById('card-growth')?.classList.remove('active-item');

        this.player.setPosition(400, 785);
        this.player.setVelocity(0, 0);
        this.player.setAcceleration(0, 0);
        
        this.walls.clear(true, true);
        this.highestGeneratedY = 840;
        this.hazards.clear(true, true);
        this.platforms.clear(true, true);
        this.highestGeneratedHazardY = 800;
        this.flyingHazards.clear(true, true);
        this.flyingHazardTimer = 0;
        this.survivors.clear(true, true);
        
        this.rescuedCount = 0;
        this.lavaStarted = false;
        this.lavaTriggered = false;
        this.lavaCurrentY = 1200;
        this.lavaGraphics.clear();
        this.bounceTimer = 0;
        this.cameras.main.scrollY = 0;

        let currentDisplay = document.querySelector('.current-rescue-display');
        if (currentDisplay) {
            currentDisplay.innerHTML = '0000';
        }

        // Am Ende das Shop-Menü im UI wieder freigeben
        if (typeof window.enableShopMenu === 'function') {
            window.enableShopMenu();
        }

        // Heli-Sound für die nächste Runde starten
        if (this.heliSound) {
            this.heliSound.setRate(0.85);
            this.heliSound.setVolume(0.2);
            this.heliSound.play();
        }
    }

    updateCoinDisplayHTML() {
        let coinElement = document.querySelector('.coin-display');
        if (coinElement) {
            coinElement.innerText = String(this.totalCoins).padStart(4, '0');
        }
        localStorage.setItem('heli_total_coins', this.totalCoins);
    }

    updateHighScoreHTML(newScore) {
        let highScore = localStorage.getItem('heli_people_highscore') || 0;
        if (newScore > highScore) {
            highScore = newScore;
            localStorage.setItem('heli_people_highscore', highScore);
        }
        let element = document.querySelector('.score-display');
        if (element) element.innerText = String(highScore).padStart(4, '0');
    }

    generateWalls() {
        let targetY = this.player.y - 1000;
        while (this.highestGeneratedY > targetY) {
            this.highestGeneratedY -= this.wallBlockHeight;
            let leftWall = this.walls.create(20, this.highestGeneratedY, 'wall_placeholder');
            leftWall.setVisible(true); 
            leftWall.refreshBody();
            let rightWall = this.walls.create(780, this.highestGeneratedY, 'wall_placeholder');
            rightWall.setVisible(true); 
            rightWall.refreshBody();
        }
        this.walls.children.iterate((child) => {
            if (child && child.y > this.player.y + 1000) {
                this.walls.killAndHide(child);
                child.body.enable = false; 
            }
        });
    }

    handleWallCollision(player, wall) {
        if (this.isPhasing) return; 
        if (this.bounceTimer > 0) return;

        // Sound abspielen
        this.sound.play('wallHit', { volume: 0.4 });
        
        this.bounceTimer = 200;
        let bounceSpeedX = this.heliSettings.maxSpeedX * 0.9;
        let currentVelocityY = player.body.velocity.y;

        // Wenn der Heli links gegen die Wand prallt (x < 400), fliegt er nach rechts
        if (player.x < 400) {
            player.setVelocity(bounceSpeedX, currentVelocityY);
            player.flipX = false; // Drehe den Heli nach rechts
        } 
        // Wenn der Heli rechts gegen die Wand prallt, fliegt er nach links
        else {
            player.setVelocity(-bounceSpeedX, currentVelocityY);
            player.flipX = true; // Drehe den Heli nach links
        }
    }

    getActiveHeliTextureKey() {
        const activeId = localStorage.getItem('heli_active_id') || 'shop-heli-1';
        if (typeof HELI_DATABASE !== 'undefined' && HELI_DATABASE[activeId]) {
            return HELI_DATABASE[activeId].textureKey;
        }
        return 'heli_sprite_1';
    }

}