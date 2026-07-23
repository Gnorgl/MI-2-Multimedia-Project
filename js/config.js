const HELI_DATABASE = {
    'shop-heli-1': {
        name: 'Start Heli', cost: 0,
        image: 'assets/sprites/helicopter.png',
        textureKey: 'heli_sprite_1',
        settings: { startSpeedX: 120, maxSpeedX: 280, maxSpeedY: 400, accelerationX: 400, phaseDuration: 5000, growthDuration: 6000 }
    },
    'shop-heli-2': {
        name: 'Standard Upgrade', cost: 100,
        image: 'assets/sprites/helicopter (1).png',
        textureKey: 'heli_sprite_2',
        settings: { startSpeedX: 140, maxSpeedX: 320, maxSpeedY: 420, accelerationX: 450, phaseDuration: 5000, growthDuration: 6000 }
    },
    'shop-heli-3': {
        name: 'Shield Specialist', cost: 250,
        image: 'assets/sprites/helicopter (2).png',
        textureKey: 'heli_sprite_3',
        settings: { startSpeedX: 160, maxSpeedX: 360, maxSpeedY: 450, accelerationX: 500, phaseDuration: 5000, growthDuration: 6000 }
    },
    'shop-heli-4': {
        name: 'Growth Specialist', cost: 250,
        image: 'assets/sprites/helicopter (3).png',
        textureKey: 'heli_sprite_4',
        settings: { startSpeedX: 160, maxSpeedX: 360, maxSpeedY: 450, accelerationX: 500, phaseDuration: 5000, growthDuration: 8000 }
    },
    'shop-heli-5': {
        name: 'Phase Specialist', cost: 250,
        image: 'assets/sprites/helicopter (4).png',
        textureKey: 'heli_sprite_5',
        settings: { startSpeedX: 160, maxSpeedX: 360, maxSpeedY: 450, accelerationX: 500, phaseDuration: 7000, growthDuration: 6000 }
    },
    'shop-heli-6': {
        name: 'Ultimate Upgrade', cost: 1000,
        image: 'assets/sprites/helicopter (5).png',
        textureKey: 'heli_sprite_6',
        settings: { startSpeedX: 180, maxSpeedX: 400, maxSpeedY: 500, accelerationX: 600, phaseDuration: 7000, growthDuration: 8000 }
    }
};

// Das Konfigurations-Objekt für Phaser
const config = {
    type: Phaser.AUTO,
    parent: 'game-container', 
    backgroundColor: '#f7f7f7',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800, 
        height: 800
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: [BootScene, GameScene] // Szenen-Reihenfolge festgelegt
};

// UI-Logik für den Shop (wird erst geladen, wenn HTML bereit ist)
document.addEventListener("DOMContentLoaded", () => {
    function playUiClickSound() {
        // Prüft, ob das Spiel und die BootScene bereit sind
        if (window.game && window.game.scene && window.game.scene.keys.BootScene) {
            window.game.scene.keys.BootScene.sound.play('ui_click', { volume: 0.6 });
        }
    }
    const savedHighScore = localStorage.getItem('heli_people_highscore') || 0;
    const scoreDisplay = document.querySelector('.score-display');
    if (scoreDisplay) scoreDisplay.innerText = String(savedHighScore).padStart(4, '0');

    let savedCoins = parseInt(localStorage.getItem('heli_total_coins')) || 0;
    const coinDisplay = document.querySelector('.coin-display');
    if (coinDisplay) coinDisplay.innerText = String(savedCoins).padStart(4, '0');

    if (!localStorage.getItem('heli_owned_list')) {
        localStorage.setItem('heli_owned_list', JSON.stringify(['shop-heli-1']));
    }
    if (!localStorage.getItem('heli_active_id')) {
        localStorage.setItem('heli_active_id', 'shop-heli-1');
    }

    const statsView = document.getElementById("stats-view");
    const shopView = document.getElementById("shop-view");
    const toggleShopBtn = document.getElementById("btn-heli-shop");

    function updateShopUI() {
        const ownedHelis = JSON.parse(localStorage.getItem('heli_owned_list')) || ['shop-heli-1'];
        const activeHeliId = localStorage.getItem('heli_active_id') || 'shop-heli-1';
        savedCoins = parseInt(localStorage.getItem('heli_total_coins')) || 0;

        Object.keys(HELI_DATABASE).forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;

            // Bild im Shop-Element setzen (falls ein <img> Tag existiert)
            const imgElement = element.querySelector('img');
            if (imgElement && HELI_DATABASE[id].image) {
                imgElement.src = HELI_DATABASE[id].image;
            }

            const statusTextElement = element.querySelector('.heli-item-price-status');
            element.classList.remove('owned', 'locked', 'active-heli');

            if (id === activeHeliId) {
                element.classList.add('owned', 'active-heli');
                if (statusTextElement) statusTextElement.innerText = 'ACTIVE';
            } else if (ownedHelis.includes(id)) {
                element.classList.add('owned');
                if (statusTextElement) statusTextElement.innerText = 'OWNED';
            } else {
                element.classList.add('locked');
                if (statusTextElement) statusTextElement.innerText = `${HELI_DATABASE[id].cost} COINS`;
            }
        });
        if (coinDisplay) coinDisplay.innerText = String(savedCoins).padStart(4, '0');
    }

    Object.keys(HELI_DATABASE).forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        element.addEventListener('click', () => {
            if (toggleShopBtn && toggleShopBtn.disabled) return;

            playUiClickSound();

            let ownedHelis = JSON.parse(localStorage.getItem('heli_owned_list')) || ['shop-heli-1'];
            let currentCoins = parseInt(localStorage.getItem('heli_total_coins')) || 0;
            const heliData = HELI_DATABASE[id];
            let hasChanged = false;

            if (ownedHelis.includes(id)) {
                localStorage.setItem('heli_active_id', id);
                hasChanged = true;
            } else if (currentCoins >= heliData.cost) {
                currentCoins -= heliData.cost;
                localStorage.setItem('heli_total_coins', currentCoins);
                ownedHelis.push(id);
                localStorage.setItem('heli_owned_list', JSON.stringify(ownedHelis));
                localStorage.setItem('heli_active_id', id);
                hasChanged = true;
            }

            updateShopUI();

            // Wenn ein neuer Hubschrauber ausgewählt/gekauft wurde, direkt im Spiel aktualisieren!
            if (hasChanged) {
                triggerGameReset();
            }
        });
    });

    function triggerGameReset() {
        if (window.game && window.game.scene) {
            const gameScene = window.game.scene.getScene('GameScene');
            if (gameScene && typeof gameScene.resetGameManual === 'function') {
                gameScene.resetGameManual();
            }
        }
    }

    if (toggleShopBtn && statsView && shopView) {
        toggleShopBtn.addEventListener("click", () => {
            if (toggleShopBtn.disabled) return;

            playUiClickSound();
            
            const isShopHidden = shopView.classList.contains("hidden");
            if (isShopHidden) {
                statsView.classList.add("hidden");
                shopView.classList.remove("hidden");
                toggleShopBtn.textContent = "BACK";
                updateShopUI();
            } else {
                shopView.classList.add("hidden");
                statsView.classList.add("hidden");
                statsView.classList.remove("hidden");
                toggleShopBtn.textContent = "SHOP";
            }
        });
    }

    window.disableShopMenu = function() {
        if (toggleShopBtn) {
            shopView?.classList.add("hidden");
            statsView?.classList.remove("hidden");
            toggleShopBtn.textContent = "IN FLIGHT";
            toggleShopBtn.disabled = true;
            toggleShopBtn.style.opacity = "0.5";
        }
    };

    window.enableShopMenu = function() {
        if (toggleShopBtn) {
            toggleShopBtn.textContent = "SHOP";
            toggleShopBtn.disabled = false;
            toggleShopBtn.style.opacity = "1";
        }
        updateShopUI();
    };

    updateShopUI();
});