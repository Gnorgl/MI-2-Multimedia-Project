// js/scenes/BootScene.js
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Background
        this.load.image('bg_jungle_dynamic', 'assets/sprites/background.jpg');

        // Hubschrauber aus der Database laden
        Object.keys(HELI_DATABASE).forEach(id => {
            const heli = HELI_DATABASE[id];
            this.load.image(heli.textureKey, heli.image);
        });

        // Hindernisse & Personen PNGs direkt laden
        this.load.image('block_house', 'assets/sprites/burning-house.png');
        this.load.image('block_apartment', 'assets/sprites/burning-building.png');
        this.load.image('block_forest', 'assets/sprites/burning-forest.png');
        this.load.image('block_flight', 'assets/sprites/airplane.png');
        this.load.image('block_rocket', 'assets/sprites/rocket.png');
        this.load.image('person_new', 'assets/sprites/person.png');
        
        // Placeholders (z.B. für Wände)
        this.createPlaceholderTexture('wall_placeholder', 40, 40, '#0f172a');

        // Audio
        this.load.audio('ui_click', 'assets/audio/blipSelect/blipSelect (2).wav');
        this.load.audio('explosion', 'assets/audio/explosion/explosion.wav');
        this.load.audio('explosion_lava', 'assets/audio/explosion/explosion (1).wav');
        this.load.audio('heli_loop', 'assets/audio/helicopter/helicopter (2).wav');
        this.load.audio('pickup_person', 'assets/audio/pickup/pickup2.wav');
        this.load.audio('plane', 'assets/audio/plane/plane (3).wav');
        
        // Abilities-Audio
        this.load.audio('powerUp_shield', 'assets/audio/powerUp/powerUp (3).wav');
        this.load.audio('powerUp_growth', 'assets/audio/powerUp/powerUp (1).wav');
        this.load.audio('powerUp_phase', 'assets/audio/powerUp/powerUp.wav');

        this.load.audio('rocket', 'assets/audio/rocket/rocket (1).wav');
        this.load.audio('wallHit', 'assets/audio/wallHit/wallHit (1).wav');
        this.load.audio('lava', 'assets/audio/lava/lava.wav');
        this.load.audio('song', 'assets/audio/backgroundSong/Song.ogg');
    }

    createPlaceholderTexture(key, w, h, color) {
        let canvas = this.textures.createCanvas(key, w, h);
        canvas.context.fillStyle = color;
        canvas.context.fillRect(0, 0, w, h);
        canvas.refresh();
    }

    create() {
        this.scene.start('GameScene');
    }
}