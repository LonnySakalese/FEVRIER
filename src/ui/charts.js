// ============================================================
// CHARTS - GRAPHIQUES DE PROGRESSION
// ============================================================

import { habits, getWeeklyChart, setWeeklyChart, getHabitsChart, setHabitsChart } from '../services/state.js';
import { getDayScore, getHabitMonthProgress } from '../core/scores.js';

// Génère et affiche la grille des scores de la semaine
export function renderWeeklyGrid() {
    const container = document.getElementById('weeklyGrid');
    if (!container) return;
    const today = new Date();
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    let html = '';
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const score = getDayScore(date);
        html += `
            <div class="weekly-day ${i === 0 ? 'today' : ''} ${score === 100 ? 'perfect' : ''}">
                <div class="day-name">${dayNames[date.getDay()]}</div>
                <div class="day-score">${score}%</div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// Génère et met à jour les graphiques
export function renderCharts() {
    const weeklyCanvas = document.getElementById('weeklyChart');
    const habitsCanvas = document.getElementById('habitsChart');
    if (!weeklyCanvas || !habitsCanvas) return;

    // Graphique de score hebdomadaire
    const weeklyCtx = weeklyCanvas.getContext('2d');
    const weeklyData = [];
    const weeklyLabels = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        weeklyLabels.push(date.getDate() + '/' + (date.getMonth() + 1));
        weeklyData.push(getDayScore(date));
    }

    // Gradient fill for weekly chart
    const gradient = weeklyCtx.createLinearGradient(0, 0, 0, weeklyCanvas.height);
    gradient.addColorStop(0, 'rgba(46, 204, 113, 0.35)');
    gradient.addColorStop(0.5, 'rgba(46, 204, 113, 0.10)');
    gradient.addColorStop(1, 'rgba(46, 204, 113, 0)');

    let wChart = getWeeklyChart();
    if (wChart) wChart.destroy();
    wChart = new Chart(weeklyCtx, {
        type: 'line',
        data: {
            labels: weeklyLabels,
            datasets: [{
                data: weeklyData,
                borderColor: '#2ECC71',
                borderWidth: 3,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: weeklyData.map(v => v === 100 ? '#FFB84D' : v > 0 ? '#2ECC71' : '#E74C3C'),
                pointBorderColor: weeklyData.map(v => v === 100 ? '#FFB84D' : v > 0 ? '#2ECC71' : '#E74C3C'),
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 100, ticks: { color: '#888', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#AAA', font: { size: 11, weight: '600' } }, grid: { display: false } }
            }
        }
    });
    setWeeklyChart(wChart);

    // Graphique de performance par habitude
    const habitsCtx = habitsCanvas.getContext('2d');
    if (habits.length === 0) {
        let hChart = getHabitsChart();
        if (hChart) hChart.destroy();
        return;
    }
    const habitsData = habits.map(h => getHabitMonthProgress(h.id));

    let hChart = getHabitsChart();
    if (hChart) hChart.destroy();
    hChart = new Chart(habitsCtx, {
        type: 'bar',
        data: {
            labels: habits.map(h => h.icon),
            datasets: [{
                data: habitsData,
                backgroundColor: habitsData.map(v => v >= 80 ? 'rgba(46,204,113,0.8)' : v >= 50 ? 'rgba(243,156,18,0.7)' : 'rgba(231,76,60,0.6)'),
                borderColor: habitsData.map(v => v >= 80 ? '#2ECC71' : v >= 50 ? '#F39C12' : '#E74C3C'),
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 100, ticks: { color: '#888', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#F5F5F0', font: { size: 16 } }, grid: { display: false } }
            }
        }
    });
    setHabitsChart(hChart);
}
