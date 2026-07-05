// js/scenes/BootScene.js
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Hier kommen ALLE deine canvas-Definitionen rein (wie du sie früher hattest)
        this.createPlaceholderTexture('heli_placeholder', 40, 30, '#ffffff');
        this.createPlaceholderTexture('wall_placeholder', 40, 40, '#4a3728');
        this.createPlaceholderTexture('block_square', 120, 120, '#0055ff');
        this.createPlaceholderTexture('block_rect', 80, 180, '#ffaa00');
        this.createPlaceholderTexture('block_horizontal', 160, 40, '#9900ff');
        this.createPlaceholderTexture('block_rocket', 30, 80, '#00ffcc');
        this.createPlaceholderTexture('person_placeholder', 20, 40, '#e0e0e0');
        
        // Speziell für das Dreieck, da es kein einfaches Rechteck ist
        let triCanvas = this.textures.createCanvas('block_triangle', 120, 120);
        let triCtx = triCanvas.context;
        triCtx.fillStyle = '#ff3333';
        triCtx.beginPath();
        triCtx.moveTo(60, 0); triCtx.lineTo(120, 120); triCtx.lineTo(0, 120);
        triCtx.closePath(); triCtx.fill();
        triCanvas.refresh();
    }

    // Hilfsfunktion zum sauberen Erstellen
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