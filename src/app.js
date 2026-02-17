// ============================================================
// APP.JS - Point d'entrée principal
// ============================================================

// --- Config & State ---
import { auth, db, isFirebaseConfigured } from './config/firebase.js';
import { appState, habits } from './services/state.js';
import { getData, saveData, getDateKey } from './services/storage.js';

// --- i18n ---
import { t, getCurrentLang, setLang, getAvailableLangs, applyTranslations, cycleLang as cycleLangFromModule } from './services/i18n.js';

// --- Services ---
import { scheduleNotification, toggleNotifications, updateNotificationButton, updateNotificationTime, loadNotificationTime, setShowValidateDayModal } from './services/notifications.js';

// --- Core ---
import {
    loadCustomHabits, openManageHabitsModal, closeManageHabitsModal,
    toggleAddHabitForm, cancelAddHabit, saveNewHabit,
    setScheduleType, toggleDayOfWeek,
    updateHabit, updateHabitName, deleteHabit, moveHabit,
    setHabitScheduleType, toggleHabitDayOfWeek,
    setOnHabitsChanged,
    setHabitCategory, filterByCategory, getActiveFilter, getSelectedCategory,
    HABIT_CATEGORIES
} from './core/habits.js';
import { getRank } from './core/ranks.js';
import {
    loadRankSettings, renderRanks, toggleRankEditMode,
    cancelRankEdit, saveRankSettings, resetRanksToDefault,
    onPaletteChange, setOnRanksChanged
} from './core/ranks.js';

// --- Core (XP) ---
import { getXPData, addXP, awardHabitXP, awardDayValidatedXP, awardStreakXP, resetDailyXP, getFatigueData, checkClearFatigue, setOnLevelUp } from './core/xp.js';

// --- UI ---
import { showPopup } from './ui/toast.js';
import { ConfirmModal } from './ui/modals.js';
import { loadTheme, toggleTheme, loadThemeFromFirestore } from './ui/theme.js';
import { triggerConfetti } from './ui/confetti.js';
import { openCalendarModal, closeCalendarModal, changeCalendarMonth } from './ui/calendar.js';
import { initInstallBanner, dismissInstallBanner, installApp, promptInstallFromSettings } from './ui/install.js';
import { shareDay } from './ui/share.js';
import { exportDataCSV } from './ui/export.js';
import { showQRModal, closeQRModal, downloadQR } from './ui/qrcode.js';
import { sendChatMessage, toggleRecording, cancelRecording, playAudio, handleTypingInput, showReactionPopup, selectReaction, toggleReaction, handleBubbleTouchStart, handleBubbleTouchEnd, handleBubbleTouchMove, setReplyTo, cancelReply, scrollToMessage, scrollChatToBottom } from './ui/chat.js';
import { openCreateChallengeModal, closeCreateChallengeModal, setChallengeDuration, createChallenge, renderChallenges, joinChallenge, leaveChallenge, openChallengeDetail } from './ui/challenges.js';
// Lazy-loaded on navigation: analytics, streak-display, heatmap
import './ui/auto-messages.js';
import { showCelebration, celebrateNewRank, celebrateNewBadge } from './ui/celebration.js';
import { showLevelUp } from './ui/levelup.js';
import { initRewards, renderThemeSelector, checkNewThemeUnlocks, selectTheme } from './ui/rewards.js';
import {
    isFirstTimeUser, showTutorial, hideTutorial, initTutorial,
    nextTutorialStep, prevTutorialStep, skipTutorial,
    completeTutorial, toggleDemoCheckbox, restartTutorial,
    goToTutorialStep, setCurrentTutorialStep
} from './ui/tutorial.js';
import { needsOnboarding, startOnboarding } from './ui/onboarding.js';
import { needsGuidedTour, startGuidedTour, resetGuidedTour } from './ui/guided-tour.js';

// --- Pages ---
import {
    renderHabits, updateKPIs, toggleHabit, changeDate, updateUI,
    showValidateDayModal, closeValidateDayModal, confirmValidateDay, updateValidateButton
} from './pages/today.js';
import { updateStats, toggleBadgesVisibility } from './pages/stats.js';
import { quotes, displayRandomQuote, getGreeting } from './pages/motivation.js';
import {
    renderProfile, openAvatarPicker, closeAvatarPicker, selectAvatar,
    openEditPseudoModal, closeEditPseudoModal, saveProfilePseudo,
    openEditBioModal, closeEditBioModal, saveProfileBio,
    checkNeedsPseudo, showSetupPseudoModal, saveSetupPseudo,
    loadProfileFromFirestore
} from './pages/profile.js';
import {
    renderGroups, openCreateGroupModal, closeCreateGroupModal, createGroup,
    openJoinGroupModal, closeJoinGroupModal, joinGroup,
    openGroupDetail, closeGroupDetail, leaveGroup, deleteGroup, copyGroupCode,
    renderProfileGroups, switchGroupTab
} from './pages/groups.js';
import { renderLeaderboard } from './ui/leaderboard.js';

// --- Auth functions (defined here because they use firebase globals) ---

function showAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        document.querySelector('.auth-tab:first-child').classList.add('active');
        document.getElementById('auth-login').classList.add('active');
    } else {
        document.querySelector('.auth-tab:last-child').classList.add('active');
        document.getElementById('auth-signup').classList.add('active');
    }
}

async function handleSignup() {
    if (!isFirebaseConfigured) {
        showPopup('Firebase n\'est pas configuré.', 'warning');
        return;
    }

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const errorEl = document.getElementById('signup-error');

    errorEl.textContent = '';
    errorEl.classList.remove('show');

    if (!email || !password || !confirm) {
        errorEl.textContent = 'Tous les champs sont requis';
        errorEl.classList.add('show');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorEl.textContent = 'Adresse e-mail invalide';
        errorEl.classList.add('show');
        return;
    }

    if (password !== confirm) {
        errorEl.textContent = 'Les mots de passe ne correspondent pas';
        errorEl.classList.add('show');
        return;
    }

    if (password.length < 8) {
        errorEl.textContent = 'Le mot de passe doit contenir au moins 8 caractères';
        errorEl.classList.add('show');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log('✅ Compte créé:', userCredential.user.uid);

        await createUserProfile(userCredential.user);
        checkLocalStorageMigration(userCredential.user);

    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        errorEl.textContent = getAuthErrorMessage(error.code);
        errorEl.classList.add('show');
    }
}

async function handleLogin() {
    if (!isFirebaseConfigured) {
        showPopup('Firebase n\'est pas configuré.', 'warning');
        return;
    }

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    errorEl.textContent = '';
    errorEl.classList.remove('show');

    if (!email || !password) {
        errorEl.textContent = 'Email et mot de passe requis';
        errorEl.classList.add('show');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorEl.textContent = 'Adresse e-mail invalide';
        errorEl.classList.add('show');
        return;
    }

    if (password.length < 8) {
        errorEl.textContent = 'Le mot de passe doit contenir au moins 8 caractères';
        errorEl.classList.add('show');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Connexion réussie');
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        errorEl.textContent = getAuthErrorMessage(error.code);
        errorEl.classList.add('show');
    }
}

function handleLogout() {
    if (!isFirebaseConfigured) return;
    document.getElementById('logoutModal').classList.add('active');
}

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.remove('active');
}

async function confirmLogout() {
    try {
        await auth.signOut();
        console.log('✅ Déconnexion réussie');
        closeLogoutModal();
    } catch (error) {
        console.error('❌ Erreur déconnexion:', error);
        showPopup('Erreur lors de la déconnexion', 'error');
        closeLogoutModal();
    }
}

async function handleForgotPassword() {
    if (!isFirebaseConfigured) return;

    const email = document.getElementById('login-email').value.trim();

    if (!email) {
        showPopup('Entre ton email pour réinitialiser ton mot de passe', 'warning');
        return;
    }

    const confirmed = await ConfirmModal.show({
        title: '📧 RÉINITIALISATION',
        message: `Envoyer un email de réinitialisation à <strong>${email}</strong> ?`,
        confirmText: 'Envoyer',
        cancelText: 'Annuler'
    });

    if (confirmed) {
        try {
            await auth.sendPasswordResetEmail(email);
            showPopup('Email de réinitialisation envoyé ! Vérifie ta boîte mail (et les spams).', 'success');
        } catch (error) {
            console.error('❌ Erreur réinitialisation:', error);
            showPopup(getAuthErrorMessage(error.code), 'error');
        }
    }
}

function handleDeleteAccount() {
    if (!isFirebaseConfigured) return;

    const user = auth.currentUser;
    if (!user) {
        showPopup('Tu dois être connecté pour supprimer ton compte', 'error');
        return;
    }

    document.getElementById('deleteAccountInput').value = '';
    document.getElementById('deleteAccountModal').classList.add('active');
}

function closeDeleteAccountModal() {
    document.getElementById('deleteAccountModal').classList.remove('active');
}

async function confirmDeleteAccount() {
    const password = document.getElementById('deleteAccountInput').value.trim();

    if (!password) {
        showPopup('Entre ton mot de passe pour confirmer', 'warning');
        return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
        showPopup('Erreur : utilisateur non connecté', 'error');
        return;
    }

    try {
        // Ré-authentifier avec le mot de passe
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
    } catch (error) {
        console.error('❌ Erreur ré-authentification:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            showPopup('Mot de passe incorrect', 'error');
        } else {
            showPopup('Erreur de vérification : ' + (error.message || error.code), 'error');
        }
        return;
    }

    closeDeleteAccountModal();

    try {
        const userId = user.uid;

        const batch = db.batch();

        const habitsSnapshot = await db.collection('users').doc(userId).collection('habits').get();
        habitsSnapshot.forEach(doc => batch.delete(doc.ref));

        const completionsSnapshot = await db.collection('users').doc(userId).collection('completions').get();
        completionsSnapshot.forEach(doc => batch.delete(doc.ref));

        const statsSnapshot = await db.collection('users').doc(userId).collection('stats').get();
        statsSnapshot.forEach(doc => batch.delete(doc.ref));

        batch.delete(db.collection('users').doc(userId));

        await batch.commit();
        console.log('✅ Données Firestore supprimées');

        await user.delete();
        console.log('✅ Compte utilisateur supprimé');

        localStorage.removeItem('warriorTracker');

        showPopup('Ton compte a été supprimé définitivement. Au revoir, WARRIOR. On espère te revoir ! 💪', 'success', 6000);

    } catch (error) {
        console.error('❌ Erreur suppression compte:', error);
        showPopup('Erreur lors de la suppression du compte : ' + error.message, 'error');
    }
}

function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/invalid-email': 'Email invalide',
        'auth/weak-password': 'Mot de passe trop faible',
        'auth/user-not-found': 'Utilisateur non trouvé',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/too-many-requests': 'Trop de tentatives. Réessaie plus tard.',
        'auth/network-request-failed': 'Erreur réseau. Vérifie ta connexion.'
    };
    return messages[errorCode] || 'Erreur d\'authentification : ' + errorCode;
}

async function createUserProfile(user) {
    const userRef = db.collection('users').doc(user.uid);

    await userRef.set({
        email: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Profil utilisateur créé');
}

function checkLocalStorageMigration(user) {
    const localData = localStorage.getItem('warriorTracker');

    if (localData) {
        const data = JSON.parse(localData);
        const daysCount = Object.keys(data.days || {}).length;

        if (daysCount > 0) {
            showMigrationModal(data, user);
        }
    }
}

function showMigrationModal(localData, user) {
    const modal = document.getElementById('migrationModal');
    const preview = document.getElementById('migrationPreview');

    const daysCount = Object.keys(localData.days || {}).length;

    let perfectDays = 0;
    Object.values(localData.days || {}).forEach(day => {
        const completed = Object.values(day).filter(Boolean).length;
        if (completed === habits.length) perfectDays++;
    });

    preview.innerHTML = `
        <div class="migration-stat">
            <span>Jours enregistrés</span>
            <strong>${daysCount}</strong>
        </div>
        <div class="migration-stat">
            <span>Jours parfaits</span>
            <strong>${perfectDays}</strong>
        </div>
        <div class="migration-stat">
            <span>Meilleure série</span>
            <strong>${localData.stats?.bestStreak || 0}</strong>
        </div>
    `;

    modal.classList.add('active');

    window.pendingMigration = { localData, user };
}

async function performMigration() {
    const { localData, user } = window.pendingMigration;

    try {
        console.log('🔄 Début de la migration...');

        let batch = db.batch();
        let batchCount = 0;

        for (const [dateKey, dayData] of Object.entries(localData.days || {})) {
            for (const [habitId, completed] of Object.entries(dayData)) {
                if (completed) {
                    const docId = `${dateKey}-${habitId}`;
                    const completionRef = db.collection('users').doc(user.uid)
                        .collection('completions').doc(docId);

                    batch.set(completionRef, {
                        date: dateKey,
                        habitId: habitId,
                        completed: true,
                        completedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    batchCount++;

                    if (batchCount >= 400) {
                        await batch.commit();
                        console.log(`✅ Migré ${batchCount} completions`);
                        batch = db.batch();
                        batchCount = 0;
                    }
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
            console.log(`✅ Migré ${batchCount} completions`);
        }

        const statsRef = db.collection('users').doc(user.uid).collection('stats').doc('global');
        await statsRef.set({
            bestStreak: localData.stats?.bestStreak || 0,
            totalWins: 0,
            perfectDaysCount: 0,
            lastCalculated: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (localData.customHabitNames) {
            const habitBatch = db.batch();
            for (const [habitId, customName] of Object.entries(localData.customHabitNames)) {
                const habitRef = db.collection('users').doc(user.uid)
                    .collection('habits').doc(habitId);
                habitBatch.update(habitRef, { name: customName });
            }
            await habitBatch.commit();
            console.log('✅ Noms personnalisés migrés');
        }

        localStorage.removeItem('warriorTracker');

        closeMigrationModal();
        showPopup('Migration réussie ! Toutes tes données ont été transférées.', 'success');
        console.log('✅ Migration complète');

    } catch (error) {
        console.error('❌ Erreur de migration:', error);
        showPopup('Erreur lors de la migration. Tes données locales sont conservées.', 'error');
    }
}

async function skipMigration() {
    closeMigrationModal();

    const confirmed = await ConfirmModal.show({
        title: '🗑️ DONNÉES LOCALES',
        message: 'Veux-tu supprimer les données locales ?',
        confirmText: 'Supprimer',
        cancelText: 'Conserver',
        danger: true
    });

    if (confirmed) {
        localStorage.removeItem('warriorTracker');
        showPopup('Données locales supprimées', 'success');
    }
}

function closeMigrationModal() {
    document.getElementById('migrationModal').classList.remove('active');
    window.pendingMigration = null;
}

async function resetAllData() {
    const firstConfirm = await ConfirmModal.show({
        title: '⚠️ RÉINITIALISATION',
        message: 'Es-tu sûr de vouloir tout réinitialiser ?',
        subtext: 'Cette action est irréversible !',
        confirmText: 'Continuer',
        cancelText: 'Annuler',
        danger: true
    });

    if (!firstConfirm) return;

    const secondConfirm = await ConfirmModal.show({
        title: '🔥 DERNIÈRE CHANCE',
        message: 'Vraiment TOUT supprimer ?',
        subtext: 'Toutes tes données seront perdues définitivement.',
        confirmText: 'Supprimer tout',
        cancelText: 'Annuler',
        danger: true
    });

    if (secondConfirm) {
        localStorage.removeItem('warriorTracker');
        updateUI();
        showPopup('Données réinitialisées.', 'success');
    }
}

// --- XP Display ---

function updateXPDisplay() {
    const xpData = getXPData();
    const fatigueData = getFatigueData();
    const xpLevelEl = document.getElementById('xpLevel');
    const xpAmountEl = document.getElementById('xpAmount');
    const xpBarFillEl = document.getElementById('xpBarFill');
    const xpTodayEl = document.getElementById('xpToday');
    const xpContainer = document.getElementById('xpBarContainer');
    const fatigueBadge = document.getElementById('xpFatigueBadge');

    if (xpLevelEl) xpLevelEl.textContent = `LVL ${xpData.level}`;
    if (xpAmountEl) xpAmountEl.textContent = `${xpData.xpInLevel} / ${xpData.xpNeeded} XP`;
    if (xpBarFillEl) xpBarFillEl.style.width = `${xpData.xpProgress}%`;
    if (xpTodayEl) xpTodayEl.textContent = `+${xpData.todayXP} XP aujourd'hui`;
    
    // Fatigue : barre grise + badge
    if (xpContainer) {
        if (fatigueData.isFatigued) {
            xpContainer.classList.add('fatigued');
            if (fatigueBadge) fatigueBadge.style.display = 'inline-block';
            if (xpTodayEl) xpTodayEl.textContent = `+${xpData.todayXP} XP (×0.5)`;
        } else {
            xpContainer.classList.remove('fatigued');
            if (fatigueBadge) fatigueBadge.style.display = 'none';
        }
    }
}

function toggleXPInfo() {
    const panel = document.getElementById('xpInfoPanel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

// --- Page Navigation ---

function showPage(page, event) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageElement = document.getElementById('page-' + page);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    if (page === 'stats') {
        updateStats();
        // Lazy-load analytics
        import('./ui/analytics.js').then(m => m.renderAnalytics('analyticsContainer')).catch(e => console.warn('Analytics load error:', e));
    } else if (page === 'motivation') {
        displayRandomQuote();
    } else if (page === 'profile') {
        // Lazy-load streak display
        import('./ui/streak-display.js').then(m => m.renderStreakDisplay('streakDisplay')).catch(e => console.warn('Streak display load error:', e));
        renderProfile();
        renderProfileGroups();
        renderThemeSelector();
    } else if (page === 'groups') {
        renderGroups();
    }
}

function showAppPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageElement = document.getElementById('page-' + pageName);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    const navItem = document.querySelector(`.nav-item[onclick*="'${pageName}'"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    const header = document.querySelector('.header');
    const bottomNav = document.querySelector('.bottom-nav');
    if (pageName === 'auth') {
        if (header) header.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
    } else {
        if (header) header.style.display = 'block';
        if (bottomNav) bottomNav.style.display = 'flex';
    }
}

// --- Wire up callbacks ---
setOnHabitsChanged(() => updateUI());
setOnRanksChanged(() => updateStats());
setOnLevelUp((newLevel) => checkNewThemeUnlocks(newLevel));
setShowValidateDayModal(() => showValidateDayModal());
window._onFilterChange = () => {
    updateUI();
    // After onboarding finishes: pseudo first, then guided tour
    if (!needsOnboarding()) {
        if (checkNeedsPseudo()) {
            setTimeout(() => showSetupPseudoModal(), 600);
        } else if (needsGuidedTour()) {
            setTimeout(() => startGuidedTour(), 600);
        }
    }
};

// --- Close modal on overlay click ---
document.getElementById('manageHabitsModal')?.addEventListener('click', function (e) {
    if (e.target === this) {
        closeManageHabitsModal();
    }
});

// --- Expose functions to window for onclick handlers in HTML ---
Object.assign(window, {
    // Auth
    showAuthTab, handleSignup, handleLogin, handleLogout, handleForgotPassword,
    handleDeleteAccount, closeDeleteAccountModal, confirmDeleteAccount,
    closeLogoutModal, confirmLogout,

    // Migration
    performMigration, skipMigration,

    // Navigation
    showPage,

    // Habits
    openManageHabitsModal, closeManageHabitsModal,
    toggleAddHabitForm, cancelAddHabit, saveNewHabit,
    setScheduleType, toggleDayOfWeek,
    updateHabit, updateHabitName, deleteHabit, moveHabit,
    setHabitScheduleType, toggleHabitDayOfWeek,
    toggleHabit,
    setHabitCategory, filterByCategory,

    // Date navigation
    changeDate,

    // Day validation
    showValidateDayModal, closeValidateDayModal, confirmValidateDay,

    // Stats & Ranks
    toggleRankEditMode, cancelRankEdit, saveRankSettings,
    resetRanksToDefault, onPaletteChange,

    // Calendar
    openCalendarModal, closeCalendarModal, changeCalendarMonth,

    // Theme
    toggleTheme,

    // Notifications
    toggleNotifications, updateNotificationTime,

    // Tutorial
    nextTutorialStep, prevTutorialStep, skipTutorial,
    completeTutorial, toggleDemoCheckbox, restartTutorial,

    // Badges
    toggleBadgesVisibility,

    // Profile
    openAvatarPicker, closeAvatarPicker, selectAvatar,
    openEditPseudoModal, closeEditPseudoModal, saveProfilePseudo,
    openEditBioModal, closeEditBioModal, saveProfileBio,
    saveSetupPseudo,

    // Data
    resetAllData,

    // PWA Install
    dismissInstallBanner, installApp,
    promptInstallFromSettings,

    // Share
    shareDay,

    // XP
    updateXPDisplay,
    toggleXPInfo,

    // Export
    exportDataCSV,

    // Celebration
    showCelebration, celebrateNewRank, celebrateNewBadge, showLevelUp,

    // Groups
    openCreateGroupModal, closeCreateGroupModal, createGroup,
    openJoinGroupModal, closeJoinGroupModal, joinGroup,
    openGroupDetail, closeGroupDetail, leaveGroup, deleteGroup, copyGroupCode,

    // QR Code
    showQRModal, closeQRModal, downloadQR,

    // Chat
    sendChatMessage, toggleRecording, cancelRecording, playAudio,
    handleTypingInput, showReactionPopup, selectReaction, toggleReaction,
    handleBubbleTouchStart, handleBubbleTouchEnd, handleBubbleTouchMove,
    setReplyTo, cancelReply, scrollToMessage, scrollChatToBottom,

    // Challenges
    openCreateChallengeModal, closeCreateChallengeModal, setChallengeDuration, createChallenge,
    renderChallenges, joinChallenge, leaveChallenge, openChallengeDetail,

    // Leaderboard
    switchGroupTab, renderLeaderboard,

    // Guided Tour
    startGuidedTour, resetGuidedTour, needsGuidedTour
});

// --- Language cycling (exposed on window) ---
window.cycleLang = function() {
    const lang = cycleLangFromModule();
    const btn = document.getElementById('langToggleBtn');
    const flags = { fr: '🇫🇷 FR', en: '🇬🇧 EN', es: '🇪🇸 ES' };
    if (btn) btn.textContent = flags[lang] || lang;
};

// --- SPLASH SCREEN ---
function hideSplash() {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => splash.remove(), 500);
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Nav bar tap animation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            item.classList.remove('nav-tapped');
            void item.offsetWidth;
            item.classList.add('nav-tapped');
        });
    });

    // Charger le thème immédiatement pour éviter un flash
    loadTheme();
    // Initialiser le système de récompenses (thèmes visuels)
    initRewards();

    // Apply i18n translations and set lang button
    applyTranslations();
    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) {
        const flags = { fr: '🇫🇷 FR', en: '🇬🇧 EN', es: '🇪🇸 ES' };
        langBtn.textContent = flags[getCurrentLang()] || getCurrentLang();
    }

    async function initializeApp() {
        await loadCustomHabits();
        loadRankSettings();
        renderRanks(false);
        updateUI();
        const savedData = getData();
        if (savedData.notificationsEnabled && Notification.permission === 'granted') {
            scheduleNotification();
        }
        document.querySelector('.header .quote').textContent = `"${getGreeting()}" - STAY HARD`;
        updateNotificationButton();
        loadNotificationTime();
    }

    // Gérer l'affichage initial
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Safety timeout: never stay stuck on splash
    setTimeout(hideSplash, 3000);

    if (!isFirebaseConfigured) {
        console.log("Mode localStorage seul activé.");
        document.getElementById('logoutItem').style.display = 'none';
        document.getElementById('deleteItem').style.display = 'none';

        showAppPage('today');
        initializeApp().then(() => {
            hideSplash();
            if (needsOnboarding()) {
                startOnboarding();
            } else if (checkNeedsPseudo()) {
                setTimeout(() => showSetupPseudoModal(), 500);
            } else if (needsGuidedTour()) {
                startGuidedTour();
            } else if (isFirstTimeUser()) {
                showTutorial();
            }
        });
    } else {
        showAppPage('auth');

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                appState.currentUser = user;
                console.log('✅ Utilisateur connecté:', user.email);

                try {
                    await db.collection('users').doc(user.uid).update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (error) {
                    console.warn('Erreur MAJ lastLogin:', error);
                }

                await loadThemeFromFirestore(user.uid);
                await loadProfileFromFirestore();

                checkLocalStorageMigration(user);

                document.getElementById('logoutItem').style.display = 'block';
                document.getElementById('deleteItem').style.display = 'block';
                showAppPage('today');
                await initializeApp();
                hideSplash();
                if (needsOnboarding()) {
                    startOnboarding();
                } else if (checkNeedsPseudo()) {
                    // Pseudo d'abord, tour guidé après
                    setTimeout(() => showSetupPseudoModal(), 500);
                } else if (needsGuidedTour()) {
                    startGuidedTour();
                } else if (isFirstTimeUser()) {
                    showTutorial();
                }
            } else {
                appState.currentUser = null;
                console.log('⚠️ Utilisateur non connecté');
                document.getElementById('logoutItem').style.display = 'none';
                document.getElementById('deleteItem').style.display = 'none';
                showAppPage('auth');
            }
        });
    }

    // --- Handle hash-based deep links (for manifest shortcuts & Siri) ---
    function handleHashNavigation() {
        const hash = window.location.hash;
        if (!hash) return;

        switch (hash) {
            case '#today':
                showPage('today');
                break;
            case '#stats':
                showPage('stats');
                break;
            case '#validate':
                showPage('today');
                setTimeout(() => {
                    if (typeof showValidateDayModal === 'function') {
                        showValidateDayModal();
                    }
                }, 600);
                break;
            case '#maxdemo':
                activateMaxDemo();
                break;
        }
        // Clean hash from URL without triggering navigation
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }

    // --- Max Demo Mode (secret URL #maxdemo) ---
    function activateMaxDemo() {
        const data = getData();

        // XP Level 50 max
        data.xp = {
            total: 50 * 51 * 50,
            level: 50,
            todayXP: 500,
            lastDate: getDateKey(new Date()),
            awardedHabits: [],
            dayValidated: ''
        };

        // 45 jours de données parfaites + streak
        const today = new Date();
        if (!data.days) data.days = {};
        if (!data.validatedDays) data.validatedDays = [];
        const allHabits = data.customHabits || [];
        for (let i = 1; i <= 45; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = getDateKey(d);
            if (!data.days[key]) data.days[key] = {};
            allHabits.forEach(h => { data.days[key][h.id] = true; });
            if (!data.validatedDays.includes(key)) data.validatedDays.push(key);
        }

        saveData(data);

        // Thème Galaxy
        localStorage.setItem('selectedRewardTheme', 'galaxy');

        // Onboarding + tour done
        localStorage.setItem('onboardingDone', 'true');
        localStorage.setItem('guidedTourDone', 'true');

        // Reload
        window.location.href = window.location.pathname;
    }

    // Listen for hash changes (in case user navigates while app is open)
    window.addEventListener('hashchange', handleHashNavigation);

    // Run on first load (deferred so app is initialized first)
    setTimeout(handleHashNavigation, 800);

    // Initialize PWA install banner
    initInstallBanner();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch((err) => {
            console.log('Échec de l\'enregistrement du Service Worker:', err);
        });
    }
});
