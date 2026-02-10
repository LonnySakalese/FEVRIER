// ============================================================
// PAGE TODAY - HABITUDES DU JOUR
// ============================================================

import { habits, getCurrentDate, setCurrentDate } from '../services/state.js';
import { getData, saveData, getDayData, getDateKey } from '../services/storage.js';
import { getDayScore, getStreak, getPerfectDays, getHabitStreak, getHabitMonthProgress, formatDate, isToday, canEditDate, isDayValidated } from '../core/scores.js';
import { isHabitScheduledForDate, getHabitDisplayName, openManageHabitsModal, getActiveFilter, HABIT_CATEGORIES } from '../core/habits.js';
import { playSuccessSound, playUndoSound } from '../ui/sounds.js';
import { triggerConfetti } from '../ui/confetti.js';
import { showPopup } from '../ui/toast.js';
import { checkAndUnlockBadges } from '../core/badges.js';

// Met à jour le statut (coché/décoché) d'une habitude pour aujourd'hui
function setHabitStatus(habitId, checked) {
    const currentDate = getCurrentDate();
    if (!canEditDate(currentDate)) {
        return;
    }
    const data = getData();
    const key = getDateKey(currentDate);
    if (!data.days[key]) data.days[key] = {};
    data.days[key][habitId] = checked;
    saveData(data);
    updateUI();
}

// Change la date affichée (jour précédent/suivant)
export function changeDate(delta) {
    const currentDate = getCurrentDate();
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (newDate > today) {
        return;
    }
    setCurrentDate(newDate);
    updateUI();
}

// Génère et affiche la liste des habitudes pour la date actuelle
export function renderHabits() {
    const container = document.getElementById('habitsList');
    const currentDate = getCurrentDate();
    const dayData = getDayData(currentDate);
    const locked = !canEditDate(currentDate);

    if (habits.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--accent-dim);">
                <div style="font-size: 3rem; margin-bottom: 15px;">🎯</div>
                <div style="font-size: 1.1rem; color: var(--accent); margin-bottom: 10px; font-weight: bold;">
                    AUCUNE HABITUDE
                </div>
                <div style="font-size: 0.85rem; margin-bottom: 20px; line-height: 1.5;">
                    Crée tes propres habitudes pour commencer !
                </div>
                <button class="reset-btn edit-habits-btn" onclick="openManageHabitsModal()" style="max-width: 250px; margin: 0 auto;">
                    ➕ CRÉER MA PREMIÈRE HABITUDE
                </button>
            </div>
        `;
        return;
    }

    const scheduledHabits = habits.filter(habit => isHabitScheduledForDate(habit, currentDate));

    // Render category filter buttons dynamically
    renderCategoryFilters(scheduledHabits);

    // Apply category filter
    const filter = getActiveFilter();
    const filteredHabits = filter === 'all'
        ? scheduledHabits
        : scheduledHabits.filter(h => (h.category || 'autre') === filter);

    if (scheduledHabits.length === 0) {
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const dayName = dayNames[currentDate.getDay()];
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--accent-dim);">
                <div style="font-size: 3rem; margin-bottom: 15px;">😌</div>
                <div style="font-size: 1.1rem; color: var(--accent); margin-bottom: 10px; font-weight: bold;">
                    JOUR DE REPOS
                </div>
                <div style="font-size: 0.85rem; margin-bottom: 20px; line-height: 1.5;">
                    Aucune habitude planifiée pour ${dayName}.
                </div>
            </div>
        `;
        return;
    }

    if (filteredHabits.length === 0 && scheduledHabits.length > 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px 20px; color: var(--accent-dim);">
                <div style="font-size: 2rem; margin-bottom: 10px;">🔍</div>
                <div style="font-size: 0.9rem;">Aucune habitude dans cette catégorie</div>
            </div>
        `;
        return;
    }

    const isPastDay = !isToday(currentDate);

    container.innerHTML = filteredHabits.map(habit => {
        const checked = dayData[habit.id] || false;
        const streak = getHabitStreak(habit.id);
        const monthData = getHabitMonthProgress(habit.id);
        const displayName = getHabitDisplayName(habit);
        const description = habit.description || '';
        const escapedId = habit.id.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const onclickAttr = locked ? '' : `onclick="toggleHabit('${escapedId}')"`;

        const isFailed = isPastDay && !checked;
        const streakText = locked ? (isFailed ? '❌ Non fait' : '✅ Fait') : `🔥 Série: ${streak} jours`;

        let itemClasses = 'habit-item';
        let checkboxClasses = 'habit-checkbox';

        if (locked) {
            itemClasses += ' locked';
            checkboxClasses += ' locked';
        }
        if (checked) {
            itemClasses += ' completed';
            checkboxClasses += ' checked';
        } else if (isFailed) {
            itemClasses += ' failed';
            checkboxClasses += ' failed';
        }

        const descriptionHtml = description
            ? `<div class="habit-description">${description}</div>`
            : '';

        return `
            <div class="${itemClasses}" ${onclickAttr}>
                <div class="${checkboxClasses}"></div>
                <div class="habit-info">
                    <div class="habit-name">${habit.icon} ${displayName}</div>
                    ${descriptionHtml}
                    <div class="habit-streak">${streakText}</div>
                </div>
                <div class="habit-progress">
                    <div class="percent">${monthData}%</div>
                </div>
            </div>
        `;
    }).join('');
}

// Gère le clic sur une habitude pour la cocher/décocher
export function toggleHabit(habitId) {
    const currentDate = getCurrentDate();
    const dayData = getDayData(currentDate);
    const newStatus = !dayData[habitId];
    setHabitStatus(habitId, newStatus);

    if (newStatus) {
        playSuccessSound();
    } else {
        playUndoSound();
    }

    if (navigator.vibrate) {
        navigator.vibrate(newStatus ? [30, 30, 30] : 20);
    }

    if (newStatus) {
        const completed = habits.filter(h => getDayData(currentDate)[h.id]).length;
        if (completed === habits.length) {
            triggerConfetti();
        }
    }
}

// Met à jour les KPIs (score, streak, etc.) sur la page "Aujourd'hui"
export function updateKPIs() {
    const currentDate = getCurrentDate();
    const dayData = getDayData(currentDate);
    const completed = habits.filter(h => dayData[h.id]).length;
    const score = getDayScore(currentDate);
    const locked = !canEditDate(currentDate);

    document.getElementById('dailyScore').textContent = score + '%';
    document.getElementById('currentStreak').textContent = getStreak();
    document.getElementById('perfectDays').textContent = getPerfectDays();
    document.getElementById('completedCount').textContent = locked ? '🔒 VERROUILLÉ' : `${completed}/${habits.length}`;
    document.getElementById('currentDate').textContent = formatDate(currentDate) + (locked ? ' 🔒' : '');

    const data = getData();
    const currentStreak = getStreak();
    if (currentStreak > (data.stats?.bestStreak || 0)) {
        data.stats = data.stats || {};
        data.stats.bestStreak = currentStreak;
        saveData(data);
    }
}

// --- VALIDATION DE JOURNÉE ---

export function showValidateDayModal() {
    const modal = document.getElementById('validateDayModal');
    if (modal) {
        modal.classList.add('active');
    }
}

export function closeValidateDayModal() {
    const modal = document.getElementById('validateDayModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

export function confirmValidateDay() {
    const data = getData();
    const today = getDateKey(new Date());

    if (!data.validatedDays) {
        data.validatedDays = [];
    }

    if (data.validatedDays.includes(today)) {
        closeValidateDayModal();
        showPopup('✅ Cette journée est déjà validée !', 'info');
        return;
    }

    data.validatedDays.push(today);
    saveData(data);

    closeValidateDayModal();

    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
    showPopup('✅ Journée validée !', 'success');

    const dayDataToday = getDayData(new Date());
    const completedCount = habits.filter(h => dayDataToday[h.id]).length;
    if (completedCount === habits.length && habits.length > 0) {
        triggerConfetti();
    }

    updateValidateButton();
    renderHabits();

    checkAndUnlockBadges();
}

export function updateValidateButton() {
    const btn = document.getElementById('validateDayBtn');
    if (!btn) return;

    if (!habits || habits.length === 0) {
        btn.style.display = 'none';
        return;
    }

    const today = getDateKey(new Date());
    const currentDate = getCurrentDate();
    const currentDateKey = getDateKey(currentDate);

    if (currentDateKey !== today) {
        btn.style.display = 'none';
        return;
    }

    const data = getData();
    if (!data.validatedDays) data.validatedDays = [];

    if (data.validatedDays.includes(today)) {
        btn.style.display = 'none';
    } else {
        btn.style.display = 'block';
    }
}

// Render category filter buttons based on which categories the user's habits have
function renderCategoryFilters(scheduledHabits) {
    const filtersContainer = document.getElementById('categoryFilters');
    if (!filtersContainer) return;

    // Collect unique categories from scheduled habits
    const usedCategories = new Set();
    scheduledHabits.forEach(h => usedCategories.add(h.category || 'autre'));

    // Only show filters if there are 2+ categories
    if (usedCategories.size < 2) {
        filtersContainer.style.display = 'none';
        return;
    }

    filtersContainer.style.display = 'flex';
    const filter = getActiveFilter();

    let html = `<button class="category-filter ${filter === 'all' ? 'active' : ''}" data-category="all" onclick="filterByCategory('all')">Tout</button>`;
    
    HABIT_CATEGORIES.forEach(cat => {
        if (usedCategories.has(cat.id)) {
            html += `<button class="category-filter ${filter === cat.id ? 'active' : ''}" data-category="${cat.id}" onclick="filterByCategory('${cat.id}')">${cat.icon} ${cat.label}</button>`;
        }
    });

    filtersContainer.innerHTML = html;
}

// Fonction principale de mise à jour de l'UI
export function updateUI() {
    renderHabits();
    updateKPIs();
    updateValidateButton();
}
