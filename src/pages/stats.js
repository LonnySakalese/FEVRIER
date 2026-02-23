// ============================================================
// PAGE STATS
// ============================================================

import { getAvgScore, getMonthScore, getBestStreak, getTotalWins } from '../core/scores.js';
import { getRank } from '../core/ranks.js';
import { checkAndUnlockBadges, renderBadges, toggleBadgesVisibility } from '../core/badges.js';
import { renderWeeklyGrid, renderCharts } from '../ui/charts.js';

// Met à jour tous les éléments de la page "Stats"
export { toggleBadgesVisibility };

export function updateStats() {
    try {
        const avgScore = getAvgScore();
        const rank = getRank(avgScore);

        const rankNameEl = document.getElementById('rankName');
        const rankProgressEl = document.getElementById('rankProgress');
        const monthScoreEl = document.getElementById('monthScore');
        const bestStreakEl = document.getElementById('bestStreak');
        const totalWinsEl = document.getElementById('totalWins');
        const avgScoreEl = document.getElementById('avgScore');

        if (rankNameEl) { rankNameEl.textContent = rank.name; rankNameEl.style.color = rank.color; rankNameEl.style.textShadow = `0 0 15px ${rank.color}80, 0 0 30px ${rank.color}40`; }
        if (rankProgressEl) rankProgressEl.style.width = avgScore + '%';
        if (monthScoreEl) monthScoreEl.textContent = getMonthScore() + '%';
        if (bestStreakEl) bestStreakEl.textContent = getBestStreak();
        if (totalWinsEl) totalWinsEl.textContent = getTotalWins();
        if (avgScoreEl) avgScoreEl.textContent = avgScore + '%';

        renderWeeklyGrid();
        renderCharts();

        checkAndUnlockBadges();
        renderBadges();
    } catch (err) {
        console.error('Erreur updateStats:', err);
    }
}
