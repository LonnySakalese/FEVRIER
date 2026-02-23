// ============================================================
// SYSTÈME DE BADGES D'ACHIEVEMENTS
// ============================================================

import { getData, saveData } from '../services/storage.js';
import { habits, appState } from '../services/state.js';
import { isFirebaseConfigured } from '../config/firebase.js';
import { calculateStats } from './scores.js';
import { getRank } from './ranks.js';
import { showPopup } from '../ui/toast.js';
import { triggerConfetti } from '../ui/confetti.js';

// Liste complète des badges disponibles
// SVG icon helper
const svg = (d, sw = 2) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const BADGE_ICONS = {
    // Progression
    footprints:  svg('<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5 10 7.43 8 8.5 8 10"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 1.93 2 3 2 4.5"/>'),
    sprout:      svg('<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>'),
    muscle:      svg('<path d="M18.8 4A6.3 8.7 0 0 1 20 9"/><path d="M9 9h.01"/><circle cx="9" cy="9" r="7"/><path d="m9 15 3.13-3.13a1.2 1.2 0 0 1 1.66 0l.24.24a1.2 1.2 0 0 0 1.66 0L18 9.76"/>'),
    flame:       svg('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
    zap:         svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
    crown:       svg('<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/>'),
    // Perfection
    star:        svg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
    sparkles:    svg('<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>'),
    sunstar:     svg('<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M2 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="M12 20v2"/><path d="m19.07 19.07-1.41-1.41"/><path d="M22 12h-2"/><path d="m19.07 4.93-1.41 1.41"/><circle cx="12" cy="12" r="4"/>'),
    diamond:     svg('<path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/>'),
    // Streaks
    flame2:      svg('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
    calendar:    svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    calcheck:    svg('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>'),
    columns:     svg('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>'),
    target:      svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
    // Rangs
    swords:      svg('<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="m16 16 2 2"/><path d="M9.5 6.5 21 18v3h-3L6.5 9.5"/>'),
    shield:      svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    trophy:      svg('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
    // Personnalisation
    palette:     svg('<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>'),
    layers:      svg('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'),
    // Spéciaux
    sunrise:     svg('<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>'),
    moon:        svg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
    award:       svg('<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>'),
    medal:       svg('<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>'),
};

export const BADGES = [
    // Badges de progression
    { id: 'first_step', name: 'Premier Pas', desc: 'Compléter 1 habitude', icon: BADGE_ICONS.footprints, condition: 'totalWins', value: 1, rarity: 'common' },
    { id: 'beginner', name: 'Débutant', desc: '50 victoires', icon: BADGE_ICONS.sprout, condition: 'totalWins', value: 50, rarity: 'common' },
    { id: 'committed', name: 'Engagé', desc: '200 victoires', icon: BADGE_ICONS.muscle, condition: 'totalWins', value: 200, rarity: 'uncommon' },
    { id: 'dedicated', name: 'Dévoué', desc: '500 victoires', icon: BADGE_ICONS.flame, condition: 'totalWins', value: 500, rarity: 'uncommon' },
    { id: 'champion', name: 'Champion', desc: '1500 victoires', icon: BADGE_ICONS.zap, condition: 'totalWins', value: 1500, rarity: 'rare' },
    { id: 'legend', name: 'Légende', desc: '5000 victoires', icon: BADGE_ICONS.crown, condition: 'totalWins', value: 5000, rarity: 'epic' },

    // Badges de perfection
    { id: 'first_perfect', name: 'Journée Parfaite', desc: 'Premier jour à 100%', icon: BADGE_ICONS.star, condition: 'perfectDays', value: 1, rarity: 'common' },
    { id: 'perfectionist', name: 'Perfectionniste', desc: '30 jours parfaits', icon: BADGE_ICONS.sparkles, condition: 'perfectDays', value: 30, rarity: 'uncommon' },
    { id: 'master_perfect', name: 'Maître de la Perfection', desc: '100 jours parfaits', icon: BADGE_ICONS.sunstar, condition: 'perfectDays', value: 100, rarity: 'rare' },
    { id: 'flawless', name: 'Impeccable', desc: '365 jours parfaits', icon: BADGE_ICONS.diamond, condition: 'perfectDays', value: 365, rarity: 'epic' },

    // Badges de streaks
    { id: 'streak_3', name: 'Série de 3', desc: '3 jours consécutifs', icon: BADGE_ICONS.flame2, condition: 'bestStreak', value: 3, rarity: 'common' },
    { id: 'streak_7', name: 'Semaine Complète', desc: '7 jours consécutifs', icon: BADGE_ICONS.calendar, condition: 'bestStreak', value: 7, rarity: 'uncommon' },
    { id: 'streak_30', name: 'Mois Complet', desc: '30 jours consécutifs', icon: BADGE_ICONS.calcheck, condition: 'bestStreak', value: 30, rarity: 'rare' },
    { id: 'streak_100', name: 'Centurion', desc: '100 jours consécutifs', icon: BADGE_ICONS.columns, condition: 'bestStreak', value: 100, rarity: 'epic' },
    { id: 'streak_365', name: 'Année Complète', desc: '365 jours consécutifs', icon: BADGE_ICONS.target, condition: 'bestStreak', value: 365, rarity: 'legendary' },

    // Badges de rangs
    { id: 'rank_warrior', name: 'Guerrier', desc: 'Atteindre le rang Guerrier', icon: BADGE_ICONS.swords, condition: 'rank', value: 'CONFIRMÉ', rarity: 'uncommon' },
    { id: 'rank_elite', name: 'Elite', desc: 'Atteindre le rang Elite', icon: BADGE_ICONS.shield, condition: 'rank', value: 'EXPERT', rarity: 'rare' },
    { id: 'rank_legend', name: 'Légende Vivante', desc: 'Atteindre le rang maximum', icon: BADGE_ICONS.trophy, condition: 'rank', value: 'MAÎTRE', rarity: 'epic' },

    // Badges de personnalisation
    { id: 'customizer', name: 'Personnalisateur', desc: 'Créer 5 habitudes', icon: BADGE_ICONS.palette, condition: 'customHabits', value: 5, rarity: 'common' },
    { id: 'architect', name: 'Architecte', desc: 'Créer 10 habitudes', icon: BADGE_ICONS.layers, condition: 'customHabits', value: 10, rarity: 'uncommon' },

    // Badges spéciaux
    { id: 'early_bird', name: 'Lève-Tôt', desc: 'Valider 7 jours avant 8h', icon: BADGE_ICONS.sunrise, condition: 'earlyValidations', value: 7, rarity: 'rare' },
    { id: 'night_owl', name: 'Oiseau de Nuit', desc: 'Valider 7 jours après 22h', icon: BADGE_ICONS.moon, condition: 'lateValidations', value: 7, rarity: 'rare' },
    { id: 'collector', name: 'Collectionneur', desc: 'Débloquer 10 badges', icon: BADGE_ICONS.award, condition: 'badgesUnlocked', value: 10, rarity: 'epic' },
    { id: 'completionist', name: 'Complétionniste', desc: 'Débloquer tous les badges', icon: BADGE_ICONS.medal, condition: 'allBadges', value: true, rarity: 'legendary' }
];

// Couleurs des raretés
export const RARITY_COLORS = {
    common: '#95A5A6',
    uncommon: '#3498DB',
    rare: '#9B59B6',
    epic: '#E67E22',
    legendary: '#F39C12'
};

// Charge les badges débloqués depuis le stockage
export function loadBadges() {
    const data = getData();
    return data.unlockedBadges || [];
}

// Sauvegarde les badges débloqués
export function saveBadges(unlockedBadges) {
    const data = getData();
    data.unlockedBadges = unlockedBadges;
    saveData(data);

    if (isFirebaseConfigured && appState.currentUser) {
        syncBadgesToFirestore(unlockedBadges);
    }
}

// Synchronise les badges avec Firestore
async function syncBadgesToFirestore(unlockedBadges) {
    if (!isFirebaseConfigured || !appState.currentUser) return;

    try {
        const userRef = firebase.firestore().collection('users').doc(appState.currentUser.uid);
        await userRef.set({ unlockedBadges: unlockedBadges }, { merge: true });
        console.log('✅ Badges synchronisés avec Firestore');
    } catch (error) {
        console.error('❌ Erreur sync badges:', error);
    }
}

// Vérifie et débloque les nouveaux badges
export function checkAndUnlockBadges() {
    try {
        const data = getData();
        const stats = calculateStats();
        const unlockedBadges = loadBadges();
        const newlyUnlocked = [];
        console.log('🔍 Checking badges...', 'Stats:', stats);

        const totalWins = stats.totalWins || 0;
        const perfectDays = stats.perfectDaysCount || 0;
        const bestStreak = stats.bestStreak || 0;
        const customHabits = (data.customHabits || []).length;
        const currentRank = getRank(stats.avgScore);
        const badgesCount = unlockedBadges.length;

        const earlyValidations = data.earlyValidations || 0;
        const lateValidations = data.lateValidations || 0;

        BADGES.forEach(badge => {
            if (unlockedBadges.includes(badge.id)) return;

            let unlocked = false;

            switch (badge.condition) {
                case 'totalWins':
                    unlocked = totalWins >= badge.value;
                    break;
                case 'perfectDays':
                    unlocked = perfectDays >= badge.value;
                    break;
                case 'bestStreak':
                    unlocked = bestStreak >= badge.value;
                    break;
                case 'customHabits':
                    unlocked = customHabits >= badge.value;
                    break;
                case 'rank':
                    unlocked = currentRank.name === badge.value;
                    break;
                case 'earlyValidations':
                    unlocked = earlyValidations >= badge.value;
                    break;
                case 'lateValidations':
                    unlocked = lateValidations >= badge.value;
                    break;
                case 'badgesUnlocked':
                    unlocked = badgesCount >= badge.value;
                    break;
                case 'allBadges':
                    unlocked = unlockedBadges.length === BADGES.length - 1;
                    break;
            }

            if (unlocked) {
                unlockedBadges.push(badge.id);
                newlyUnlocked.push(badge);
            }
        });

        if (newlyUnlocked.length > 0) {
            saveBadges(unlockedBadges);

            newlyUnlocked.forEach(badge => {
                showBadgeUnlockNotification(badge);
            });
        }

        return newlyUnlocked;
    } catch (error) {
        console.error('❌ Error checking badges:', error);
        return [];
    }
}

// Affiche une notification de déblocage de badge
export function showBadgeUnlockNotification(badge) {
    const rarityColor = RARITY_COLORS[badge.rarity];

    if (['rare', 'epic', 'legendary'].includes(badge.rarity)) {
        triggerConfetti();
    }

    showPopup(`🎉 Badge débloqué : ${badge.name}`, 'success');

    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }

    console.log(`🏆 Badge débloqué: ${badge.name}`);
}

// Toggle badges visibility (for mobile)
export function toggleBadgesVisibility() {
    const grid = document.getElementById('badgesGridWrapper');
    const btn = document.getElementById('toggleBadgesBtn');
    if (!grid || !btn) return;

    const isHidden = grid.style.display === 'none';
    grid.style.display = isHidden ? 'block' : 'none';
    btn.innerHTML = isHidden 
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg><span>Masquer les badges</span>' 
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg><span>Voir les badges</span>';
}

// Affiche les badges dans la page Stats
export function renderBadges() {
    try {
        const container = document.getElementById('badgesContainer');
        if (!container) {
            console.warn('⚠️ Badge container not found');
            return;
        }

        const unlockedBadges = loadBadges();
        console.log('🏆 Rendering badges:', unlockedBadges.length, 'unlocked');

        let gridHtml = '<div class="badges-grid">';

        BADGES.forEach(badge => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            const rarityColor = RARITY_COLORS[badge.rarity];

            gridHtml += `
                <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}"
                     style="border-color: ${rarityColor};"
                     title="${badge.desc}">
                    <div class="badge-icon ${isUnlocked ? '' : 'grayscale'}" style="${isUnlocked ? `color: ${rarityColor};` : ''}">${badge.icon}</div>
                    <div class="badge-name">${badge.name}</div>
                    <div class="badge-desc">${badge.desc}</div>
                    ${!isUnlocked ? '<div class="badge-lock"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>' : ''}
                </div>
            `;
        });

        gridHtml += '</div>';

        const progress = Math.round((unlockedBadges.length / BADGES.length) * 100);
        let html = `
            <div class="badges-header">
                <div class="badges-title">🏆 ACHIEVEMENTS</div>
                <div class="badges-progress">
                    <span>${unlockedBadges.length} / ${BADGES.length}</span>
                    <div class="progress-bar-small">
                        <div class="progress-fill-small" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
            <button id="toggleBadgesBtn" class="action-btn action-btn-secondary" onclick="toggleBadgesVisibility()" style="width: 100%; margin-bottom: 10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                <span>Voir les badges</span>
            </button>
            <div id="badgesGridWrapper" style="display: none;">
                ${gridHtml}
            </div>
        `;

        container.innerHTML = html;
        console.log('✅ Badges rendered successfully');
    } catch (error) {
        console.error('❌ Error rendering badges:', error);
    }
}
