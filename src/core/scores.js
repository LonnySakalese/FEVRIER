// ============================================================
// SCORES & STATISTICS CALCULATIONS
// ============================================================

import { habits } from '../services/state.js';
import { getData, getDayData, getDateKey } from '../services/storage.js';
import { isHabitScheduledForDate } from './habits.js';

// Calcule le score (en %) d'un jour donné
export function getDayScore(date) {
    if (habits.length === 0) return 0;

    const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, date));
    if (scheduledHabits.length === 0) return 100;

    const dayData = getDayData(date);
    const completed = scheduledHabits.filter(h => dayData[h.id]).length;
    return Math.round((completed / scheduledHabits.length) * 100);
}

// Calcule la série (streak) de jours consécutifs avec un score >= 70%
export function getStreak() {
    let streak = 0;
    let date = new Date();
    date.setDate(date.getDate() - 1);

    while (true) {
        const score = getDayScore(date);
        if (score >= 70) {
            streak++;
            date.setDate(date.getDate() - 1);
        } else {
            break;
        }
    }

    if (getDayScore(new Date()) >= 70) {
        streak++;
    }
    return streak;
}

// Compte le nombre total de jours parfaits (100%)
export function getPerfectDays() {
    const data = getData();
    const validatedDays = data.validatedDays || [];
    let count = 0;
    for (const key of validatedDays) {
        if (!data.days[key]) continue;
        const [year, month, day] = key.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, date));
        if (scheduledHabits.length === 0) continue;

        const dayData = data.days[key];
        const completed = scheduledHabits.filter(h => dayData[h.id]).length;
        if (completed === scheduledHabits.length) count++;
    }
    return count;
}

// Calcule la série pour une habitude spécifique
export function getHabitStreak(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    let streak = 0;
    let date = new Date();
    date.setDate(date.getDate() - 1);
    let maxDaysBack = 365;

    while (maxDaysBack > 0) {
        if (isHabitScheduledForDate(habit, date)) {
            const dayData = getDayData(date);
            if (dayData[habitId]) {
                streak++;
            } else {
                break;
            }
        }
        date.setDate(date.getDate() - 1);
        maxDaysBack--;
    }

    const today = new Date();
    if (isHabitScheduledForDate(habit, today) && getDayData(today)[habitId]) {
        streak++;
    }
    return streak;
}

// Calcule le score moyen pour le mois en cours
export function getMonthScore() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let totalScore = 0;
    let daysWithData = 0;
    for (let d = new Date(startOfMonth); d <= now; d.setDate(d.getDate() + 1)) {
        const dayData = getDayData(d);
        if (Object.keys(dayData).length > 0) {
            totalScore += getDayScore(new Date(d));
            daysWithData++;
        }
    }
    return daysWithData > 0 ? Math.round(totalScore / daysWithData) : 0;
}

// Calcule le nombre total d'habitudes complétées ("victoires")
export function getTotalWins() {
    const data = getData();
    const validatedDays = data.validatedDays || [];
    let wins = 0;
    for (const key of validatedDays) {
        if (!data.days[key]) continue;
        const dayData = data.days[key];
        wins += habits.filter(h => dayData[h.id]).length;
    }
    return wins;
}

// Calcule le score moyen global sur tous les jours enregistrés
export function getAvgScore() {
    const data = getData();
    const days = Object.keys(data.days);
    if (days.length === 0 || habits.length === 0) return 0;

    let total = 0;
    let validDays = 0;

    days.forEach(key => {
        const [year, month, day] = key.split('-').map(Number);
        const date = new Date(year, month - 1, day);

        const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, date));
        if (scheduledHabits.length === 0) return;

        const dayData = data.days[key];
        const completed = scheduledHabits.filter(h => dayData[h.id]).length;
        total += (completed / scheduledHabits.length) * 100;
        validDays++;
    });

    return validDays > 0 ? Math.round(total / validDays) : 0;
}

// Récupère la meilleure série enregistrée
export function getBestStreak() {
    const data = getData();
    return data.stats?.bestStreak || getStreak();
}

// Calcule le pourcentage de complétion d'une habitude pour le mois en cours
export function getHabitMonthProgress(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dayOfMonth = now.getDate();

    let completed = 0;
    let scheduledDays = 0;

    for (let day = 1; day <= dayOfMonth; day++) {
        const d = new Date(year, month, day);

        if (isHabitScheduledForDate(habit, d)) {
            scheduledDays++;
            const dayData = getDayData(d);
            if (dayData[habitId]) {
                completed++;
            }
        }
    }

    return scheduledDays > 0 ? Math.round((completed / scheduledDays) * 100) : 100;
}

// Calcule toutes les statistiques nécessaires pour les badges
export function calculateStats() {
    return {
        totalWins: getTotalWins(),
        perfectDaysCount: getPerfectDays(),
        bestStreak: getBestStreak(),
        avgScore: getAvgScore()
    };
}

// Formate une date en chaîne de caractères (ex: "lun. 28 déc.")
export function formatDate(date) {
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('fr-FR', options);
}

// Vérifie si une date est aujourd'hui
export function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

// Détermine si on peut modifier les habitudes pour une date donnée
export function canEditDate(date) {
    if (!isToday(date)) return false;

    // isDayValidated is imported inline to avoid circular dependency
    const data = getData();
    if (!data.validatedDays) return true;
    const dateKey = getDateKey(date);
    return !data.validatedDays.includes(dateKey);
}

// Vérifie si un jour est validé
export function isDayValidated(date) {
    const data = getData();
    if (!data.validatedDays) return false;
    const dateKey = getDateKey(date);
    return data.validatedDays.includes(dateKey);
}
