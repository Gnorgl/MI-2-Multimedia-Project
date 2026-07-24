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

        // Skalierungs-Konstanten für PNGs
        this.obstacleScale = 0.25;  // Skalierung für Häuser / Bäume / Flugzeuge
        this.personBaseScale = 0.1; // Basis-Skalierung für Überlebende

        // Münzkonto
        this.totalCoins = parseInt(localStorage.getItem('heli_total_coins')) || 0;

        // --- AKTIVE FÄHIGKEITEN STATE ---
        this.shieldHP = 0;           // Q: Schild
        this.isGrowthActive = false; // W: Personen-Wachstum
        this.isPhasing = false;      // E: Phase

        // Visuals & Partikel
        this.shieldGraphic = null;
        this.shieldAngle = 0;
        this.rotorParticles = null;
        this.shieldBreakParticles = null;

        // Item-Kosten
        this.itemCosts = {
            shield: 15,
            growth: 20,
            phase: 25
        };

        this.isBouncing = false; 
        this.bounceTimer = 0;   

        // Erweiterte Heli-Settings
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
        this.bgDynamic.setOrigin(0, 1.0); 
        this.bgDynamic.setScrollFactor(0); 
        this.bgDynamic.setDepth(-100);

        this.physics.world.setBounds(0, -999999, 800, 999999 + 800); 

        this.hazards = this.physics.add.staticGroup();
        this.platforms = this.physics.add.staticGroup();
        this.flyingHazards = this.physics.add.group({ allowGravity: false });
        this.survivors = this.physics.add.staticGroup();
        this.walls = this.physics.add.staticGroup();

        const activeTexture = this.getActiveHeliTextureKey();
        this.player = this.physics.add.sprite(400, 785, activeTexture);

        // Player PNG Skalierung und Hitbox
        this.player.setScale(0.125);
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

        // --- PARTIKEL & VISUALS SETUP ---
        this.createEffects();

        this.lavaGraphics = this.add.graphics();
        this.lavaGraphics.setDepth(100); 

        // --- COLLIDER ---
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

        // Sounds
        this.heliSound = this.sound.add('heli_loop', { loop: true, volume: 0 });
        this.heliSound.play();

        this.lavaSound = this.sound.add('lava', { loop: true, volume: 0 });
        this.lavaSound.play();

        this.bgMusic = this.sound.add('song', { loop: true, volume: 0.125 });
        this.bgMusic.play();
    }

    createEffects() {
        // 1. Visuelles Schild (Graphics)
        this.shieldGraphic = this.add.graphics();
        this.shieldGraphic.setDepth(10);

        // Erzeuge eine weiße Textur im Speicher für dynamische Partikel
        if (!this.textures.exists('particle_white')) {
            let canvas = this.textures.createCanvas('particle_white', 8, 8);
            let ctx = canvas.context;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(4, 4, 4, 0, Math.PI * 2);
            ctx.fill();
            canvas.refresh();
        }

        // 2. NEU: Rotor-Bewegungs-Effect (Graphics)
        this.rotorGraphic = this.add.graphics();
        this.rotorGraphic.setDepth(6); // Direkt über dem Helikopter anzeigen
        this.rotorAngle = 0;

        // 3. Schild-Bruch-Partikel-Emitter (Burst bei Kollision)
        this.shieldBreakParticles = this.add.particles(0, 0, 'particle_white', {
            speed: { min: 100, max: 250 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0x00ffff, 0x00aaff, 0xffffff],
            lifespan: 500,
            blendMode: 'ADD',
            emitting: false
        });
        this.shieldBreakParticles.setDepth(15);
    }

    updateRotorGraphic(time, isMoving) {
        this.rotorGraphic.clear();

        if (!this.player.active || !isMoving) return;

        // Position relativ zur Helikopter-Mitte
        const x = this.player.x;
        const y = this.player.y - 30; // Höhe leicht über den Kufen/Mitte

        // Zeitbasierter Effekt für Bewegung
        const offset = (time % 150) / 150; 
        const alpha = 0.6 - (offset * 0.4);

        this.rotorGraphic.lineStyle(2, 0xffffff, alpha);

        // Linker Luftwirbel (drückt nach unten weg)
        this.rotorGraphic.beginPath();
        this.rotorGraphic.arc(x - 35, y + (offset * 10), 8, Math.PI * 0.8, Math.PI * 1.5);
        this.rotorGraphic.strokePath();

        // Rechter Luftwirbel
        this.rotorGraphic.beginPath();
        this.rotorGraphic.arc(x + 35, y + (offset * 10), 8, Math.PI * 1.5, Math.PI * 0.2);
        this.rotorGraphic.strokePath();
    }

    update(time, delta) {
        let cameraBottom = this.cameras.main.scrollY + this.cameras.main.height;
        let cameraTop = this.cameras.main.scrollY;

        let heightFlown = Math.max(0, 785 - this.player.y);
        let maxOffset = 1692 - 800; 
        let progress = heightFlown / (heightFlown + 12000); 

        this.bgDynamic.y = 800 + (progress * maxOffset);

        if (this.player.y > cameraBottom + 50) {
            this.resetGameManual(); 
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keyQ)) { this.activateShield(); }
        if (Phaser.Input.Keyboard.JustDown(this.keyW)) { this.activateGrowth(); }
        if (Phaser.Input.Keyboard.JustDown(this.keyE)) { this.activatePhase(); }

        let anyKeyDown = this.cursors.left.isDown || this.leftKey.isDown || 
                          this.cursors.right.isDown || this.rightKey.isDown;

        if (anyKeyDown && !this.lavaTriggered) {
            this.lavaTriggered = true;
            
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

        this.updateRotorGraphic(time, anyKeyDown);

        // Update Schild Visuals
        this.updateShieldGraphic(time);

        if (this.player.y >= this.lavaCurrentY) {
            this.resetGameManual();
            return;
        }

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

        if (this.heliSound && this.heliSound.isPlaying) {
            let leftPressed = this.cursors.left.isDown || this.leftKey.isDown;
            let rightPressed = this.cursors.right.isDown || this.rightKey.isDown;
            
            if (leftPressed || rightPressed) {
                let speedY = Math.abs(this.player.body.velocity.y);
                let speedFactor = Phaser.Math.Clamp(speedY / this.heliSettings.maxSpeedY, 0, 1);
                
                this.heliSound.setRate(0.9 + (speedFactor * 0.5));
                this.heliSound.setVolume(0.25 + (speedFactor * 0.25));
            } else {
                this.heliSound.setVolume(0);
            }
        }
    }

    updateShieldGraphic(time) {
        this.shieldGraphic.clear();

        if (this.shieldHP <= 0 || !this.player.active) return;

        this.shieldAngle += 0.03;
        let pulse = Math.sin(time / 150) * 3; // Sanftes Pulsieren
        let radius = 45 + pulse;

        if (this.shieldHP === 2) {
            // Doppelter Schild (Cyan & Blau)
            this.shieldGraphic.lineStyle(3, 0x00ffff, 0.9);
            this.shieldGraphic.strokeCircle(this.player.x, this.player.y, radius + 6);
            
            this.shieldGraphic.lineStyle(2, 0x00aaff, 0.6);
            this.shieldGraphic.strokeCircle(this.player.x, this.player.y, radius);
        } else {
            // Einfacher Schild (Blau)
            this.shieldGraphic.lineStyle(3, 0x00aaff, 0.85);
            this.shieldGraphic.strokeCircle(this.player.x, this.player.y, radius);
        }

        // Dekorative rotierende Schild-Segmente
        let x1 = this.player.x + Math.cos(this.shieldAngle) * radius;
        let y1 = this.player.y + Math.sin(this.shieldAngle) * radius;
        let x2 = this.player.x + Math.cos(this.shieldAngle + Math.PI) * radius;
        let y2 = this.player.y + Math.sin(this.shieldAngle + Math.PI) * radius;

        this.shieldGraphic.fillStyle(0xffffff, 0.9);
        this.shieldGraphic.fillCircle(x1, y1, 4);
        this.shieldGraphic.fillCircle(x2, y2, 4);
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

        if (this.lavaCurrentY < cameraBottom) {
            this.lavaGraphics.fillStyle(0xff2200, 1.0);
            let height = cameraBottom - this.lavaCurrentY + 200;
            this.lavaGraphics.fillRect(0, this.lavaCurrentY, 800, height);

            let distanceToLava = this.lavaCurrentY - this.player.y;
            let proximityFactor = 1 - Phaser.Math.Clamp(distanceToLava / this.maxLavaDistance, 0, 1);
            
            if (this.lavaSound && this.lavaSound.isPlaying) {
                this.lavaSound.setVolume(proximityFactor * 0.6);
            }
        } else {
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
        if (this.shieldHP > 0 || this.totalCoins < this.itemCosts.shield) return;
        
        this.totalCoins -= this.itemCosts.shield;
        
        const activeHeliId = localStorage.getItem('heli_active_id') || 'shop-heli-1';
        if (activeHeliId === 'shop-heli-3') {
            this.shieldHP = 2; 
        } else {
            this.shieldHP = 1; 
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

        this.sound.play('powerUp_growth', { volume: 0.6 });
        document.getElementById('card-growth')?.classList.add('active-item');

        // Verdoppelt die Größe der Personen ausgehend von der Basis-Skalierung
        this.survivors.children.iterate((person) => {
            if (person && person.active) {
                person.setScale(this.personBaseScale * 1.75);
                person.refreshBody();
            }
        });

        this.time.delayedCall(this.heliSettings.growthDuration, () => {
            this.isGrowthActive = false;
            document.getElementById('card-growth')?.classList.remove('active-item');
            
            // Setzt die Größe der Personen zurück
            this.survivors.children.iterate((person) => {
                if (person && person.active) {
                    person.setScale(this.personBaseScale);
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

        this.sound.play('powerUp_phase', { volume: 0.6 });
        document.getElementById('card-phase')?.classList.add('active-item');

        this.time.delayedCall(this.heliSettings.phaseDuration, () => {
            this.isPhasing = false;
            this.player.setAlpha(1.0);
            
            document.getElementById('card-phase')?.classList.remove('active-item');
        });
    }

    handleHazardCollision() {
        if (this.isPhasing) return; 

        if (this.shieldHP > 0) {
            this.shieldHP -= 1; 
            this.sound.play('explosion', { volume: 0.5, rate: 1.5 });

            // Schild-Bruch Partikel-Explosion erzeugen
            if (this.shieldBreakParticles) {
                this.shieldBreakParticles.explode(25, this.player.x, this.player.y);
            }

            if (this.shieldHP === 1) {
                this.isPhasing = true;
                this.player.setAlpha(0.6);
                this.time.delayedCall(400, () => {
                    this.isPhasing = false;
                    this.player.setAlpha(1.0);
                });
                return;
            } else if (this.shieldHP === 0) {
                document.getElementById('card-shield')?.classList.remove('active-item');
                
                this.isPhasing = true;
                this.player.setAlpha(0.6);
                this.time.delayedCall(500, () => {
                    this.isPhasing = false;
                    this.player.setAlpha(1.0);
                });
                return;
            }
        }

        // Starker Kamera-Shake bei endgültiger Niederlage
        this.cameras.main.shake(300, 0.02);

        this.sound.play('explosion', { volume: 0.8 });
        this.resetGameManual();
    }

    collectPerson(player, person) {
        // Floating Text Animation "+1"
        let popup = this.add.text(person.x, person.y - 10, '+1', {
            fontSize: '22px',
            fontStyle: 'bold',
            fill: '#00ff66',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: popup,
            y: popup.y - 40,
            alpha: 0,
            duration: 800,
            ease: 'Power1',
            onComplete: () => popup.destroy()
        });

        this.survivors.killAndHide(person);
        person.body.enable = false; 
        
        this.rescuedCount += 1;
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
                // block_apartment (burning-building)
                block = this.platforms.create(randomX, this.highestGeneratedHazardY, 'block_apartment');
                block.setScale(this.obstacleScale);
                block.refreshBody();
            } else if (blockType === 1) {
                // block_forest (burning-forest)
                block = this.hazards.create(randomX, this.highestGeneratedHazardY, 'block_forest');
                block.setScale(this.obstacleScale);
                block.refreshBody();
            } else {
                // block_house (burning-house)
                block = this.hazards.create(randomX, this.highestGeneratedHazardY, 'block_house'); 
                block.setScale(this.obstacleScale);
                block.refreshBody();
            }

            if (Math.random() < this.rescueChance) {
                let personX = randomX;
                // Exakte Platzierung auf der Oberkante des Objekts
                let personY = block.y - (block.displayHeight / 2) - 15;

                let person = this.survivors.create(personX, personY, 'person_new');
                
                // Basis-Skalierung für Personen anwenden
                const currentScale = this.isGrowthActive ? (this.personBaseScale * 1.75) : this.personBaseScale;
                person.setScale(currentScale);
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
                    rocket.setScale(this.obstacleScale*.75);
                    
                    let rocketSpeed = -(this.heliSettings.maxSpeedY + 150);
                    rocket.setVelocityY(rocketSpeed);

                    this.sound.play('rocket', { volume: 0.5 });

                } else {
                    let fromLeft = Phaser.Math.Between(0, 1) === 1;
                    let spawnX = fromLeft ? -200 : 1000;
                    let spawnY = Phaser.Math.Between(cameraTop - 50, cameraTop + 250);
                    let bar = this.flyingHazards.create(spawnX, spawnY, 'block_flight');
                    bar.setScale(this.obstacleScale*.75);
                    let speedX = Phaser.Math.Between(150, 250);

                    this.sound.play('plane', { volume: 0.75, pan: fromLeft ? -0.6 : 0.6 });
                    
                    // Ausrichtung des Flugzeugs (PNG zeigt standardmäßig nach rechts)
                    if (fromLeft) {
                        bar.setAngle(0);
                        bar.setFlipX(false); // Zeigt nach rechts
                        bar.setVelocityX(speedX);
                    } else {
                        bar.setAngle(0);
                        bar.setFlipX(true);  // Gespiegelt = Zeigt nach links
                        bar.setVelocityX(-speedX);
                    }
                }
            }
        }
        
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

        if (this.player.y >= this.lavaCurrentY) {
            this.sound.play('explosion_lava', { volume: 0.85 });
        } else {
            let lavaSwallowedSomeone = false;
            this.survivors.children.iterate((person) => {
                if (person && person.active && person.y >= this.lavaCurrentY) {
                    lavaSwallowedSomeone = true;
                }
            });

            if (lavaSwallowedSomeone) {
                this.sound.play('explosion_lava', { volume: 0.7, rate: 0.8 });
            }
        }
        
        this.loadActiveHeliSettings();

        const activeTexture = this.getActiveHeliTextureKey();
        this.player.setTexture(activeTexture);

        if (this.rescuedCount > 0) {
            let coinsEarned = this.rescuedCount * 2; 
            this.totalCoins += coinsEarned;
            localStorage.setItem('heli_total_coins', this.totalCoins);
            
            this.updateHighScoreHTML(this.rescuedCount);
            this.updateCoinDisplayHTML();
        }

        this.shieldHP = 0;
        this.isPhasing = false;
        this.isGrowthActive = false;
        this.player.clearTint();
        this.player.setAlpha(1.0);

        if (this.shieldGraphic) this.shieldGraphic.clear();
        if (this.rotorGraphic) this.rotorGraphic.clear();

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

        if (typeof window.enableShopMenu === 'function') {
            window.enableShopMenu();
        }

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

        // Leichtes Kamera-Shake bei Wandaufprall
        this.cameras.main.shake(100, 0.005);

        this.sound.play('wallHit', { volume: 0.4 });
        
        this.bounceTimer = 200;
        let bounceSpeedX = this.heliSettings.maxSpeedX * 0.9;
        let currentVelocityY = player.body.velocity.y;

        if (player.x < 400) {
            player.setVelocity(bounceSpeedX, currentVelocityY);
            player.flipX = false; 
        } 
        else {
            player.setVelocity(-bounceSpeedX, currentVelocityY);
            player.flipX = true; 
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