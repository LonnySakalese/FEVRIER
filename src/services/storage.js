// ============================================================
// LOCAL STORAGE MANAGEMENT
// ============================================================

// Crée une clé de date unique (YYYY-MM-DD) pour le stockage
export function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Récupère toutes les données depuis le localStorage
export function getData() {
    const data = localStorage.getItem('warriorTracker');
    return data ? JSON.parse(data) : { days: {}, stats: { bestStreak: 0 } };
}

// Sauvegarde les données dans le localStorage
export function saveData(data) {
    localStorage.setItem('warriorTracker', JSON.stringify(data));
}

// Récupère les données d'un jour spécifique
export function getDayData(date) {
    const data = getData();
    const key = getDateKey(date);
    return data.days[key] || {};
}
