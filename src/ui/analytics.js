// ============================================================
// ANALYTICS AVANCÉS
// ============================================================

import { getData, getDateKey } from '../services/storage.js';
import { habits } from '../services/state.js';
import { isHabitScheduledForDate, getHabitDisplayName } from '../core/habits.js';

// Calcule le score d'un jour donné (reproduit la logique de scores.js pour éviter imports circulaires)
function calcDayScore(date, data) {
    if (habits.length === 0) return null;
    const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, date));
    if (scheduledHabits.length === 0) return null;
    const key = getDateKey(date);
    const dayData = data.days[key] || {};
    const completed = scheduledHabits.filter(h => dayData[h.id]).length;
    return Math.round((completed / scheduledHabits.length) * 100);
}

// Fonction principale de rendu
export function renderAnalytics(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = getData();
    if (!data.days || Object.keys(data.days).length === 0 || habits.length === 0) {
        container.innerHTML = `
            <div class="analytics-card" style="text-align: center; padding: 30px;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                <div style="color: var(--accent-dim); font-size: 0.85rem;">
                    Pas encore assez de données.<br>Continue à tracker tes habitudes !
                </div>
            </div>
        `;
        return;
    }

    let html = '';

    // A. Meilleur jour de la semaine
    html += renderBestDayOfWeek(data);

    // B. Tendance
    html += renderTrend(data);

    // C. Habitude la plus / moins régulière
    html += renderHabitRegularity(data);

    // D. Statistiques fun
    html += renderFunStats(data);

    container.innerHTML = html;

    // Dessiner les canvas après injection dans le DOM
    drawBestDayChart(data);
    drawTrendChart(data);
}

// ============================================================
// A. MEILLEUR JOUR DE LA SEMAINE
// ============================================================

function renderBestDayOfWeek(data) {
    return `
        <div class="analytics-card">
            <div class="analytics-card-title">📅 Meilleur jour de la semaine</div>
            <canvas id="bestDayCanvas" width="300" height="160" style="width:100%; height:auto;"></canvas>
        </div>
    `;
}

function drawBestDayChart(data) {
    const canvas = document.getElementById('bestDayCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 160 * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.height = '160px';

    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const dayScores = [0, 0, 0, 0, 0, 0, 0]; // index 0=Lun (JS day 1), ... 6=Dim (JS day 0)
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    const now = new Date();
    for (let i = 0; i < 90; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const score = calcDayScore(d, data);
        if (score !== null) {
            const jsDay = d.getDay(); // 0=dim, 1=lun, ...
            const idx = jsDay === 0 ? 6 : jsDay - 1; // 0=lun, 6=dim
            dayScores[idx] += score;
            dayCounts[idx]++;
        }
    }

    const avgScores = dayScores.map((s, i) => dayCounts[i] > 0 ? Math.round(s / dayCounts[i]) : 0);
    const maxScore = Math.max(...avgScores, 1);
    const bestIdx = avgScores.indexOf(Math.max(...avgScores));

    const w = rect.width;
    const h = 160;
    const barHeight = 12;
    const gap = (h - 10) / 7;
    const labelWidth = 35;
    const valueWidth = 40;
    const barAreaWidth = w - labelWidth - valueWidth - 10;

    // Get theme colors
    const isDark = !document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-theme') === 'dark';
    const dimColor = isDark ? '#A3A39E' : '#6C757D';
    const accentColor = isDark ? '#F5F5F0' : '#212529';
    const greenColor = isDark ? '#19E639' : '#198754';
    const barBg = isDark ? '#1E1E1E' : '#E9ECEF';

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < 7; i++) {
        const y = 5 + i * gap;
        const barW = maxScore > 0 ? (avgScores[i] / maxScore) * barAreaWidth : 0;
        const isBest = i === bestIdx && avgScores[i] > 0;

        // Label
        ctx.fillStyle = isBest ? greenColor : dimColor;
        ctx.font = `${isBest ? 'bold ' : ''}11px -apple-system, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(dayNames[i], labelWidth, y + barHeight / 2);

        // Bar background
        ctx.fillStyle = barBg;
        ctx.beginPath();
        roundRect(ctx, labelWidth + 8, y, barAreaWidth, barHeight, 4);
        ctx.fill();

        // Bar fill
        if (barW > 0) {
            ctx.fillStyle = isBest ? greenColor : (isDark ? '#3A3A3A' : '#CED4DA');
            ctx.beginPath();
            roundRect(ctx, labelWidth + 8, y, barW, barHeight, 4);
            ctx.fill();
        }

        // Value
        ctx.fillStyle = isBest ? greenColor : accentColor;
        ctx.font = `${isBest ? 'bold ' : ''}11px -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(`${avgScores[i]}%`, labelWidth + barAreaWidth + 14, y + barHeight / 2);
    }
}

// ============================================================
// B. TENDANCE
// ============================================================

function renderTrend(data) {
    const weeks = getWeeklyScores(data, 12);
    const recent4 = weeks.slice(-4);
    const prev4 = weeks.slice(-8, -4);

    const avgRecent = recent4.length > 0 ? recent4.reduce((a, b) => a + b, 0) / recent4.length : 0;
    const avgPrev = prev4.length > 0 ? prev4.reduce((a, b) => a + b, 0) / prev4.length : 0;

    let trendIcon, trendClass, trendText;
    const diff = avgRecent - avgPrev;

    if (diff > 5) {
        trendIcon = '↗️';
        trendClass = 'analytics-trend-up';
        trendText = `En hausse (+${Math.round(diff)}%)`;
    } else if (diff < -5) {
        trendIcon = '↘️';
        trendClass = 'analytics-trend-down';
        trendText = `En baisse (${Math.round(diff)}%)`;
    } else {
        trendIcon = '→';
        trendClass = 'analytics-trend-stable';
        trendText = 'Stable';
    }

    return `
        <div class="analytics-card">
            <div class="analytics-card-title">📈 Tendance (12 semaines)</div>
            <canvas id="trendCanvas" width="300" height="120" style="width:100%; height:auto;"></canvas>
            <div class="analytics-trend ${trendClass}">
                <span style="font-size: 1.2rem;">${trendIcon}</span>
                <span>${trendText}</span>
            </div>
        </div>
    `;
}

function getWeeklyScores(data, numWeeks) {
    const scores = [];
    const now = new Date();
    // Find the start of the current week (Monday)
    const currentDay = now.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + mondayOffset);
    thisMonday.setHours(0, 0, 0, 0);

    for (let w = numWeeks - 1; w >= 0; w--) {
        const weekStart = new Date(thisMonday);
        weekStart.setDate(thisMonday.getDate() - w * 7);

        let weekTotal = 0;
        let weekDays = 0;

        for (let d = 0; d < 7; d++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + d);
            if (day > now) break;

            const score = calcDayScore(day, data);
            if (score !== null) {
                weekTotal += score;
                weekDays++;
            }
        }

        scores.push(weekDays > 0 ? Math.round(weekTotal / weekDays) : 0);
    }

    return scores;
}

function drawTrendChart(data) {
    const canvas = document.getElementById('trendCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 120 * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.height = '120px';

    const scores = getWeeklyScores(data, 12);
    const w = rect.width;
    const h = 120;
    const padding = { top: 10, bottom: 20, left: 10, right: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const isDark = !document.documentElement.getAttribute('data-theme') || document.documentElement.getAttribute('data-theme') === 'dark';
    const greenColor = isDark ? '#19E639' : '#198754';
    const dimColor = isDark ? '#A3A39E' : '#6C757D';
    const gridColor = isDark ? 'rgba(58,58,58,0.5)' : 'rgba(206,212,218,0.5)';

    ctx.clearRect(0, 0, w, h);

    const maxScore = Math.max(...scores, 1);

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
    }

    if (scores.length < 2) return;

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = greenColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const points = scores.map((s, i) => ({
        x: padding.left + (i / (scores.length - 1)) * chartW,
        y: padding.top + chartH - (s / 100) * chartH
    }));

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Fill area under line
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.lineTo(points[0].x, padding.top + chartH);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, isDark ? 'rgba(25,230,57,0.2)' : 'rgba(25,135,84,0.15)');
    gradient.addColorStop(1, 'rgba(25,230,57,0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw dots
    points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = greenColor;
        ctx.fill();
    });

    // Week labels (first, middle, last)
    ctx.fillStyle = dimColor;
    ctx.font = '9px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('S-12', points[0].x, h - 4);
    ctx.fillText('S-6', points[Math.floor(points.length / 2)].x, h - 4);
    ctx.fillText('Auj.', points[points.length - 1].x, h - 4);
}

// ============================================================
// C. HABITUDE LA PLUS / MOINS RÉGULIÈRE
// ============================================================

function renderHabitRegularity(data) {
    if (habits.length === 0) return '';

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Only count days where the user actually tracked (has data)
    const trackedDays = Object.keys(data.days || {}).sort();
    if (trackedDays.length === 0) return '';

    const habitRates = [];

    for (const habit of habits) {
        let scheduled = 0;
        let completed = 0;

        for (let i = 0; i < 30; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = getDateKey(d);

            // Only count this day if user has tracked data for it
            if (!data.days[key]) continue;

            if (isHabitScheduledForDate(habit, d)) {
                scheduled++;
                const dayData = data.days[key] || {};
                if (dayData[habit.id]) {
                    completed++;
                }
            }
        }

        const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
        habitRates.push({
            name: getHabitDisplayName(habit),
            icon: habit.icon || '🎯',
            rate,
            scheduled
        });
    }

    // Filter habits that were scheduled at least once
    const active = habitRates.filter(h => h.scheduled > 0);
    if (active.length === 0) return '';

    active.sort((a, b) => b.rate - a.rate);
    const best = active[0];
    const worst = active[active.length - 1];

    let html = `
        <div class="analytics-card">
            <div class="analytics-card-title">🎯 Régularité des habitudes (30j)</div>
            <div class="analytics-highlight">
                <span class="analytics-highlight-label">🏆 Plus régulière</span>
                <span class="analytics-highlight-value" style="color: var(--accent-green);">
                    ${best.icon} ${best.name} — ${best.rate}%
                </span>
            </div>`;

    if (active.length > 1 && worst.name !== best.name) {
        html += `
            <div class="analytics-highlight">
                <span class="analytics-highlight-label">⚠️ À améliorer</span>
                <span class="analytics-highlight-value" style="color: #FF6B6B;">
                    ${worst.icon} ${worst.name} — ${worst.rate}%
                </span>
            </div>`;
    }

    html += `</div>`;
    return html;
}

// ============================================================
// D. STATISTIQUES FUN
// ============================================================

function renderFunStats(data) {
    // Total d'habitudes cochées (all time)
    let totalChecked = 0;
    for (const key in data.days) {
        const dayData = data.days[key];
        totalChecked += Object.values(dayData).filter(Boolean).length;
    }

    // Nombre de jours trackés
    const daysTracked = Object.keys(data.days).length;

    // Habitude la plus ancienne
    let oldestDate = null;
    for (const key of Object.keys(data.days).sort()) {
        if (!oldestDate) {
            oldestDate = key;
            break;
        }
    }

    const firstTrackDate = oldestDate || 'N/A';

    return `
        <div class="analytics-card">
            <div class="analytics-card-title">🎲 Statistiques fun</div>
            <div class="analytics-highlight">
                <span class="analytics-highlight-label">✅ Habitudes cochées (total)</span>
                <span class="analytics-highlight-value">${totalChecked}</span>
            </div>
            <div class="analytics-highlight">
                <span class="analytics-highlight-label">📅 Jours trackés</span>
                <span class="analytics-highlight-value">${daysTracked}</span>
            </div>
            <div class="analytics-highlight">
                <span class="analytics-highlight-label">🕐 Premier jour tracké</span>
                <span class="analytics-highlight-value">${firstTrackDate}</span>
            </div>
        </div>
    `;
}

// ============================================================
// HELPER: Rounded rectangle
// ============================================================

function roundRect(ctx, x, y, width, height, radius) {
    if (width < 0) width = 0;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
