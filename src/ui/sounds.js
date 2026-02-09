// ============================================================
// SYSTÈME DE SON - FEEDBACK AUDIO
// ============================================================

let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Son de VICTOIRE quand on coche une habitude
export function playSuccessSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Créer un son de "ding" satisfaisant
        const oscillator1 = ctx.createOscillator();
        const oscillator2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Fréquences pour un son de victoire (accord majeur)
        oscillator1.frequency.setValueAtTime(880, now); // La5
        oscillator1.frequency.setValueAtTime(1108.73, now + 0.1); // Do#6
        oscillator2.frequency.setValueAtTime(1318.51, now); // Mi6

        oscillator1.type = 'sine';
        oscillator2.type = 'sine';

        // Envelope du volume
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        // Connexions
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Jouer
        oscillator1.start(now);
        oscillator2.start(now);
        oscillator1.stop(now + 0.4);
        oscillator2.stop(now + 0.4);

    } catch (e) {
        console.log('Audio non disponible:', e);
    }
}

// Son d'ÉCHEC quand on décoche (optionnel, plus discret)
export function playUndoSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.linearRampToValueAtTime(200, now + 0.15);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.15);

    } catch (e) {
        console.log('Audio non disponible:', e);
    }
}
