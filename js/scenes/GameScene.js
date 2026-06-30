class GameScene extends Phaser.Scene {

    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.cursors = null;
        this.leftKey = null;
        this.rightKey = null;
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

        // Im constructor() ersetzen/ergänzen:
        this.survivors = null;
        this.rescuedCount = 0;    // Personen in der aktuellen Runde (Highscore)
        this.rescueChance = 0.50; 

        // NEU: Permanentes Münzkonto aus dem localStorage laden (Standard: 0)
        this.totalCoins = parseInt(localStorage.getItem('heli_total_coins')) || 0;
        console.log("Spielstand geladen. Münzen insgesamt:", this.totalCoins);

        this.isBouncing = false; 
        this.bounceTimer = 0;   

        this.heliSettings = {
            startSpeedX: 120,
            maxSpeedX: 280,
            maxSpeedY: 400,
            liftPower: -350,
            accelerationX: 400,
            dragX: 300
        };
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

        // TYPE 1: Gleichseitiges Viereck
        let sqCanvas = this.textures.createCanvas('block_square', 120, 120);
        let sqCtx = sqCanvas.context;
        sqCtx.fillStyle = '#0055ff';
        sqCtx.fillRect(0, 0, 120, 120);
        sqCanvas.refresh();

        // TYPE 2: Senkrechtes Rechteck
        let rectCanvas = this.textures.createCanvas('block_rect', 80, 180);
        let rectCtx = rectCanvas.context;
        rectCtx.fillStyle = '#ffaa00';
        rectCtx.fillRect(0, 0, 80, 180);
        rectCanvas.refresh();

        // TYPE 3: Dreieck
        let triCanvas = this.textures.createCanvas('block_triangle', 120, 120);
        let triCtx = triCanvas.context;
        triCtx.fillStyle = '#ff3333';
        triCtx.beginPath();
        triCtx.moveTo(60, 0);     
        triCtx.lineTo(120, 120);  
        triCtx.lineTo(0, 120);    
        triCtx.closePath();
        triCtx.fill();
        triCanvas.refresh();

        // Fliegender Querbalken
        let horizCanvas = this.textures.createCanvas('block_horizontal', 160, 40);
        let horizCtx = horizCanvas.context;
        horizCtx.fillStyle = '#9900ff';
        horizCtx.fillRect(0, 0, 160, 40);
        horizCanvas.refresh();

        // Rakete
        let rocketCanvas = this.textures.createCanvas('block_rocket', 30, 80);
        let rocketCtx = rocketCanvas.context;
        rocketCtx.fillStyle = '#00ffcc';
        rocketCtx.fillRect(0, 0, 30, 80);
        rocketCanvas.refresh();

        // NEU: Person (kleines, senkrechtes Rechteck, z.B. weiß/hellgrau)
        // ERHÖHT: Person ist jetzt größer (20x40 Pixel statt 12x24)
        let personCanvas = this.textures.createCanvas('person_placeholder', 20, 40);
        let personCtx = personCanvas.context;
        personCtx.fillStyle = '#e0e0e0';
        personCtx.fillRect(0, 0, 20, 40);
        canvas.refresh(); // Falls du refresh() nutzt, sonst personCanvas.refresh();
        personCanvas.refresh();
    }

    create() {
        // --- 1. WELTGRENZEN ---
        this.physics.world.setBounds(0, -999999, 800, 999999 + 800); 

        // --- 2. HINDERNIS- & RETTUNGS-GRUPPEN ---
        this.hazards = this.physics.add.staticGroup();
        this.platforms = this.physics.add.staticGroup();
        this.flyingHazards = this.physics.add.group({ allowGravity: false });
        
        // NEU: Statische Gruppe für die zu rettenden Personen
        this.survivors = this.physics.add.staticGroup();

        // --- 3. WÄNDE INITIALISIEREN ---
        this.walls = this.physics.add.staticGroup();

        // --- 4. HELIKOPTER ERZEUGEN ---
        this.player = this.physics.add.sprite(400, 785, 'heli_placeholder'); 
        this.player.setCollideWorldBounds(true, 0, 0, true);
        this.player.setBounce(1, 0);

        // --- 5. LAVA GRAFIK ERZEUGEN ---
        this.lavaGraphics = this.add.graphics();
        this.lavaGraphics.setDepth(100); 

        // --- 6. KOLLISIONEN & STEUERUNG ---
        this.physics.add.collider(this.player, this.walls, this.handleWallCollision, null, this);
        
        this.physics.add.overlap(this.player, this.hazards, this.resetGameManual, null, this);
        this.physics.add.overlap(this.player, this.flyingHazards, this.resetGameManual, null, this);

        this.physics.add.collider(this.player, this.platforms, (player, platform) => {
            if (!player.body.touching.down && !player.body.blocked.down) {
                this.resetGameManual();
            }
        }, null, this);

        // NEU: Overlap für das Einsammeln der Personen im haarscharfen Vorbeiflug
        this.physics.add.overlap(this.player, this.survivors, this.collectPerson, null, this);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // --- 7. KAMERA-EINSTELLUNGEN ---
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

        let anyKeyDown = this.cursors.left.isDown || this.leftKey.isDown || 
                          this.cursors.right.isDown || this.rightKey.isDown;

        if (anyKeyDown && !this.lavaTriggered) {
            this.lavaTriggered = true;
            this.time.delayedCall(1000, () => {
                this.lavaStarted = true;
            }, [], this);
        }

        this.generateWalls();
        this.generateHazards();
        this.handleFlyingHazards(delta, cameraTop, cameraBottom);
        
        // ... (Dein bestehender Code in update) ...
        
        this.handleLava(delta, cameraBottom);

        // Prüft, ob der Spieler die Lava berührt
        if (this.player.y >= this.lavaCurrentY) {
            this.resetGameManual();
            return;
        }

        // NEU: Prüft, ob die Lava eine zu rettende Person verschlingt
        let lavaSwallowedSomeone = false;
        this.survivors.children.iterate((person) => {
            if (person && person.active) {
                // Da Y nach unten hin größer wird: Wenn person.y >= lavaCurrentY, steht sie in der Lava
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

        // ... (Der Rest deiner update-Methode mit dem bounceTimer-Check etc.) ...

        

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

    // NEU: Methode zum Einsammeln einer Person bei Berührung
    collectPerson(player, person) {
        this.survivors.killAndHide(person);
        person.body.enable = false; // Physischen Körper abschalten
        
        this.rescuedCount += 1;
        console.log("Person gerettet! Runden-Konto:", this.rescuedCount);

        // NEU: Live-Anzeige im HTML aktualisieren
        let currentDisplay = document.querySelector('.current-rescue-display');
        if (currentDisplay) {
            currentDisplay.innerHTML = String(this.rescuedCount).padStart(4, '0') + ' <span class="walker-icon">🚶</span>';
        }
    }

    generateHazards() {
        let targetY = this.player.y - 1000;

        while (this.highestGeneratedHazardY > targetY) {
            this.highestGeneratedHazardY -= this.hazardIntervalY;

            let randomX = Phaser.Math.Between(150, 650);
            let blockType = Phaser.Math.Between(0, 2);
            let block = null;

            // 1. Das eigentliche Hindernis erstellen
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

            // Würfeln, ob auf diesem Hindernis eine Person spawnt
            if (Math.random() < this.rescueChance) {
                let personX = randomX;
                let personY = this.highestGeneratedHazardY;

                // Berechne die exakte Oberkante/Spitze basierend auf der Form des Objekts
                if (blockType === 0) {
                    // Quadrat (120x120) -> Oberkante ist MitteY - 60, abzüglich halbe Personenhöhe (20)
                    personY = this.highestGeneratedHazardY - 60 - 20;
                } else if (blockType === 1) {
                    // Rechteck/Turm (80x180) -> Oberkante ist MitteY - 90, abzüglich halbe Personenhöhe (20)
                    personY = this.highestGeneratedHazardY - 90 - 20;
                } else {
                    // Dreieck (120x120) -> Die Spitze oben ist exakt bei MitteY - 60, abzüglich halbe Personenhöhe (20)
                    personY = this.highestGeneratedHazardY - 60 - 20;
                }

                let person = this.survivors.create(personX, personY, 'person_placeholder');
                person.refreshBody();
            }
        }

        this.clearOldObjectsFromGroup(this.hazards);
        this.clearOldObjectsFromGroup(this.platforms);
        
        // NEU: Auch alte Personen, die weit unter dem Bildschirm liegen, sauber weglöschen
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
        // NEU: Payday! Abrechnung vor dem Reset
        if (this.rescuedCount > 0) {
            let coinsEarned = this.rescuedCount * 3;
            this.totalCoins += coinsEarned;
            
            // Dauerhaft im Browser speichern
            localStorage.setItem('heli_total_coins', this.totalCoins);
            
            console.log(`--- RUNDEN-ABRECHNUNG ---`);
            console.log(`Personen gerettet: ${this.rescuedCount}`);
            console.log(`Münzen verdient (+3x): ${coinsEarned}`);
            console.log(`Münzen Gesamtstand: ${this.totalCoins}`);
            
            // Highscore-HTML aktualisieren (Nutzt jetzt die Personenanzahl!)
            this.updateHighScoreHTML(this.rescuedCount);

            // HIER EINSETZEN: Münz-HTML auf der rechten Seite direkt aktualisieren!
            let coinElement = document.querySelector('.coin-display');
            if (coinElement) {
                coinElement.innerText = String(this.totalCoins).padStart(4, '0');
            }
        }

        // Ab hier folgt dein normaler Reset-Code...
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
        
        // Wichtig: Runden-Zähler erst NACH der Abrechnung nullen!
        this.rescuedCount = 0;

        this.lavaStarted = false;
        this.lavaTriggered = false;
        this.lavaCurrentY = 1200;
        this.lavaGraphics.clear();

        this.bounceTimer = 0;
        this.cameras.main.scrollY = 0;

        // ... (Dein restlicher Reset-Code am Ende von resetGameManual) ...
        this.bounceTimer = 0;
        this.cameras.main.scrollY = 0;

        // NEU: Live-Anzeige beim Game Over wieder auf 0000 zurücksetzen
        let currentDisplay = document.querySelector('.current-rescue-display');
        if (currentDisplay) {
            currentDisplay.innerHTML = '0000 <span class="walker-icon">🚶</span>';
        }
    }

    updateHighScoreHTML(newScore) {
        // Speichert die höchste Anzahl geretteter Personen
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
        if (this.bounceTimer > 0) return;
        this.bounceTimer = 200;
        let bounceSpeedX = this.heliSettings.maxSpeedX * 0.9;
        let currentVelocityY = player.body.velocity.y;

        if (player.x < 400) {
            player.setVelocity(bounceSpeedX, currentVelocityY);
        } else {
            player.setVelocity(-bounceSpeedX, currentVelocityY);
        }
    }
}