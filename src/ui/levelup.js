// ============================================================
// LEVEL UP ANIMATION — ÉPIQUE RPG-STYLE
// ============================================================

let levelUpTimeout = null;
let animationFrameId = null;

// ---- Web Audio: Mélodie ascendante épique ----
function playLevelUpSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4, E4, G4, C5, E5
        const durations = [0.15, 0.15, 0.15, 0.2, 0.4];
        let time = ctx.currentTime;

        notes.forEach((freq, i) => {
            // Oscillateur principal
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + durations[i] + 0.05);

            // Harmonique (octave au-dessus, plus doux)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2, time);
            gain2.gain.setValueAtTime(0, time);
            gain2.gain.linearRampToValueAtTime(0.06, time + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(time);
            osc2.stop(time + durations[i] + 0.05);

            time += durations[i];
        });

        // Accord final soutenu (C5 + E5 + G5)
        const chordFreqs = [523.25, 659.25, 783.99];
        chordFreqs.forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.08, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(time);
            osc.stop(time + 1.5);
        });
    } catch (e) {
        // Web Audio non supporté, pas grave
    }
}

// ---- Canvas 2D: Particules dorées / étincelles ----
function startParticles(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const PARTICLE_COUNT = 80;
    const colors = ['#FFD700', '#FFA500', '#FF8C00', '#FFEC8B', '#FFFACD', '#FFE4B5', '#FFF8DC'];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 2 + Math.random() * 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            decay: 0.008 + Math.random() * 0.012,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10,
            type: Math.random() > 0.6 ? 'spark' : 'dot', // étincelles vs points
            trail: []
        });
    }

    // Deuxième vague après 500ms
    setTimeout(() => {
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 4;
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 100,
                y: canvas.height / 2 + (Math.random() - 0.5) * 50,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: 1 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: 0.01 + Math.random() * 0.015,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 8,
                type: 'spark',
                trail: []
            });
        }
    }, 500);

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05; // gravité légère
            p.vx *= 0.99;
            p.alpha -= p.decay;
            p.rotation += p.rotSpeed;

            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);

            if (p.type === 'spark') {
                // Étincelle: ligne brillante
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size * 0.5;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(-p.size, 0);
                ctx.lineTo(p.size, 0);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -p.size * 0.6);
                ctx.lineTo(0, p.size * 0.6);
                ctx.stroke();
            } else {
                // Point brillant
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        if (particles.length > 0) {
            animationFrameId = requestAnimationFrame(animate);
        }
    }

    animate();
}

// ---- Compteur animé (ancien → nouveau niveau) ----
function animateCounter(element, from, to, duration = 1200) {
    const start = performance.now();
    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Easing out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(from + (to - from) * eased);
        element.textContent = current;
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// ---- Barre XP animée ----
function animateXPBar(barEl, fromPercent, toPercent, duration = 1500) {
    barEl.style.width = fromPercent + '%';
    // Force reflow
    barEl.offsetHeight;
    barEl.style.transition = `width ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    requestAnimationFrame(() => {
        barEl.style.width = toPercent + '%';
    });
}

// ============================================================
// SHOW LEVEL UP — Point d'entrée principal
// ============================================================

export function showLevelUp(oldLevel, newLevel) {
    const overlay = document.getElementById('levelUpOverlay');
    const canvas = document.getElementById('levelUpCanvas');
    const levelNumber = document.getElementById('levelUpNumber');
    const xpBarFill = document.getElementById('levelUpXPBarFill');

    if (!overlay) return;

    // Set le numéro de niveau
    if (levelNumber) {
        levelNumber.textContent = oldLevel;
    }

    // Reset
    overlay.classList.remove('closing');
    overlay.classList.add('active');

    // Son épique
    playLevelUpSound();

    // Vibration pattern
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
    }

    // Particules dorées (Canvas 2D)
    if (canvas) {
        setTimeout(() => startParticles(canvas), 200);
    }

    // Compteur animé après un court délai
    if (levelNumber) {
        setTimeout(() => {
            animateCounter(levelNumber, oldLevel, newLevel, 1200);
        }, 600);
    }

    // Barre XP : se remplit de 0 à 100% (symbolise le level up)
    if (xpBarFill) {
        animateXPBar(xpBarFill, 0, 100, 1800);
    }

    // Auto-dismiss après 4s
    if (levelUpTimeout) clearTimeout(levelUpTimeout);
    levelUpTimeout = setTimeout(() => {
        closeLevelUp();
    }, 4000);

    // Tap pour fermer
    overlay.onclick = (e) => {
        if (e.target === overlay || overlay.contains(e.target)) {
            closeLevelUp();
        }
    };
}

function closeLevelUp() {
    const overlay = document.getElementById('levelUpOverlay');
    if (!overlay || !overlay.classList.contains('active')) return;

    overlay.classList.add('closing');

    setTimeout(() => {
        overlay.classList.remove('active');
        overlay.classList.remove('closing');
    }, 500);

    if (levelUpTimeout) {
        clearTimeout(levelUpTimeout);
        levelUpTimeout = null;
    }

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Clear canvas
    const canvas = document.getElementById('levelUpCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}
