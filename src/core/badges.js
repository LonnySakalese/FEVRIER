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
export const BADGES = [
    // Badges de progression
    { id: 'first_step', name: 'Premier Pas', desc: 'Compléter 1 habitude', icon: '👣', condition: 'totalWins', value: 1, rarity: 'common' },
    { id: 'beginner', name: 'Débutant', desc: '10 victoires', icon: '🌱', condition: 'totalWins', value: 10, rarity: 'common' },
    { id: 'committed', name: 'Engagé', desc: '50 victoires', icon: '💪', condition: 'totalWins', value: 50, rarity: 'uncommon' },
    { id: 'dedicated', name: 'Dévoué', desc: '100 victoires', icon: '🔥', condition: 'totalWins', value: 100, rarity: 'uncommon' },
    { id: 'champion', name: 'Champion', desc: '500 victoires', icon: '⚡', condition: 'totalWins', value: 500, rarity: 'rare' },
    { id: 'legend', name: 'Légende', desc: '1000 victoires', icon: '👑', condition: 'totalWins', value: 1000, rarity: 'epic' },

    // Badges de perfection
    { id: 'first_perfect', name: 'Journée Parfaite', desc: 'Premier jour à 100%', icon: '⭐', condition: 'perfectDays', value: 1, rarity: 'common' },
    { id: 'perfectionist', name: 'Perfectionniste', desc: '10 jours parfaits', icon: '✨', condition: 'perfectDays', value: 10, rarity: 'uncommon' },
    { id: 'master_perfect', name: 'Maître de la Perfection', desc: '30 jours parfaits', icon: '🌟', condition: 'perfectDays', value: 30, rarity: 'rare' },
    { id: 'flawless', name: 'Impeccable', desc: '100 jours parfaits', icon: '💎', condition: 'perfectDays', value: 100, rarity: 'epic' },

    // Badges de streaks
    { id: 'streak_3', name: 'Série de 3', desc: '3 jours consécutifs', icon: '🔥', condition: 'bestStreak', value: 3, rarity: 'common' },
    { id: 'streak_7', name: 'Semaine Complète', desc: '7 jours consécutifs', icon: '📅', condition: 'bestStreak', value: 7, rarity: 'uncommon' },
    { id: 'streak_30', name: 'Mois Complet', desc: '30 jours consécutifs', icon: '🗓️', condition: 'bestStreak', value: 30, rarity: 'rare' },
    { id: 'streak_100', name: 'Centurion', desc: '100 jours consécutifs', icon: '🏛️', condition: 'bestStreak', value: 100, rarity: 'epic' },
    { id: 'streak_365', name: 'Année Complète', desc: '365 jours consécutifs', icon: '🎯', condition: 'bestStreak', value: 365, rarity: 'legendary' },

    // Badges de rangs
    { id: 'rank_warrior', name: 'Guerrier', desc: 'Atteindre le rang Guerrier', icon: '⚔️', condition: 'rank', value: 'CONFIRMÉ', rarity: 'uncommon' },
    { id: 'rank_elite', name: 'Elite', desc: 'Atteindre le rang Elite', icon: '🛡️', condition: 'rank', value: 'EXPERT', rarity: 'rare' },
    { id: 'rank_legend', name: 'Légende Vivante', desc: 'Atteindre le rang maximum', icon: '🏆', condition: 'rank', value: 'MAÎTRE', rarity: 'epic' },

    // Badges de personnalisation
    { id: 'customizer', name: 'Personnalisateur', desc: 'Créer 5 habitudes', icon: '🎨', condition: 'customHabits', value: 5, rarity: 'common' },
    { id: 'architect', name: 'Architecte', desc: 'Créer 10 habitudes', icon: '🏗️', condition: 'customHabits', value: 10, rarity: 'uncommon' },

    // Badges spéciaux
    { id: 'early_bird', name: 'Lève-Tôt', desc: 'Valider 7 jours avant 8h', icon: '🌅', condition: 'earlyValidations', value: 7, rarity: 'rare' },
    { id: 'night_owl', name: 'Oiseau de Nuit', desc: 'Valider 7 jours après 22h', icon: '🌙', condition: 'lateValidations', value: 7, rarity: 'rare' },
    { id: 'collector', name: 'Collectionneur', desc: 'Débloquer 10 badges', icon: '🎖️', condition: 'badgesUnlocked', value: 10, rarity: 'epic' },
    { id: 'completionist', name: 'Complétionniste', desc: 'Débloquer tous les badges', icon: '🏅', condition: 'allBadges', value: true, rarity: 'legendary' }
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

    showPopup(`🎉 Badge débloqué : ${badge.icon} ${badge.name}`, 'success');

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
                    <div class="badge-icon ${isUnlocked ? '' : 'grayscale'}">${badge.icon}</div>
                    <div class="badge-name">${badge.name}</div>
                    <div class="badge-desc">${badge.desc}</div>
                    ${!isUnlocked ? '<div class="badge-lock">🔒</div>' : ''}
                </div>
            `;
        });

        gridHtml += '</div>';

        const progress = Math.round((unlockedBadges.length / BADGES.length) * 100);
        const isMobile = window.innerWidth <= 768;

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
            <button id="toggleBadgesBtn" class="action-btn action-btn-secondary" onclick="toggleBadgesVisibility()" style="width: 100%; margin-bottom: 10px; display: ${isMobile ? 'flex' : 'none'};">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                <span>Voir les badges</span>
            </button>
            <div id="badgesGridWrapper" style="display: ${isMobile ? 'none' : 'block'};">
                ${gridHtml}
            </div>
        `;

        container.innerHTML = html;
        console.log('✅ Badges rendered successfully');
    } catch (error) {
        console.error('❌ Error rendering badges:', error);
    }
}
