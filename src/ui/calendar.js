// ============================================================
// CALENDRIER VISUEL
// ============================================================

import { habits } from '../services/state.js';
import { getData, getDateKey } from '../services/storage.js';

let currentCalendarMonth = new Date();

export function openCalendarModal() {
    currentCalendarMonth = new Date();
    renderCalendarGrid();
    updateCalendarNavButtons();
    document.getElementById('calendarModal').classList.add('active');
}

export function closeCalendarModal() {
    document.getElementById('calendarModal').classList.remove('active');
}

export function changeCalendarMonth(delta) {
    const now = new Date();
    const newMonth = new Date(currentCalendarMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);

    if (delta > 0) {
        if (newMonth.getFullYear() > now.getFullYear() ||
            (newMonth.getFullYear() === now.getFullYear() && newMonth.getMonth() > now.getMonth())) {
            return;
        }
    }

    currentCalendarMonth = newMonth;
    renderCalendarGrid();
    updateCalendarNavButtons();
}

function updateCalendarNavButtons() {
    const now = new Date();
    const nextBtn = document.querySelector('.calendar-header .calendar-nav-btn:last-child');

    if (nextBtn) {
        const isCurrentMonth = currentCalendarMonth.getFullYear() === now.getFullYear() &&
            currentCalendarMonth.getMonth() === now.getMonth();
        nextBtn.disabled = isCurrentMonth;
        nextBtn.style.opacity = isCurrentMonth ? '0.3' : '1';
        nextBtn.style.cursor = isCurrentMonth ? 'not-allowed' : 'pointer';
    }
}

export function renderCalendarGrid() {
    const container = document.getElementById('calendarGridContainer');
    const summaryContainer = document.getElementById('calendarSummary');
    const titleEl = document.getElementById('calendarTitle');

    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    const monthNames = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
        'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'];
    titleEl.textContent = `${monthNames[month]} ${year}`;

    const data = getData();

    const habitsToShow = (typeof habits !== 'undefined' && habits.length > 0) ? habits : [];

    let calendarData = data;

    if (habitsToShow.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--accent-dark); padding: 20px;">Aucune habitude créée</p>';
        summaryContainer.innerHTML = '';
        return;
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalSuccess = 0;
    let totalFail = 0;
    let totalPossible = 0;

    let html = '';

    habitsToShow.forEach((habit, habitIndex) => {
        let habitSuccess = 0;
        let habitFail = 0;
        let habitTotal = 0;

        let daysHtml = '';

        const dayHeaders = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
        dayHeaders.forEach(d => {
            daysHtml += `<div class="calendar-day-header">${d}</div>`;
        });

        for (let i = 0; i < startDayOfWeek; i++) {
            daysHtml += '<div class="calendar-day empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            const dateKey = getDateKey(date);

            const dayData = calendarData.days && calendarData.days[dateKey];
            const hasTrackedData = !!dayData; // User actually tracked this day
            const isCompleted = dayData && dayData[habit.id] === true;
            const isPast = date < today;
            const isTodayDate = date.getTime() === today.getTime();
            const isFuture = date > today;

            let dayClass = 'calendar-day';
            const animDelay = (day * 0.02) + (habitIndex * 0.1);

            if (isFuture) {
                dayClass += ' future';
            } else if (isCompleted) {
                dayClass += ' success';
                habitSuccess++;
                totalSuccess++;
            } else if (hasTrackedData) {
                // Only mark as fail if user actually tracked that day
                dayClass += ' fail';
                habitFail++;
                totalFail++;
            } else if (isPast) {
                // No data for this day — not tracked, show as neutral/empty
                dayClass += ' no-data';
            }

            if (isTodayDate) {
                dayClass += ' today';
            }

            // Only count in totals if user tracked or it's today
            if (!isFuture && (hasTrackedData || isTodayDate)) {
                habitTotal++;
                totalPossible++;
            }

            daysHtml += `<div class="${dayClass}" style="animation-delay: ${animDelay}s">${day}</div>`;
        }

        const percent = habitTotal > 0 ? Math.round((habitSuccess / habitTotal) * 100) : 0;
        let percentClass = 'bad';
        if (percent >= 80) percentClass = 'good';
        else if (percent >= 50) percentClass = 'medium';

        html += `
            <div class="calendar-habit-section">
                <div class="calendar-habit-header">
                    <span class="calendar-habit-icon">${habit.icon}</span>
                    <span class="calendar-habit-name">${habit.name}</span>
                    <span class="calendar-habit-percent ${percentClass}">${percent}%</span>
                </div>
                <div class="calendar-days-grid">
                    ${daysHtml}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    const overallPercent = totalPossible > 0 ? Math.round((totalSuccess / totalPossible) * 100) : 0;

    let motivationMessage = '';
    let motivationClass = '';

    if (overallPercent >= 80) {
        motivationMessage = '🏆 Exceptionnel ! Tu domines ce mois avec une discipline de fer !';
    } else if (overallPercent >= 60) {
        motivationMessage = '💪 Bon travail ! Continue sur cette lancée !';
    } else if (overallPercent >= 40) {
        motivationMessage = '⚡ Tu peux faire mieux. Chaque jour est une nouvelle opportunité !';
        motivationClass = 'warning';
    } else {
        motivationMessage = '🔥 C\'est l\'heure de se battre ! Reprends le contrôle de tes habitudes !';
        motivationClass = 'warning';
    }

    summaryContainer.innerHTML = `
        <div class="summary-title">Résumé du mois</div>
        <div class="summary-stats">
            <div class="summary-stat">
                <span class="summary-stat-value green">${totalSuccess}</span>
                <span class="summary-stat-label">Réussites</span>
            </div>
            <div class="summary-stat">
                <span class="summary-stat-value red">${totalFail}</span>
                <span class="summary-stat-label">Échecs</span>
            </div>
            <div class="summary-stat">
                <span class="summary-stat-value blue">${overallPercent}%</span>
                <span class="summary-stat-label">Global</span>
            </div>
        </div>
        <div class="calendar-motivation ${motivationClass}">${motivationMessage}</div>
    `;
}
