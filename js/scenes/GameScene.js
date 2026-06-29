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
        let canvas = this.textures.createCanvas('heli_placeholder', 40, 30);
        let ctx = canvas.context;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 40, 30);
        canvas.refresh();

        let wallCanvas = this.textures.createCanvas('wall_placeholder', 40, this.wallBlockHeight);
        let wallCtx = wallCanvas.context;
        wallCtx.fillStyle = '#4a3728'; 
        wallCtx.fillRect(0, 0, 40, this.wallBlockHeight);
        wallCanvas.refresh();
    }

    create() {
        // --- 1. WELTGRENZEN ---
        this.physics.world.setBounds(0, -999999, 800, 999999 + 800); 

        // --- 2. LANDEPLATTFORM ERZEUGEN ---
        this.platforms = this.physics.add.staticGroup();
        
        let platCanvas = this.textures.createCanvas('landing_pad', 100, 20);
        let platCtx = platCanvas.context;
        platCtx.fillStyle = '#555555'; 
        platCtx.fillRect(0, 0, 100, 20);
        platCanvas.refresh();

        let startPlatform = this.platforms.create(400, 790, 'landing_pad');
        startPlatform.refreshBody();

        // --- 3. WÄNDE INITIALISIEREN ---
        this.walls = this.physics.add.staticGroup();

        // --- 4. HELIKOPTER ERZEUGEN ---
        this.player = this.physics.add.sprite(400, 765, 'heli_placeholder'); 
        this.player.setCollideWorldBounds(true, 0, 0, true);
        this.player.setBounce(1, 0);

        // --- 5. KOLLISIONEN & STEUERUNG ---
        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.player, this.walls, this.handleWallCollision, null, this);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        // --- 6. KAMERA-EINSTELLUNGEN ---
        this.cameras.main.startFollow(this.player, true, 0, 1, 0, 200);
        this.cameras.main.setBounds(0, -999999, 800, 999999 + 800);
    }

    update(time, delta) {
        // --- DYNAMISCHER ABSTURZ-CHECK ---
        let cameraBottom = this.cameras.main.scrollY + this.cameras.main.height;
        if (this.player.y > cameraBottom + 50) {
            this.scene.restart();
            return;
        }

        this.generateWalls();

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

    updateHighScoreHTML(newScore) {
        let highScore = localStorage.getItem('heli_highscore') || 0;
        if (newScore > highScore) {
            highScore = newScore;
            localStorage.setItem('heli_highscore', highScore);
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