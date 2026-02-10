// ============================================================
// SYSTÈME DE SON - FEEDBACK AUDIO (Web Audio API)
// ============================================================

let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (required after user interaction on some browsers)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

/**
 * playCheckSound - petit "tick" satisfaisant (court, aigu)
 */
export function playCheckSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.06);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.12);
    } catch (e) {
        console.log('Audio non disponible:', e);
    }
}

/**
 * playUncheckSound - petit "pop" descendant
 */
export function playUncheckSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.15);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    } catch (e) {
        console.log('Audio non disponible:', e);
    }
}

/**
 * playSuccessSound - mélodie montante de 3 notes (quand 100%)
 */
export function playSuccessSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const notes = [523.25, 659.25, 783.99]; // Do5, Mi5, Sol5
        const noteLength = 0.1;
        const gap = 0.08;

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            const startTime = now + i * (noteLength + gap);

            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.25, startTime + 0.015);
            gain.gain.setValueAtTime(0.25, startTime + noteLength * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteLength + 0.05);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + noteLength + 0.05);
        });
    } catch (e) {
        console.log('Audio non disponible:', e);
    }
}

/**
 * playValidateSound - son de confirmation profond
 */
export function playValidateSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        // Low tone
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(220, now);
        osc1.frequency.setValueAtTime(330, now + 0.1);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gain1.gain.setValueAtTime(0.2, now + 0.15);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Harmonic
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(440, now + 0.05);
        gain2.gain.setValueAtTime(0, now + 0.05);
        gain2.gain.linearRampToValueAtTime(0.12, now + 0.07);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.05);
        osc2.stop(now + 0.28);
    } catch (e) {
        console.log('Audio non disponible:', e);
    }
}

// Legacy aliases for backward compatibility
export { playSuccessSound as playSuccessSound_legacy };
export { playUncheckSound as playUndoSound };
