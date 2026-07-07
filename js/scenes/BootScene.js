// js/scenes/BootScene.js
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.createHeliTexture();
        this.createHouseTexture();
        this.createPersonTexture();
        this.createRocketTexture();
        this.createFlightTexture()
        this.createApartmentTexture();
        this.createForestTexture()
        
        // Placeholders
        this.createPlaceholderTexture('wall_placeholder', 40, 40, '#535353');

        //Audio:
        this.load.audio('ui_click', 'assets/audio/blipSelect/blipSelect (2).wav');
        this.load.audio('explosion', 'assets/audio/explosion/explosion.wav')
        this.load.audio('explosion_lava', 'assets/audio/explosion/explosion (1).wav')
        this.load.audio('heli_loop', 'assets/audio/helicopter/helicopter (2).wav');
        this.load.audio('pickup_person', 'assets/audio/pickup/pickup2.wav');
        this.load.audio('plane', 'assets/audio/plane/plane.wav');
        //Abilities-Audio:
        this.load.audio('powerUp_shield', 'assets/audio/powerUp/powerUp (3).wav');
        this.load.audio('powerUp_growth', 'assets/audio/powerUp/powerUp (1).wav');
        this.load.audio('powerUp_phase', 'assets/audio/powerUp/powerUp.wav');

        this.load.audio('rocket', 'assets/audio/rocket/rocket (1).wav');

        this.load.audio('wallHit', 'assets/audio/wallHit/wallHit (1).wav');

    }

    createForestTexture() {
    const size = 128; // Etwas mehr Platz für die Details des Symbols
    let canvas = this.textures.createCanvas('block_forest', size, size);
    let ctx = canvas.context;

    ctx.font = `${size * 1.1}px 'Material Symbols Rounded'`;
    ctx.fillStyle = '#535353';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Das Symbol 'forest'
    ctx.fillText('forest', size / 2, size / 2);
    
    canvas.refresh();
    }

    createApartmentTexture() {
    const size = 128;
    let canvas = this.textures.createCanvas('block_apartment', size, size);
    let ctx = canvas.context;

    ctx.font = `${size * 1.1}px 'Material Symbols Rounded'`;
    ctx.fillStyle = '#535353';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Das Symbol 'apartment'
    ctx.fillText('apartment', size / 2, size / 2);
    
    canvas.refresh();
    }

    createFlightTexture() {
    const size = 64;
    let canvas = this.textures.createCanvas('block_flight', size, size);
    let ctx = canvas.context;

    ctx.font = `${size}px 'Material Symbols Rounded'`;
    ctx.fillStyle = '#535353';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Das Symbol 'flight'
    ctx.fillText('flight', size / 2, size / 2);
    
    canvas.refresh();
    }

    createRocketTexture() {
        const size = 64;
        let canvas = this.textures.createCanvas('block_rocket', size, size);
        let ctx = canvas.context;

        ctx.font = `${size * 1.1}px 'Material Symbols Rounded'`;
        ctx.fillStyle = '#535353';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Das 'rocket' Symbol
        ctx.fillText('rocket', size / 2, size / 2);
        
        canvas.refresh();
    }

    createPlaceholderTexture(key, w, h, color) {
        let canvas = this.textures.createCanvas(key, w, h);
        canvas.context.fillStyle = color;
        canvas.context.fillRect(0, 0, w, h);
        canvas.refresh();
    }

    createPersonTexture() {
    const size = 40;
    let canvas = this.textures.createCanvas('person_new', size, size);
    let ctx = canvas.context;

    ctx.font = `${size}px 'Material Symbols Rounded'`;
    ctx.fillStyle = '#535353'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Das Symbol 'accessibility_new'
    ctx.fillText('accessibility_new', size / 2, size / 2);
    
    canvas.refresh();
    }

    createHeliTexture() {
    const size = 64; 
    let canvas = this.textures.createCanvas('heli_placeholder', size, size);
    let ctx = canvas.context;

    // Stil-Einstellungen
    ctx.font = `${size}px 'Material Symbols Rounded'`;
    ctx.fillStyle = '#535353'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Symbol zeichnen
    ctx.fillText('helicopter', size / 2, size / 2);
    
    canvas.refresh();
    }

    createHouseTexture() {
        const size = 128;
        let canvas = this.textures.createCanvas('block_house', size, size);
        let ctx = canvas.context;

        ctx.font = `${size * 1.15}px 'Material Symbols Rounded'`;
        ctx.fillStyle = '#535353';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Das 'house' Symbol
        ctx.fillText('house', size / 2, size / 2);
        
        canvas.refresh();
    }

    create() {
        this.scene.start('GameScene');
    }
}