// ============================================================
// SYSTÈME XP (EXPERIENCE POINTS)
// ============================================================

import { getData, saveData, getDateKey, getDayData } from '../services/storage.js';
import { showPopup } from '../ui/toast.js';
import { showLevelUp } from '../ui/levelup.js';
import { habits, appState } from '../services/state.js';
import { isHabitScheduledForDate } from './habits.js';
import { broadcastToUserGroups } from '../ui/auto-messages.js';
import { db, isFirebaseConfigured } from '../config/firebase.js';

// Callback pour le level up (utilisé par rewards)
let _onLevelUp = null;
export function setOnLevelUp(callback) {
    _onLevelUp = callback;
}

const MAX_LEVEL = 50;
const FATIGUE_THRESHOLD = 70; // Score minimum de la veille pour éviter la fatigue

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

// Ajoute de l'XP, vérifie le level up (applique le multiplicateur de fatigue)
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

    // Appliquer le multiplicateur de fatigue
    const fatigueData = getFatigueData();
    const effectiveAmount = Math.round(amount * fatigueData.xpMultiplier);

    const oldLevel = data.xp.level;
    data.xp.total += effectiveAmount;
    data.xp.todayXP += effectiveAmount;

    // Recalculer le niveau
    const newLevel = getLevel(data.xp.total);
    data.xp.level = newLevel;

    saveData(data);

    const leveledUp = newLevel > oldLevel;
    if (leveledUp) {
        showLevelUp(oldLevel, newLevel);
        if (_onLevelUp) _onLevelUp(newLevel);

        // Message auto dans les groupes
        if (isFirebaseConfigured && appState.currentUser) {
            const userId = appState.currentUser.uid;
            db.collection('users').doc(userId).get().then(uDoc => {
                const pseudo = uDoc.data()?.pseudo || 'Anonyme';
                broadcastToUserGroups(userId, `${pseudo} a atteint le niveau ${newLevel} ⚡`);
            }).catch(err => console.error('Erreur auto-message level up:', err));
        }
    }

    return { newTotal: data.xp.total, leveledUp, newLevel };
}

// % de progression vers le prochain niveau
export function getXPProgress() {
    const xpData = getXPData();
    return xpData.xpProgress;
}

// +10 XP pour une habitude complétée ET validée dans les 24h
// Appelé uniquement lors de la validation de journée (pas au coche)
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
    
    return addXP(10, 'habit_validated');
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

// ============================================================
// SYSTÈME DE FATIGUE
// ============================================================

// Vérifie si le joueur est en état de fatigue
// Fatigue = le score de la veille était < 70%
export function checkFatigue() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayData = getDayData(yesterday);
    
    // Pas de fatigue si aucune donnée hier (nouveau user, premier jour)
    if (!yesterdayData || Object.keys(yesterdayData).length === 0) return false;
    
    const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, yesterday));
    
    // Pas de fatigue si pas d'habitudes programmées hier
    if (scheduledHabits.length === 0) return false;
    
    const completed = scheduledHabits.filter(h => yesterdayData[h.id]).length;
    const yesterdayScore = Math.round((completed / scheduledHabits.length) * 100);
    
    return yesterdayScore < FATIGUE_THRESHOLD;
}

// Retourne les infos complètes de fatigue
export function getFatigueData() {
    const isFatigued = checkFatigue();
    const data = getData();
    const today = getDateKey(new Date());
    
    // Vérifier si la fatigue a été levée aujourd'hui
    if (!data.xp) data.xp = {};
    if (data.xp.fatigueClearedDate === today) {
        return { isFatigued: false, wasCleared: true, xpMultiplier: 1 };
    }
    
    if (!isFatigued) {
        return { isFatigued: false, wasCleared: false, xpMultiplier: 1 };
    }
    
    // En fatigue : XP divisé par 2
    return { isFatigued: true, wasCleared: false, xpMultiplier: 0.5 };
}

// Vérifie si le score actuel du jour permet de lever la fatigue
// La fatigue est levée quand le score du jour atteint 100%
export function checkClearFatigue(currentDayScore) {
    const fatigueData = getFatigueData();
    if (!fatigueData.isFatigued) return false;
    
    if (currentDayScore >= 100) {
        const data = getData();
        if (!data.xp) data.xp = {};
        data.xp.fatigueClearedDate = getDateKey(new Date());
        saveData(data);
        showPopup('⚡ FATIGUE LEVÉE ! XP normal rétabli !', 'success', 4000);
        return true;
    }
    return false;
}
