import { getState, setHabits, setCompletions } from './state.js';

// --- DATA HELPER FUNCTIONS ---

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- LOCALSTORAGE FUNCTIONS ---

export function getData() {
    const data = localStorage.getItem('warriorTracker');
    return data ? JSON.parse(data) : { days: {}, stats: { bestStreak: 0 } };
}

export function saveData(data) {
    localStorage.setItem('warriorTracker', JSON.stringify(data));
}

export function getDayData(date) {
    const data = getData();
    const key = getDateKey(date);
    return data.days[key] || {};
}

export function setHabitStatus(habitId, checked) {
    const { currentDate } = getState();
    if (!canEditDate(currentDate)) {
        return;
    }
    const data = getData();
    const key = getDateKey(currentDate);
    if (!data.days[key]) data.days[key] = {};
    data.days[key][habitId] = checked;
    saveData(data);
    // This will need to trigger a re-render
    // For now, we will just log it.
    console.log('Habit status updated');
}

// --- BUSINESS LOGIC / CALCULATIONS ---
// These functions depend on having the habits and completions data.
// For now, they will read directly from localStorage, but we will refactor them
// to use the central state.

export function getDayScore(date) {
    const dayData = getDayData(date);
    const { habits } = getState();
    if (habits.length === 0) return 0;
    const completed = habits.filter(h => dayData[h.id]).length;
    return Math.round((completed / habits.length) * 100);
}

export function getStreak() {
    let streak = 0;
    let date = new Date();
    date.setDate(date.getDate() - 1); // Commence par vérifier hier

    while (true) {
        const score = getDayScore(date);
        if (score >= 70) {
            streak++;
            date.setDate(date.getDate() - 1); // Passe au jour précédent
        } else {
            break; // La série est rompue
        }
    }

    if (getDayScore(new Date()) >= 70) {
        streak++; // Ajoute aujourd'hui si le score est suffisant
    }
    return streak;
}

export function getPerfectDays() {
    const data = getData();
    const { habits } = getState();
    if (habits.length === 0) return 0;
    let count = 0;
    for (const key in data.days) {
        const dayData = data.days[key];
        const completed = habits.filter(h => dayData[h.id]).length;
        if (completed === habits.length) count++;
    }
    return count;
}

// Helper function that needs to be available
export function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

export function isDayValidated(date) {
    const data = getData();
    if (!data.validatedDays) return false;
    const dateKey = getDateKey(date);
    return data.validatedDays.includes(dateKey);
}


export function canEditDate(date) {
    if (!isToday(date)) return false;
    if (isDayValidated(date)) return false;
    return true;
}

// --- VALIDATION DE JOURNÉE ---

/**
 * Marque une journée comme validée
 * @param {string} userId - L'identifiant de l'utilisateur
 * @param {Date} date - La date à valider
 * @returns {Promise<boolean>} - true si la validation a réussi
 */
export async function setDayAsValidated(userId, date) {
    const dateKey = getDateKey(date);

    // Sauvegarde dans localStorage
    const data = getData();

    // Initialiser le tableau des jours validés s'il n'existe pas
    if (!data.validatedDays) {
        data.validatedDays = [];
    }

    // Vérifier si déjà validé
    if (data.validatedDays.includes(dateKey)) {
        console.log('Cette journée est déjà validée.');
        return true;
    }

    // Ajouter la date aux jours validés
    data.validatedDays.push(dateKey);

    // Enregistrer le timestamp de validation
    if (!data.validationTimestamps) {
        data.validationTimestamps = {};
    }
    data.validationTimestamps[dateKey] = new Date().toISOString();

    // Sauvegarder dans localStorage
    saveData(data);

    console.log(`Journée ${dateKey} validée avec succès.`);

    // Si Firebase est configuré, sauvegarder aussi dans Firestore
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
            const db = firebase.firestore();
            await db.collection('users').doc(userId).collection('validatedDays').doc(dateKey).set({
                validatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                dateKey: dateKey
            });
            console.log('Validation sauvegardée dans Firestore.');
        } catch (error) {
            console.warn('Erreur Firestore (localStorage utilisé):', error);
        }
    }

    return true;
}

/**
 * Récupère la liste des jours validés
 * @returns {string[]} - Tableau des dates validées (format AAAA-MM-JJ)
 */
export function getValidatedDays() {
    const data = getData();
    return data.validatedDays || [];
}

/**
 * Vérifie si une journée spécifique est validée
 * @param {string} dateKey - La date au format AAAA-MM-JJ
 * @returns {boolean}
 */
export function isDateValidated(dateKey) {
    const validatedDays = getValidatedDays();
    return validatedDays.includes(dateKey);
}
