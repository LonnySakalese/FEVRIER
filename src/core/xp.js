// ============================================================
// SYSTÈME XP (EXPERIENCE POINTS)
// ============================================================

import { getData, saveData, getDateKey } from '../services/storage.js';
import { showPopup } from '../ui/toast.js';

const MAX_LEVEL = 50;

// XP total requis pour atteindre le niveau N = N × (N+1) × 50
export function getXPForLevel(level) {
    return level * (level + 1) * 50;
}

// Calcule le niveau à partir du XP total
export function getLevel(totalXP) {
    let level = 1;
    while (level < MAX_LEVEL && totalXP >= getXPForLevel(level)) {
        level++;
    }
    return level;
}

// Retourne les données XP enrichies
export function getXPData() {
    const data = getData();
    if (!data.xp) {
        data.xp = { total: 0, level: 1, todayXP: 0, lastDate: '' };
    }

    // Reset todayXP si on a changé de jour
    const today = getDateKey(new Date());
    if (data.xp.lastDate !== today) {
        data.xp.todayXP = 0;
        data.xp.lastDate = today;
        saveData(data);
    }

    const total = data.xp.total;
    const level = data.xp.level;
    const xpCurrentLevel = getXPForLevel(level - 1); // XP pour avoir atteint le niveau actuel (0 pour lvl 1)
    const xpNextLevel = getXPForLevel(level);         // XP pour atteindre le prochain niveau
    const xpInLevel = total - (level > 1 ? xpCurrentLevel : 0);
    const xpNeeded = xpNextLevel - (level > 1 ? xpCurrentLevel : 0);
    const xpProgress = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;

    return {
        total,
        level,
        todayXP: data.xp.todayXP,
        xpForNextLevel: xpNextLevel,
        xpProgress,
        xpInLevel,
        xpNeeded
    };
}

// Ajoute de l'XP, vérifie le level up
export function addXP(amount, reason) {
    const data = getData();
    if (!data.xp) {
        data.xp = { total: 0, level: 1, todayXP: 0, lastDate: '' };
    }

    // Reset todayXP si changement de jour
    const today = getDateKey(new Date());
    if (data.xp.lastDate !== today) {
        data.xp.todayXP = 0;
        data.xp.lastDate = today;
    }

    const oldLevel = data.xp.level;
    data.xp.total += amount;
    data.xp.todayXP += amount;

    // Recalculer le niveau
    const newLevel = getLevel(data.xp.total);
    data.xp.level = newLevel;

    saveData(data);

    const leveledUp = newLevel > oldLevel;
    if (leveledUp) {
        showPopup(`🎉 LEVEL UP ! Niveau ${newLevel}`, 'success');
    }

    return { newTotal: data.xp.total, leveledUp, newLevel };
}

// % de progression vers le prochain niveau
export function getXPProgress() {
    const xpData = getXPData();
    return xpData.xpProgress;
}

// +10 XP pour avoir coché une habitude (1 seule fois par habitude par jour)
export function awardHabitXP(habitId) {
    const data = getData();
    if (!data.xp) {
        data.xp = { total: 0, level: 1, todayXP: 0, lastDate: '', awardedHabits: [] };
    }
    const today = getDateKey(new Date());
    
    // Reset les habitudes récompensées si changement de jour
    if (data.xp.lastDate !== today) {
        data.xp.awardedHabits = [];
    }
    
    // Ne pas donner de XP si déjà récompensé aujourd'hui
    if (!data.xp.awardedHabits) data.xp.awardedHabits = [];
    if (habitId && data.xp.awardedHabits.includes(habitId)) {
        return null; // Déjà récompensé
    }
    
    // Marquer comme récompensé
    if (habitId) {
        data.xp.awardedHabits.push(habitId);
        saveData(data);
    }
    
    return addXP(10, 'habit_checked');
}

// Bonus XP selon le score de la journée validée (1 fois par jour)
export function awardDayValidatedXP(score) {
    const data = getData();
    if (!data.xp) {
        data.xp = { total: 0, level: 1, todayXP: 0, lastDate: '', awardedHabits: [], dayValidated: '' };
    }
    const today = getDateKey(new Date());
    
    // Ne pas donner de XP si déjà validé aujourd'hui
    if (data.xp.dayValidated === today) {
        return 0;
    }
    data.xp.dayValidated = today;
    saveData(data);
    
    let totalAwarded = 0;

    // Journée validée = +50 XP bonus
    addXP(50, 'day_validated');
    totalAwarded += 50;

    // Journée parfaite (100%) = +100 XP bonus supplémentaire
    if (score === 100) {
        addXP(100, 'perfect_day');
        totalAwarded += 100;
    }

    return totalAwarded;
}

// Bonus XP pour les milestones de streak
export function awardStreakXP(streak) {
    if (streak === 7) {
        return addXP(200, 'streak_7');
    } else if (streak === 30) {
        return addXP(500, 'streak_30');
    }
    return null;
}

// Reset le compteur quotidien
export function resetDailyXP() {
    const data = getData();
    if (!data.xp) {
        data.xp = { total: 0, level: 1, todayXP: 0, lastDate: '', awardedHabits: [] };
    }
    data.xp.todayXP = 0;
    data.xp.awardedHabits = [];
    data.xp.lastDate = getDateKey(new Date());
    saveData(data);
}
