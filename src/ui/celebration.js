// ============================================================
// ÉCRAN DE CÉLÉBRATION (nouveau rang / badge)
// ============================================================

import { triggerConfetti } from './confetti.js';

let celebrationTimeout = null;

export function showCelebration({ type = 'generic', title = 'FÉLICITATIONS !', subtitle = '', icon = '🏆', color = '#FFD700' }) {
    const overlay = document.getElementById('celebrationOverlay');
    const iconEl = document.getElementById('celebrationIcon');
    const titleEl = document.getElementById('celebrationTitle');
    const subtitleEl = document.getElementById('celebrationSubtitle');

    if (!overlay || !iconEl || !titleEl || !subtitleEl) return;

    iconEl.textContent = icon;
    iconEl.style.color = color;
    titleEl.textContent = title;
    titleEl.style.color = color;
    subtitleEl.textContent = subtitle;

    overlay.classList.add('active');

    // Confetti
    triggerConfetti();

    // Vibration
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
    }

    // Auto-close after 3s
    if (celebrationTimeout) clearTimeout(celebrationTimeout);
    celebrationTimeout = setTimeout(() => {
        closeCelebration();
    }, 3000);

    // Close on tap
    overlay.onclick = () => {
        closeCelebration();
    };
}

function closeCelebration() {
    const overlay = document.getElementById('celebrationOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    if (celebrationTimeout) {
        clearTimeout(celebrationTimeout);
        celebrationTimeout = null;
    }
}

export function celebrateNewRank(rankName, rankColor) {
    showCelebration({
        type: 'rank',
        title: 'NOUVEAU RANG !',
        subtitle: `Tu es maintenant ${rankName} !`,
        icon: '⚔️',
        color: rankColor || '#FFD700'
    });
}

export function celebrateNewBadge(badgeName, badgeIcon) {
    showCelebration({
        type: 'badge',
        title: 'BADGE DÉBLOQUÉ !',
        subtitle: badgeName,
        icon: badgeIcon || '🏅',
        color: '#FFD700'
    });
}
