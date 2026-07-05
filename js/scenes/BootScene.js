// js/scenes/BootScene.js
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.createHeliTexture();
        this.createHouseTexture();
        this.createPersonTexture(); // accessibility_new
        this.createRocketTexture(); // NEU: rocket
        this.createFlightTexture()
        this.createApartmentTexture();
        this.createForestTexture()
        
        // Bestehende Placeholders
        this.createPlaceholderTexture('wall_placeholder', 40, 40, '#535353');
    }

    createForestTexture() {
    const size = 128; // Etwas mehr Platz für die Details des Symbols
    let canvas = this.textures.createCanvas('block_forest', size, size);
    let ctx = canvas.context;

    ctx.font = `${size * 1.1}px 'Material Symbols Rounded'`;
    ctx.fillStyle = '#535353'; // Ein kräftiges Dunkelgrün
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
    ctx.fillStyle = '#535353'; // Dein Blau
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
    ctx.fillStyle = '#535353'; // Oder deine Wunschfarbe
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

    // Hilfsfunktion zum sauberen Erstellen
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
    ctx.fillStyle = '#535353'; // Ein auffälliges Orange/Gelb, damit sie gut sichtbar sind
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Das Symbol 'accessibility_new'
    ctx.fillText('accessibility_new', size / 2, size / 2);
    
    canvas.refresh();
    }

    createHeliTexture() {
    const size = 64; // Etwas größer für bessere Auflösung
    let canvas = this.textures.createCanvas('heli_placeholder', size, size);
    let ctx = canvas.context;

    // Stil-Einstellungen
    ctx.font = `${size}px 'Material Symbols Rounded'`;
    ctx.fillStyle = '#535353'; // Dein UI-Grauton
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
        ctx.fillStyle = '#535353'; // Dein einheitliches Grau
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