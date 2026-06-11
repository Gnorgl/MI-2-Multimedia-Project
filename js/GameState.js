// Globaler Spielstand fuer das gesamte Projekt
const GameState = {
    // Waehrung
    muenzen: 0,
    
    // Aktuell ausgewaehlter Skin (Paint-Job)
    aktuellerSkin: 'Standard',
    freigeschalteteSkins: ['Standard'],

    // UPGRADES FUER DIE RAKETE (Phase 1: Horizontaler Flug)
    rakete: {
        // Bestimmt die Anzahl der Stufen (z.B. Stufe 1 bis 3)
        tankStufe: 1,
        // Erhoeht den Geschwindigkeits-Boost bei perfektem Abwurf
        triebwerkStufe: 1,
        // Verringert den Luftwiderstand, Rakete gleitet weiter
        aerodynamikStufe: 1
    },

    // UPGRADES FUER DIE KAPSEL (Phase 2: Vertikaler Sinkflug & Landung)
    kapsel: {
        // Mehr Treibstoff fuer das Landetriebwerk
        tankStufe: 1,
        // Staerkerer Gegenschub zum Abfangen
        triebwerkStufe: 1,
        // Macht die Kapsel stabiler gegen Windboeen
        aerodynamikStufe: 1,
        // Erhoeht die maximal erlaubte Aufprallgeschwindigkeit
        robustheitStufe: 1,
        // Verringert die Fallgeschwindigkeit im freien Fall
        fallschirmStufe: 0, // 0 bedeutet: Noch nicht gekauft
        // Automatische Anziehung von Muenzen in der Naehe
        magnetStufe: 0,
        // Ein Schutzschild, der einen harten Aufprall abfedert
        schildStufe: 0
    },

    // Hilfsfunktion, um den Spielstand nach einem Absturz zurueckzusetzen
    // (Muenzen und Upgrades bleiben erhalten!)
    letzteDistanz: 0,
    landungErfolgreich: false
};