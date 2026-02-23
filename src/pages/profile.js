// ============================================================
// PAGE PROFIL - Profil utilisateur
// ============================================================

import { appState } from '../services/state.js';
import { getData, saveData } from '../services/storage.js';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { getAvgScore, getBestStreak, getPerfectDays, getTotalWins, getStreak } from '../core/scores.js';
import { getRank } from '../core/ranks.js';
import { showPopup } from '../ui/toast.js';
import { loadBadges, BADGES } from '../core/badges.js';

// Liste d'emojis pour l'avatar
const AVATAR_EMOJIS = [
    '🦁', '🐺', '🦅', '🐉', '🦈', '🐅', '🦊', '🐻',
    '🔥', '⚡', '💪', '🎯', '⭐', '💎', '👑', '🏆',
    '⚔️', '🛡️', '🚀', '🌟', '🎖️', '🦾', '🧠', '❤️‍🔥',
    '😎', '🤴', '👸', '🧙', '🥷', '🦸', '🏋️', '🥊'
];

// --- PROFILE DATA ---

export function getProfile() {
    const data = getData();
    return data.profile || { pseudo: '', bio: '', avatar: '🦁' };
}

export function saveProfile(profile) {
    const data = getData();
    data.profile = profile;
    saveData(data);

    // Sync avec Firestore si connecté
    if (isFirebaseConfigured && appState.currentUser) {
        syncProfileToFirestore(profile);
    }
}

async function syncProfileToFirestore(profile) {
    if (!isFirebaseConfigured || !appState.currentUser) return;

    try {
        const userRef = db.collection('users').doc(appState.currentUser.uid);
        await userRef.set({ profile: profile }, { merge: true });
        console.log('✅ Profil synchronisé avec Firestore');
    } catch (error) {
        console.error('❌ Erreur sync profil:', error);
    }
}

export async function loadProfileFromFirestore() {
    if (!isFirebaseConfigured || !appState.currentUser) return null;

    try {
        const userRef = db.collection('users').doc(appState.currentUser.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.profile) {
                // Sauvegarder aussi en local
                const data = getData();
                data.profile = userData.profile;
                saveData(data);
                return userData.profile;
            }
        }
    } catch (error) {
        console.error('❌ Erreur chargement profil Firestore:', error);
    }
    return null;
}

// --- RENDER ---

export function renderProfile() {
    const profile = getProfile();

    // Avatar
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) avatarEl.textContent = profile.avatar || '🦁';

    // Pseudo
    const pseudoEl = document.getElementById('profilePseudo');
    if (pseudoEl) pseudoEl.textContent = profile.pseudo || '-';

    // Bio
    const bioEl = document.getElementById('profileBio');
    if (bioEl) {
        if (profile.bio) {
            bioEl.textContent = profile.bio;
            bioEl.style.fontStyle = 'normal';
            bioEl.style.color = 'var(--accent)';
        } else {
            bioEl.textContent = 'Aucune bio';
            bioEl.style.fontStyle = 'italic';
            bioEl.style.color = 'var(--accent-dim)';
        }
    }

    // Stats
    const avgScore = getAvgScore();
    const rank = getRank(avgScore);

    const avgScoreEl = document.getElementById('profileAvgScore');
    if (avgScoreEl) avgScoreEl.textContent = avgScore + '%';

    const bestStreakEl = document.getElementById('profileBestStreak');
    if (bestStreakEl) bestStreakEl.textContent = getBestStreak();

    const perfectDaysEl = document.getElementById('profilePerfectDays');
    if (perfectDaysEl) perfectDaysEl.textContent = getPerfectDays();

    const rankEl = document.getElementById('profileRank');
    if (rankEl) {
        rankEl.textContent = rank.name;
        rankEl.style.color = rank.color;
    }

    // Stats fun
    const totalWinsEl = document.getElementById('profileTotalWins');
    if (totalWinsEl) totalWinsEl.textContent = getTotalWins();
    
    const currentStreak = getStreak();
    const currentStreakEl = document.getElementById('profileCurrentStreak');
    if (currentStreakEl) currentStreakEl.textContent = currentStreak;
    
    const streakLabel = document.getElementById('streakCardLabel');
    if (streakLabel) streakLabel.textContent = currentStreak === 0 ? 'Commence ta série !' : 'Streak actuel';
    
    const streakIcon = document.getElementById('streakFlameIcon');
    if (streakIcon) {
        if (currentStreak >= 30) streakIcon.textContent = '💎';
        else if (currentStreak >= 7) streakIcon.textContent = '⭐';
        else streakIcon.textContent = '🔥';
    }
    
    const bestStreakFun = document.getElementById('profileBestStreakFun');
    if (bestStreakFun) bestStreakFun.textContent = getBestStreak();

    // Membre depuis
    const memberSinceEl = document.getElementById('profileMemberSince');
    if (memberSinceEl) {
        if (isFirebaseConfigured && appState.currentUser) {
            const creationTime = appState.currentUser.metadata?.creationTime;
            if (creationTime) {
                const date = new Date(creationTime);
                const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                memberSinceEl.textContent = `Membre depuis ${months[date.getMonth()]} ${date.getFullYear()}`;
            }
        } else {
            memberSinceEl.textContent = '';
        }
    }
}

// --- AVATAR PICKER ---

export function openAvatarPicker() {
    const grid = document.getElementById('avatarPickerGrid');
    const profile = getProfile();

    grid.innerHTML = AVATAR_EMOJIS.map(emoji => `
        <div class="avatar-option ${emoji === profile.avatar ? 'selected' : ''}"
             onclick="selectAvatar('${emoji}')">
            ${emoji}
        </div>
    `).join('');

    document.getElementById('avatarPickerModal').classList.add('active');
}

export function closeAvatarPicker() {
    document.getElementById('avatarPickerModal').classList.remove('active');
}

export function selectAvatar(emoji) {
    const profile = getProfile();
    profile.avatar = emoji;
    saveProfile(profile);

    closeAvatarPicker();
    renderProfile();

    if (navigator.vibrate) navigator.vibrate([30, 30]);
    showPopup(`Avatar changé : ${emoji}`, 'success');
}

// --- EDIT PSEUDO ---

export function openEditPseudoModal() {
    const profile = getProfile();
    document.getElementById('editPseudoInput').value = profile.pseudo || '';
    document.getElementById('editPseudoModal').classList.add('active');
}

export function closeEditPseudoModal() {
    document.getElementById('editPseudoModal').classList.remove('active');
}

export function saveProfilePseudo() {
    const input = document.getElementById('editPseudoInput');
    const pseudo = input.value.trim();

    if (!pseudo) {
        showPopup('Le pseudo ne peut pas être vide', 'warning');
        return;
    }

    if (pseudo.length < 2) {
        showPopup('Le pseudo doit contenir au moins 2 caractères', 'warning');
        return;
    }

    const profile = getProfile();
    profile.pseudo = pseudo;
    saveProfile(profile);

    closeEditPseudoModal();
    renderProfile();

    if (navigator.vibrate) navigator.vibrate([30, 30]);
    showPopup(`Pseudo mis à jour : ${pseudo}`, 'success');
}

// --- EDIT BIO ---

export function openEditBioModal() {
    const profile = getProfile();
    document.getElementById('editBioInput').value = profile.bio || '';
    document.getElementById('editBioModal').classList.add('active');
}

export function closeEditBioModal() {
    document.getElementById('editBioModal').classList.remove('active');
}

export function saveProfileBio() {
    const input = document.getElementById('editBioInput');
    const bio = input.value.trim();

    const profile = getProfile();
    profile.bio = bio;
    saveProfile(profile);

    closeEditBioModal();
    renderProfile();

    if (navigator.vibrate) navigator.vibrate([30, 30]);
    showPopup('Bio mise à jour !', 'success');
}

// --- SETUP PSEUDO (après inscription) ---

export function checkNeedsPseudo() {
    const profile = getProfile();
    return !profile.pseudo;
}

export function showSetupPseudoModal() {
    document.getElementById('setupPseudoModal').classList.add('active');
}

export function saveSetupPseudo() {
    const input = document.getElementById('setupPseudoInput');
    const pseudo = input.value.trim();

    if (!pseudo) {
        showPopup('Choisis un pseudo pour continuer !', 'warning');
        return;
    }

    if (pseudo.length < 2) {
        showPopup('Le pseudo doit contenir au moins 2 caractères', 'warning');
        return;
    }

    const profile = getProfile();
    profile.pseudo = pseudo;
    if (!profile.avatar) profile.avatar = '🦁';
    saveProfile(profile);

    document.getElementById('setupPseudoModal').classList.remove('active');
    renderProfile();

    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    showPopup(`Bienvenue ${pseudo} ! 🔥`, 'success');

    // Lancer le tour guidé après le pseudo
    setTimeout(() => {
        if (typeof window.needsGuidedTour === 'function' && window.needsGuidedTour()) {
            window.startGuidedTour();
        }
    }, 800);
}
