// ============================================================
// PAGE STATS
// ============================================================

import { getAvgScore, getMonthScore, getBestStreak, getTotalWins } from '../core/scores.js';
import { getRank } from '../core/ranks.js';
import { checkAndUnlockBadges, renderBadges } from '../core/badges.js';
import { renderWeeklyGrid, renderCharts } from '../ui/charts.js';

// Met à jour tous les éléments de la page "Stats"
export function updateStats() {
    const avgScore = getAvgScore();
    const rank = getRank(avgScore);

    document.getElementById('rankName').textContent = rank.name;
    document.getElementById('rankName').style.color = rank.color;
    document.getElementById('rankProgress').style.width = avgScore + '%';
    document.getElementById('monthScore').textContent = getMonthScore() + '%';
    document.getElementById('bestStreak').textContent = getBestStreak();
    document.getElementById('totalWins').textContent = getTotalWins();
    document.getElementById('avgScore').textContent = avgScore + '%';

    renderWeeklyGrid();
    renderCharts();

    checkAndUnlockBadges();
    renderBadges();
}
