// ============================================================
// CHARTS - GRAPHIQUES DE PROGRESSION
// ============================================================

import { habits, getWeeklyChart, setWeeklyChart, getHabitsChart, setHabitsChart } from '../services/state.js';
import { getDayScore, getHabitMonthProgress } from '../core/scores.js';

// Génère et affiche la grille des scores de la semaine
export function renderWeeklyGrid() {
    const container = document.getElementById('weeklyGrid');
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
    // Graphique de score hebdomadaire
    const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
    const weeklyData = [];
    const weeklyLabels = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        weeklyLabels.push(date.getDate() + '/' + (date.getMonth() + 1));
        weeklyData.push(getDayScore(date));
    }

    let wChart = getWeeklyChart();
    if (wChart) wChart.destroy();
    wChart = new Chart(weeklyCtx, {
        type: 'line',
        data: {
            labels: weeklyLabels,
            datasets: [{
                data: weeklyData,
                borderColor: '#F5F5F0',
                backgroundColor: 'rgba(245, 245, 240, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 100, ticks: { color: '#A3A39E' }, grid: { color: '#2D2D2D' } }, x: { ticks: { color: '#A3A39E' }, grid: { color: '#2D2D2D' } } }
        }
    });
    setWeeklyChart(wChart);

    // Graphique de performance par habitude
    const habitsCtx = document.getElementById('habitsChart').getContext('2d');
    const habitsData = habits.map(h => getHabitMonthProgress(h.id));

    let hChart = getHabitsChart();
    if (hChart) hChart.destroy();
    hChart = new Chart(habitsCtx, {
        type: 'bar',
        data: {
            labels: habits.map(h => h.icon),
            datasets: [{
                data: habitsData,
                backgroundColor: habitsData.map(v => v >= 80 ? '#F5F5F0' : v >= 50 ? '#A3A39E' : '#5A5A55'),
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 100, ticks: { color: '#A3A39E' }, grid: { color: '#2D2D2D' } }, x: { ticks: { color: '#F5F5F0', font: { size: 16 } }, grid: { display: false } } }
        }
    });
    setHabitsChart(hChart);
}
