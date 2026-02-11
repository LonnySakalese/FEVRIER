// ============================================================
// STREAK DISPLAY - Widget visuel de streak avec flamme animée
// ============================================================

import { getStreak, getBestStreak } from '../core/scores.js';

/**
 * Render le widget streak visuel dans le conteneur spécifié
 * @param {string} containerId - ID du conteneur HTML
 */
export function renderStreakDisplay(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const streak = getStreak();
    const bestStreak = getBestStreak();

    // Déterminer le tier visuel
    let tierClass = '';
    let flameEmoji = '🔥';
    let tierLabel = '';
    if (streak === 0) {
        tierClass = 'streak-tier-zero';
    } else if (streak >= 30) {
        tierClass = 'streak-tier-legendary';
        tierLabel = '💎 LÉGENDAIRE';
    } else if (streak >= 7) {
        tierClass = 'streak-tier-gold';
        tierLabel = '⭐ EN FEU';
    } else {
        tierClass = 'streak-tier-normal';
    }

    // Taille de la flamme proportionnelle au streak (min 2.5rem, max 5rem)
    const flameSize = Math.min(5, 2.5 + (streak * 0.15));

    // Générer les particules CSS pour les tiers élevés
    let particlesHTML = '';
    if (streak >= 7) {
        const particleCount = streak >= 30 ? 8 : 5;
        for (let i = 0; i < particleCount; i++) {
            const delay = (i * 0.3).toFixed(1);
            const left = 20 + Math.random() * 60;
            particlesHTML += `<span class="streak-particle" style="left:${left}%;animation-delay:${delay}s"></span>`;
        }
    }

    container.innerHTML = `
        <div class="streak-widget ${tierClass}">
            <div class="streak-flame-container">
                ${particlesHTML}
                <div class="streak-flame" style="font-size:${flameSize}rem">
                    ${flameEmoji}
                </div>
                ${streak >= 30 ? '<div class="streak-halo"></div>' : ''}
            </div>
            <div class="streak-count">${streak}</div>
            <div class="streak-label">
                ${streak === 0 ? 'Commence ta série !' : 'jours consécutifs'}
            </div>
            ${tierLabel ? `<div class="streak-tier-label">${tierLabel}</div>` : ''}
            ${bestStreak > 0 ? `<div class="streak-best">🏆 Record : ${bestStreak} jours</div>` : ''}
        </div>
    `;
}
