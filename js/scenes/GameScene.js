class GameScene extends Phaser.Scene {

    constructor() {
        super({ key: 'GameScene' });
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
        this.hasShield = false;       // Q: Schild aktiv? (Hält bis Einschlag)
        this.isGrowthActive = false;  // W: Personen-Wachstum aktiv?
        this.isPhasing = false;       // E: Phase aktiv? (Temporär durch Wände fliegen)

        // Item-Kosten
        this.itemCosts = {
            shield: 15,
            growth: 20,
            phase: 25
        };

        this.isBouncing = false; 
        this.bounceTimer = 0;   

        // Erweiterte Heli-Settings (Standardwerte, werden dynamisch überschrieben)
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

    preload() {
        // Helikopter
        let canvas = this.textures.createCanvas('heli_placeholder', 40, 30);
        let ctx = canvas.context;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 40, 30);
        canvas.refresh();

        // Wände
        let wallCanvas = this.textures.createCanvas('wall_placeholder', 40, this.wallBlockHeight);
        let wallCtx = wallCanvas.context;
        wallCtx.fillStyle = '#4a3728'; 
        wallCtx.fillRect(0, 0, 40, this.wallBlockHeight);
        wallCanvas.refresh();

        // Hindernisse (KORRIGIERT: Jedes Canvas refresht jetzt sich selbst!)
        let sqCanvas = this.textures.createCanvas('block_square', 120, 120);
        let sqCtx = sqCanvas.context;
        sqCtx.fillStyle = '#0055ff';
        sqCtx.fillRect(0, 0, 120, 120);
        sqCanvas.refresh(); // Korrigiert!

        let rectCanvas = this.textures.createCanvas('block_rect', 80, 180);
        let rectCtx = rectCanvas.context;
        rectCtx.fillStyle = '#ffaa00';
        rectCtx.fillRect(0, 0, 80, 180);
        rectCanvas.refresh(); // Korrigiert!

        let triCanvas = this.textures.createCanvas('block_triangle', 120, 120);
        let triCtx = triCanvas.context;
        triCtx.fillStyle = '#ff3333';
        triCtx.beginPath();
        triCtx.moveTo(60, 0);     
        triCtx.lineTo(120, 120);  
        triCtx.lineTo(0, 120);    
        triCtx.closePath();
        triCtx.fill();
        triCanvas.refresh(); // Korrigiert!

        let horizCanvas = this.textures.createCanvas('block_horizontal', 160, 40);
        let horizCtx = horizCanvas.context;
        horizCtx.fillStyle = '#9900ff';
        horizCtx.fillRect(0, 0, 160, 40);
        horizCanvas.refresh(); // Korrigiert!

        let rocketCanvas = this.textures.createCanvas('block_rocket', 30, 80);
        let rocketCtx = rocketCanvas.context;
        rocketCtx.fillStyle = '#00ffcc';
        rocketCtx.fillRect(0, 0, 30, 80);
        rocketCanvas.refresh(); // Korrigiert!

        // Person (20x40 Pixel)
        let personCanvas = this.textures.createCanvas('person_placeholder', 20, 40);
        let personCtx = personCanvas.context;
        personCtx.fillStyle = '#e0e0e0';
        personCtx.fillRect(0, 0, 20, 40);
        personCanvas.refresh(); // Korrigiert!
    }

    create() {
        // Sicherstellen, dass die Attribute vor Rundenstart frisch geladen sind
        this.loadActiveHeliSettings();

        this.physics.world.setBounds(0, -999999, 800, 999999 + 800); 

        this.hazards = this.physics.add.staticGroup();
        this.platforms = this.physics.add.staticGroup();
        this.flyingHazards = this.physics.add.group({ allowGravity: false });
        this.survivors = this.physics.add.staticGroup();
        this.walls = this.physics.add.staticGroup();

        this.player = this.physics.add.sprite(400, 785, 'heli_placeholder'); 
        this.player.setCollideWorldBounds(true, 0, 0, true);
        this.player.setBounce(1, 0);

        this.lavaGraphics = this.add.graphics();
        this.lavaGraphics.setDepth(100); 

        // --- COLLIDER & OVERLAPS ---
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
    }

    update(time, delta) {
        let cameraBottom = this.cameras.main.scrollY + this.cameras.main.height;
        let cameraTop = this.cameras.main.scrollY;

        if (this.player.y > cameraBottom + 50) {
            this.resetGameManual(); 
            return;
        }

        // Tasten-Abfragen für Fähigkeiten-Aktivierung während des Flugs (KORRIGIERTE REIHENFOLGE)
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

        // Prüft, ob der Spieler die Lava berührt
        if (this.player.y >= this.lavaCurrentY) {
            this.resetGameManual();
            return;
        }

        // Prüft, ob die Lava eine Person verschlingt
        let lavaSwallowedSomeone = false;
        this.survivors.children.iterate((person) => {
            if (person && person.active) {
                if (person.y >= this.lavaCurrentY) {
                    lavaSwallowedSomeone = true;
                }
            }
        });

        if (lavaSwallowedSomeone) {
            console.log("Game Over: Eine Person wurde von der Lava verschlungen!");
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
            if (this.player.body.velocity.x > -this.heliSettings.startSpeedX) {
                this.player.setVelocityX(-this.heliSettings.startSpeedX);
            }
            this.player.setAccelerationX(-this.heliSettings.accelerationX);
            this.applyLift();
        } 
        else if (this.cursors.right.isDown || this.rightKey.isDown) {
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
        if (this.lavaCurrentY < cameraBottom + 100) {
            this.lavaGraphics.fillStyle(0xff2200, 1.0);
            let height = cameraBottom - this.lavaCurrentY + 200;
            this.lavaGraphics.fillRect(0, this.lavaCurrentY, 800, height);
        }
    }

    // --- FÄHIGKEITEN LOGIK-METHODEN (KORRIGIERT) ---
    activateShield() {
        if (this.hasShield || this.totalCoins < this.itemCosts.shield) return;
        
        this.totalCoins -= this.itemCosts.shield;
        this.hasShield = true;
        this.updateCoinDisplayHTML();
        this.player.setTint(0x00aaff);
        
        document.getElementById('card-shield')?.classList.add('active-item');
        console.log("Schild gekauft & aktiviert!");
    }

    activateGrowth() {
        if (this.isGrowthActive || this.totalCoins < this.itemCosts.growth) return;

        this.totalCoins -= this.itemCosts.growth;
        this.isGrowthActive = true;
        this.updateCoinDisplayHTML();
        
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

        if (this.hasShield) {
            this.hasShield = false;
            this.player.clearTint(); 
            console.log("Schild zerstört!");
            
            document.getElementById('card-shield')?.classList.remove('active-item');
            
            this.isPhasing = true;
            this.player.setAlpha(0.6);
            this.time.delayedCall(500, () => {
                this.isPhasing = false;
                this.player.setAlpha(1.0);
            });
            return;
        }

        this.resetGameManual();
    }

    collectPerson(player, person) {
        this.survivors.killAndHide(person);
        person.body.enable = false; 
        
        this.rescuedCount += 1;
        
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
                block = this.platforms.create(randomX, this.highestGeneratedHazardY, 'block_square');
                block.refreshBody();
            } else if (blockType === 1) {
                block = this.hazards.create(randomX, this.highestGeneratedHazardY, 'block_rect');
                block.refreshBody();
            } else {
                block = this.hazards.create(randomX, this.highestGeneratedHazardY, 'block_triangle');
                block.refreshBody();
            }

            if (Math.random() < this.rescueChance) {
                let personX = randomX;
                let personY = this.highestGeneratedHazardY;

                if (blockType === 0) personY = this.highestGeneratedHazardY - 60 - 20;
                else if (blockType === 1) personY = this.highestGeneratedHazardY - 90 - 20;
                else personY = this.highestGeneratedHazardY - 60 - 20;

                let person = this.survivors.create(personX, personY, 'person_placeholder');
                
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
                } else {
                    let fromLeft = Phaser.Math.Between(0, 1) === 1;
                    let spawnX = fromLeft ? -200 : 1000;
                    let spawnY = Phaser.Math.Between(cameraTop - 50, cameraTop + 250);
                    let bar = this.flyingHazards.create(spawnX, spawnY, 'block_horizontal');
                    let speedX = Phaser.Math.Between(150, 250);
                    bar.setVelocityX(fromLeft ? speedX : -speedX);
                }
            }
        }
        this.flyingHazards.children.iterate((child) => {
            if (child) {
                if (child.texture.key === 'block_rocket' && child.y < cameraTop - 100) {
                    this.flyingHazards.killAndHide(child);
                    child.body.enable = false;
                }
                else if (child.texture.key === 'block_horizontal' && (child.x < -300 || child.x > 1100)) {
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
        // Frische Hubschrauber-Attribute aus dem Speicher laden (falls im Shop etwas geandert wurde)
        this.loadActiveHeliSettings();

        if (this.rescuedCount > 0) {
            let coinsEarned = this.rescuedCount * 2; 
            this.totalCoins += coinsEarned;
            localStorage.setItem('heli_total_coins', this.totalCoins);
            
            console.log(`--- RUNDEN-ABRECHNUNG ---`);
            this.updateHighScoreHTML(this.rescuedCount);
            this.updateCoinDisplayHTML();
        }

        // Fähigkeiten-Zustände zurücksetzen
        this.hasShield = false;
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
            leftWall.setVisible(false); 
            leftWall.refreshBody();
            let rightWall = this.walls.create(780, this.highestGeneratedY, 'wall_placeholder');
            rightWall.setVisible(false); 
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
        this.bounceTimer = 200;
        let bounceSpeedX = this.heliSettings.maxSpeedX * 0.9;
        let currentVelocityY = player.body.velocity.y;

        if (player.x < 400) player.setVelocity(bounceSpeedX, currentVelocityY);
        else player.setVelocity(-bounceSpeedX, currentVelocityY);
    }
}