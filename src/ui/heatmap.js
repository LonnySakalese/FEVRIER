// ============================================================
// MINI HEATMAP (style GitHub) - 90 derniers jours
// ============================================================

import { getData, getDateKey } from '../services/storage.js';
import { habits } from '../services/state.js';

function getDayScore(dayData) {
    if (!dayData || typeof dayData !== 'object') return 0;
    const keys = Object.keys(dayData);
    if (keys.length === 0) return 0;
    const completed = keys.filter(k => dayData[k]).length;
    return Math.round((completed / keys.length) * 100);
}

function getScoreColor(score) {
    if (score === 0) return 'var(--charcoal)';
    if (score <= 33) return '#1a3a1a';
    if (score <= 66) return '#2d6a2d';
    if (score <= 99) return '#3d9a3d';
    return 'var(--accent-green)';
}

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function renderHeatmap(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = getData();
    const days = data.days || {};

    // Calculate 90 days back
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 89);

    // Adjust to start on Monday
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    // Build day data
    const cells = [];
    const current = new Date(startDate);

    while (current <= today) {
        const key = getDateKey(current);
        const dayData = days[key];
        const score = dayData ? getDayScore(dayData) : 0;
        const hasData = !!dayData;
        cells.push({
            date: new Date(current),
            key,
            score,
            hasData,
            color: hasData ? getScoreColor(score) : 'var(--charcoal)'
        });
        current.setDate(current.getDate() + 1);
    }

    // Build month labels
    const numWeeks = Math.ceil(cells.length / 7);
    let monthsHTML = '<div class="heatmap-months">';
    let lastMonth = -1;
    for (let w = 0; w < numWeeks; w++) {
        const cellIndex = w * 7;
        if (cellIndex < cells.length) {
            const month = cells[cellIndex].date.getMonth();
            if (month !== lastMonth) {
                monthsHTML += `<span style="min-width: ${15}px;">${MONTH_NAMES[month]}</span>`;
                lastMonth = month;
            } else {
                monthsHTML += `<span style="min-width: ${15}px;"></span>`;
            }
        }
    }
    monthsHTML += '</div>';

    // Build grid
    let gridHTML = '<div class="heatmap-grid" style="position: relative;">';
    for (const cell of cells) {
        const dateStr = cell.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
        const scoreStr = cell.hasData ? `${cell.score}%` : 'Pas de données';
        gridHTML += `<div class="heatmap-cell" 
            style="background: ${cell.color};" 
            data-date="${dateStr}" 
            data-score="${scoreStr}"
            ></div>`;
    }
    gridHTML += '</div>';

    container.innerHTML = monthsHTML + gridHTML;

    // Tooltip handling
    const tooltip = document.createElement('div');
    tooltip.className = 'heatmap-tooltip';
    tooltip.style.display = 'none';
    container.style.position = 'relative';
    container.appendChild(tooltip);

    container.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('heatmap-cell')) {
            const date = e.target.dataset.date;
            const score = e.target.dataset.score;
            tooltip.textContent = `${date} — ${score}`;
            tooltip.style.display = 'block';

            const rect = e.target.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            tooltip.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - containerRect.top - 30) + 'px';
            tooltip.style.transform = 'translateX(-50%)';
        }
    });

    container.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('heatmap-cell')) {
            tooltip.style.display = 'none';
        }
    });

    // Touch support
    container.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('heatmap-cell')) {
            const date = e.target.dataset.date;
            const score = e.target.dataset.score;
            tooltip.textContent = `${date} — ${score}`;
            tooltip.style.display = 'block';

            const rect = e.target.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            tooltip.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
            tooltip.style.top = (rect.top - containerRect.top - 30) + 'px';
            tooltip.style.transform = 'translateX(-50%)';

            setTimeout(() => { tooltip.style.display = 'none'; }, 2000);
        }
    });
}
