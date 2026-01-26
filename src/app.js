// --- CONFIGURATION INITIALE ---

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

const Toast = (function() {
    let container = null;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    function init() {
        if (container) return;
        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('role', 'region');
        container.setAttribute('aria-label', 'Notifications');
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }

    function show(message, type = 'info', duration = 4000) {
        init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-atomic', 'true');

        const icon = document.createElement('span');
        icon.className = 'toast-icon';
        icon.textContent = icons[type] || icons.info;
        icon.setAttribute('aria-hidden', 'true');

        const content = document.createElement('div');
        content.className = 'toast-content';

        const msg = document.createElement('p');
        msg.className = 'toast-message';
        msg.textContent = message.replace(/^[✅❌⚠️🔔🔕🏆⚔️🔥📧🗑️💪]+\s*/g, '');

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.setAttribute('aria-label', 'Fermer la notification');
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => dismiss(toast);

        content.appendChild(msg);
        toast.appendChild(icon);
        toast.appendChild(content);
        toast.appendChild(closeBtn);

        container.appendChild(toast);

        // Focus management for accessibility
        closeBtn.focus();

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => dismiss(toast), duration);
        }

        return toast;
    }

    function dismiss(toast) {
        if (!toast || toast.classList.contains('toast-exit')) return;
        toast.classList.add('toast-exit');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 250);
    }

    function success(message, duration) {
        return show(message, 'success', duration);
    }

    function error(message, duration) {
        return show(message, 'error', duration);
    }

    function warning(message, duration) {
        return show(message, 'warning', duration);
    }

    function info(message, duration) {
        return show(message, 'info', duration);
    }

    return { show, success, error, warning, info, dismiss };
})();

// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// IMPORTANT : Remplacez ces valeurs par votre propre configuration Firebase
// Obtenez ces valeurs depuis Firebase Console > Project Settings > Your Apps
const firebaseConfig = {
    apiKey: "AIzaSyAS0RofOjkTjaDjYhlLc1wISqCgozDOjNY",
    authDomain: "warrior-habit-tracker.firebaseapp.com",
    projectId: "warrior-habit-tracker",
    storageBucket: "warrior-habit-tracker.firebasestorage.app",
    messagingSenderId: "986537173596",
    appId: "1:986537173596:web:1ba2b4ec5e8991def47c99"
};

// Initialiser Firebase uniquement si la config est valide
let auth, db;
const isFirebaseConfigured = firebaseConfig.apiKey !== "VOTRE_API_KEY";

if (isFirebaseConfigured && typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        // Activer la persistance offline
        db.enablePersistence()
            .catch((err) => {
                console.warn('Persistance offline non disponible:', err);
            });

        console.log('✅ Firebase initialisé avec succès');
    } catch (error) {
        console.error('❌ Erreur initialisation Firebase:', error);
    }
} else {
    console.warn('⚠️ Firebase non configuré - mode localStorage uniquement');
}

// State Management Global
const appState = {
    currentUser: null,
    isOnline: navigator.onLine,
    isFirebaseMode: isFirebaseConfigured
};

// Données initiales des habitudes
const habits = [
    { id: 'coldshower', name: 'DOUCHE FROIDE', icon: '🧊' },
    { id: 'reading', name: 'LECTURE (30 min)', icon: '📚' },
    { id: 'nutrition', name: 'NUTRITION CLEAN', icon: '🥗' },
    { id: 'sleep', name: 'SOMMEIL 8H+ (couché avant 22h)', icon: '😴' },
    { id: 'hydration', name: 'HYDRATATION 2L+', icon: '💧' },
    { id: 'wakeup', name: 'RÉVEIL 5H-6H', icon: '⏰' }
];

// Collection de citations de motivation
const quotes = [
    { text: "Je ne compte pas mes abdos. Je commence à compter seulement quand ça fait mal.", author: "Muhammad Ali" },
    { text: "La douleur que tu ressens aujourd'hui sera la force que tu ressentiras demain.", author: "Arnold Schwarzenegger" },
    { text: "Je ne suis pas le plus talentueux, ni le plus doué... mais personne ne travaillera plus dur que moi.", author: "Cristiano Ronaldo" },
    { text: "Qui va porter les bateaux ?!", author: "David Goggins" },
    { text: "Souffre maintenant et vis le reste de ta vie comme un champion.", author: "Muhammad Ali" },
    { text: "Quand tu penses avoir terminé, tu n'es qu'à 40% de ta capacité.", author: "David Goggins" },
    { text: "La seule personne que tu es destiné à devenir est celle que tu décides d'être.", author: "Ralph Waldo Emerson" },
    { text: "Le travail acharné bat le talent quand le talent ne travaille pas dur.", author: "Tim Notke" }
];

// ============================================================
// AUTHENTICATION FUNCTIONS
// ============================================================

// Basculer entre les onglets de connexion et d'inscription
function showAuthTab(tab) {
    // Gérer les onglets
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

// Gérer l'inscription
async function handleSignup() {
    if (!isFirebaseConfigured) {
        Toast.warning('Firebase n\'est pas configuré. Consultez la documentation pour configurer Firebase.');
        return;
    }

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const errorEl = document.getElementById('signup-error');

    errorEl.textContent = '';
    errorEl.classList.remove('show');

    // Validations
    if (!email || !password || !confirm) {
        errorEl.textContent = 'Tous les champs sont requis';
        errorEl.classList.add('show');
        return;
    }

    // Validation de l'email
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

        // Créer le profil utilisateur dans Firestore
        await createUserProfile(userCredential.user);

        // Vérifier si migration nécessaire
        checkLocalStorageMigration(userCredential.user);

    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        errorEl.textContent = getAuthErrorMessage(error.code);
        errorEl.classList.add('show');
    }
}

// Gérer la connexion
async function handleLogin() {
    if (!isFirebaseConfigured) {
        Toast.warning('Firebase n\'est pas configuré. Consultez la documentation pour configurer Firebase.');
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

    // Validation de l'email
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

// Gérer la déconnexion
async function handleLogout() {
    if (!isFirebaseConfigured) return;

    if (confirm('Veux-tu vraiment te déconnecter ?')) {
        try {
            await auth.signOut();
            console.log('✅ Déconnexion réussie');
        } catch (error) {
            console.error('❌ Erreur déconnexion:', error);
            Toast.error('Erreur lors de la déconnexion');
        }
    }
}

// Réinitialisation du mot de passe
async function handleForgotPassword() {
    if (!isFirebaseConfigured) return;

    const email = document.getElementById('login-email').value.trim();

    if (!email) {
        Toast.warning('Entre ton email pour réinitialiser ton mot de passe');
        return;
    }

    if (confirm(`Envoyer un email de réinitialisation à ${email} ?`)) {
        try {
            await auth.sendPasswordResetEmail(email);
            Toast.success('Email de réinitialisation envoyé ! Vérifie ta boîte mail (et les spams).');
            console.log('✅ Email de réinitialisation envoyé à:', email);
        } catch (error) {
            console.error('❌ Erreur réinitialisation:', error);
            const errorMessage = getAuthErrorMessage(error.code);
            Toast.error(errorMessage);
        }
    }
}

// Suppression du compte utilisateur
async function handleDeleteAccount() {
    if (!isFirebaseConfigured) return;

    const user = auth.currentUser;
    if (!user) {
        Toast.error('Tu dois être connecté pour supprimer ton compte');
        return;
    }

    // Triple confirmation pour éviter les suppressions accidentelles
    if (!confirm('⚠️ ES-TU SÛR de vouloir SUPPRIMER ton compte ?\n\n⚠️ ATTENTION : Cette action est IRRÉVERSIBLE !\n\n- Toutes tes données seront SUPPRIMÉES\n- Ton historique sera PERDU\n- Tes habitudes seront EFFACÉES\n\nTape "SUPPRIMER" pour confirmer')) {
        return;
    }

    const confirmation = prompt('⚠️ DERNIÈRE CHANCE !\n\nTape exactement "SUPPRIMER" (en majuscules) pour confirmer la suppression définitive de ton compte :');

    if (confirmation !== 'SUPPRIMER') {
        Toast.info('Suppression annulée. Ton compte est en sécurité.');
        return;
    }

    try {
        const userId = user.uid;

        // Supprimer toutes les données Firestore de l'utilisateur
        const batch = db.batch();

        // Supprimer les habitudes
        const habitsSnapshot = await db.collection('users').doc(userId).collection('habits').get();
        habitsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Supprimer les completions
        const completionsSnapshot = await db.collection('users').doc(userId).collection('completions').get();
        completionsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Supprimer les stats
        const statsSnapshot = await db.collection('users').doc(userId).collection('stats').get();
        statsSnapshot.forEach(doc => batch.delete(doc.ref));

        // Supprimer le document utilisateur
        batch.delete(db.collection('users').doc(userId));

        // Commit les suppressions
        await batch.commit();
        console.log('✅ Données Firestore supprimées');

        // Supprimer le compte Firebase Auth
        await user.delete();
        console.log('✅ Compte utilisateur supprimé');

        // Nettoyer le localStorage
        localStorage.removeItem('warriorTracker');

        Toast.success('Ton compte a été supprimé définitivement. Au revoir, WARRIOR !', 6000);

    } catch (error) {
        console.error('❌ Erreur suppression compte:', error);

        if (error.code === 'auth/requires-recent-login') {
            Toast.error('Pour des raisons de sécurité, tu dois te reconnecter avant de supprimer ton compte. Déconnecte-toi puis reconnecte-toi, et réessaie.', 6000);
        } else {
            Toast.error('Erreur lors de la suppression du compte : ' + error.message);
        }
    }
}

// Traduire les codes d'erreur Firebase en français
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

// Créer le profil utilisateur dans Firestore
async function createUserProfile(user) {
    const userRef = db.collection('users').doc(user.uid);

    await userRef.set({
        email: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Habitudes par défaut à créer
    const defaultHabits = [
        { id: 'coldshower', name: 'DOUCHE FROIDE', icon: '🧊' },
        { id: 'reading', name: 'LECTURE (30 min)', icon: '📚' },
        { id: 'nutrition', name: 'NUTRITION CLEAN', icon: '🥗' },
        { id: 'sleep', name: 'SOMMEIL 8H+ (couché avant 22h)', icon: '😴' },
        { id: 'hydration', name: 'HYDRATATION 2L+', icon: '💧' },
        { id: 'wakeup', name: 'RÉVEIL 5H-6H', icon: '⏰' }
    ];

    // Créer les habitudes par défaut dans Firestore
    const batch = db.batch();
    defaultHabits.forEach((habit, index) => {
        const habitRef = userRef.collection('habits').doc(habit.id);
        batch.set(habitRef, {
            name: habit.name,
            icon: habit.icon,
            color: '#F5F5F0', // Couleur par défaut
            order: index,
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    console.log('✅ Profil utilisateur créé avec 6 habitudes par défaut');
}

// Auth State Listener sera géré dans DOMContentLoaded

// Vérifier si migration localStorage nécessaire
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

// Afficher la modal de migration
function showMigrationModal(localData, user) {
    const modal = document.getElementById('migrationModal');
    const preview = document.getElementById('migrationPreview');

    const daysCount = Object.keys(localData.days || {}).length;

    // Calculer les jours parfaits
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

    // Stocker temporairement pour la migration
    window.pendingMigration = { localData, user };
}

// Effectuer la migration localStorage → Firestore
async function performMigration() {
    const { localData, user } = window.pendingMigration;

    try {
        console.log('🔄 Début de la migration...');

        // Migration des completions
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

                    // Firestore limite à 500 opérations par batch
                    if (batchCount >= 400) {
                        await batch.commit();
                        console.log(`✅ Migré ${batchCount} completions`);
                        batch = db.batch(); // Créer un nouveau batch
                        batchCount = 0;
                    }
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
            console.log(`✅ Migré ${batchCount} completions`);
        }

        // Migration des stats
        const statsRef = db.collection('users').doc(user.uid).collection('stats').doc('global');
        await statsRef.set({
            bestStreak: localData.stats?.bestStreak || 0,
            totalWins: 0,
            perfectDaysCount: 0,
            lastCalculated: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Migration des noms personnalisés
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

        // Supprimer les données locales après migration réussie
        localStorage.removeItem('warriorTracker');

        closeMigrationModal();
        Toast.success('Migration réussie ! Toutes tes données ont été transférées.');
        console.log('✅ Migration complète');

    } catch (error) {
        console.error('❌ Erreur de migration:', error);
        Toast.error('Erreur lors de la migration. Tes données locales sont conservées.');
    }
}

// Ignorer la migration
function skipMigration() {
    closeMigrationModal();

    // Demander si on veut supprimer les données locales
    if (confirm('Veux-tu supprimer les données locales ?')) {
        localStorage.removeItem('warriorTracker');
    }
}

// Fermer la modal de migration
function closeMigrationModal() {
    document.getElementById('migrationModal').classList.remove('active');
    window.pendingMigration = null;
}

// --- GESTION DE L'ÉTAT ---
let currentDate = new Date(); // La date actuellement affichée, initialisée à aujourd'hui
let weeklyChart, habitsChart; // Variables pour stocker les instances des graphiques

// Vérifie si une date est aujourd'hui
function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

// Détermine si on peut modifier les habitudes pour une date donnée (seulement aujourd'hui et non validé)
function canEditDate(date) {
    // Ne peut pas éditer si ce n'est pas aujourd'hui
    if (!isToday(date)) return false;

    // Ne peut pas éditer si le jour est déjà validé
    if (isDayValidated(date)) return false;

    return true;
}


// --- GESTION DU STOCKAGE LOCAL ---

// Crée une clé de date unique (YYYY-MM-DD) pour le stockage
function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Récupère toutes les données depuis le localStorage
function getData() {
    const data = localStorage.getItem('warriorTracker');
    return data ? JSON.parse(data) : { days: {}, stats: { bestStreak: 0 } };
}

// Sauvegarde les données dans le localStorage
function saveData(data) {
    localStorage.setItem('warriorTracker', JSON.stringify(data));
}

// Récupère les données d'un jour spécifique
function getDayData(date) {
    const data = getData();
    const key = getDateKey(date);
    return data.days[key] || {};
}

// Met à jour le statut (coché/décoché) d'une habitude pour aujourd'hui
function setHabitStatus(habitId, checked) {
    if (!canEditDate(currentDate)) { // Bloque la modification si ce n'est pas aujourd'hui
        return;
    }
    const data = getData();
    const key = getDateKey(currentDate);
    if (!data.days[key]) data.days[key] = {}; // Crée un objet pour le jour s'il n'existe pas
    data.days[key][habitId] = checked;
    saveData(data);
    updateUI(); // Met à jour l'interface utilisateur
}


// --- CALCULS ET LOGIQUE MÉTIER ---

// Calcule le score (en %) d'un jour donné
function getDayScore(date) {
    const dayData = getDayData(date);
    const completed = habits.filter(h => dayData[h.id]).length;
    return Math.round((completed / habits.length) * 100);
}

// Calcule la série (streak) de jours consécutifs avec un score >= 70%
function getStreak() {
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

// Compte le nombre total de jours parfaits (100% des habitudes complétées)
function getPerfectDays() {
    const data = getData();
    let count = 0;
    for (const key in data.days) {
        const dayData = data.days[key];
        const completed = habits.filter(h => dayData[h.id]).length;
        if (completed === habits.length) count++;
    }
    return count;
}

// Détermine le rang de l'utilisateur en fonction de son score moyen
function getRank(score) {
    if (score >= 86) return { name: 'LEGEND', color: '#F5F5F0' };
    if (score >= 71) return { name: 'ELITE', color: '#D4D4CF' };
    if (score >= 51) return { name: 'WARRIOR', color: '#A3A39E' };
    if (score >= 31) return { name: 'SOLDIER', color: '#7A7A75' };
    return { name: 'RECRUIT', color: '#5A5A55' };
}

// Calcule la série pour une habitude spécifique
function getHabitStreak(habitId) {
    let streak = 0;
    let date = new Date();
    date.setDate(date.getDate() - 1); // Commence hier

    while (true) {
        const dayData = getDayData(date);
        if (dayData[habitId]) {
            streak++;
            date.setDate(date.getDate() - 1);
        } else {
            break;
        }
    }
    if (getDayData(new Date())[habitId]) streak++; // Ajoute aujourd'hui
    return streak;
}

// Calcule le score moyen pour le mois en cours
function getMonthScore() {
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
function getTotalWins() {
    const data = getData();
    let wins = 0;
    for (const key in data.days) {
        const dayData = data.days[key];
        wins += habits.filter(h => dayData[h.id]).length;
    }
    return wins;
}

// Calcule le score moyen global sur tous les jours enregistrés
function getAvgScore() {
    const data = getData();
    const days = Object.keys(data.days);
    if (days.length === 0) return 0;
    let total = 0;
    days.forEach(key => {
        const dayData = data.days[key];
        const completed = habits.filter(h => dayData[h.id]).length;
        total += (completed / habits.length) * 100;
    });
    return Math.round(total / days.length);
}

// Récupère la meilleure série enregistrée
function getBestStreak() {
    const data = getData();
    return data.stats?.bestStreak || getStreak();
}

// --- MISE À JOUR DE L'INTERFACE UTILISATEUR (UI) ---

// Formate une date en chaîne de caractères (ex: "lun. 28 déc.")
function formatDate(date) {
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('fr-FR', options);
}

// Change la date affichée (jour précédent/suivant)
function changeDate(delta) {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (newDate > today) { // Empêche de naviguer dans le futur
        return;
    }
    currentDate = newDate;
    updateUI();
}

function getCustomHabitNames() {
    const data = getData();
    return data.customHabitNames || {};
}

function getHabitDisplayName(habit) {
    const customNames = getCustomHabitNames();
    return customNames[habit.id] || habit.name;
}

// Génère et affiche la liste des habitudes pour la date actuelle
function renderHabits() {
    const container = document.getElementById('habitsList');
    const dayData = getDayData(currentDate);
    const locked = !canEditDate(currentDate); // Verrouille si ce n'est pas aujourd'hui
    container.innerHTML = habits.map(habit => {
        const checked = dayData[habit.id] || false;
        const streak = getHabitStreak(habit.id);
        const monthData = getHabitMonthProgress(habit.id);
        const displayName = getHabitDisplayName(habit);
        const escapedId = habit.id.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const onclickAttr = locked ? '' : `onclick="toggleHabit('${escapedId}')"`;
        const streakText = locked ? '🔒 Verrouillé' : `🔥 Série: ${streak} jours`;
        return `
            <div class="habit-item ${locked ? 'locked' : ''}" ${onclickAttr}>
                <div class="habit-checkbox ${checked ? 'checked' : ''} ${locked ? 'locked' : ''}"></div>
                <div class="habit-info">
                    <div class="habit-name">${habit.icon} ${displayName}</div>
                    <div class="habit-streak">${streakText}</div>
                </div>
                <div class="habit-progress">
                    <div class="percent">${monthData}%</div>
                </div>
            </div>
        `;
    }).join('');
}

// Calcule le pourcentage de complétion d'une habitude pour le mois en cours
function getHabitMonthProgress(habitId) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dayOfMonth = now.getDate();

    let completed = 0;
    let totalDays = dayOfMonth; // Nombre de jours écoulés ce mois

    // Parcourir chaque jour du mois jusqu'à aujourd'hui
    for (let day = 1; day <= dayOfMonth; day++) {
        const d = new Date(year, month, day);
        const dayData = getDayData(d);
        if (dayData[habitId]) {
            completed++;
        }
    }

    return totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;
}

// Gère le clic sur une habitude pour la cocher/décocher
function toggleHabit(habitId) {
    const dayData = getDayData(currentDate);
    const newStatus = !dayData[habitId];
    setHabitStatus(habitId, newStatus);
    if (navigator.vibrate) { // Vibration pour le retour haptique
        navigator.vibrate(newStatus ? [30, 30, 30] : 20);
    }
    if (newStatus) {
        const completed = habits.filter(h => getDayData(currentDate)[h.id]).length;
        if (completed === habits.length) {
            triggerConfetti(); // Lance des confettis si toutes les habitudes sont complétées
        }
    }
}

// Déclenche une animation de confettis
function triggerConfetti() {
    const colors = ['#F5F5F0', '#D4D4CF', '#A3A39E'];
    const confettiCount = 50;
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed; width: 10px; height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}vw; top: -10px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            pointer-events: none; z-index: 9999;
            animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 4000);
    }
    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50, 50, 100]);
    }
}

// Met à jour les KPIs (score, streak, etc.) sur la page "Aujourd'hui"
function updateKPIs() {
    const dayData = getDayData(currentDate);
    const completed = habits.filter(h => dayData[h.id]).length;
    const score = getDayScore(currentDate);
    const locked = !canEditDate(currentDate);

    document.getElementById('dailyScore').textContent = score + '%';
    document.getElementById('currentStreak').textContent = getStreak();
    document.getElementById('perfectDays').textContent = getPerfectDays();
    document.getElementById('completedCount').textContent = locked ? '🔒 VERROUILLÉ' : `${completed}/${habits.length}`;
    document.getElementById('currentDate').textContent = formatDate(currentDate) + (locked ? ' 🔒' : '');

    // Met à jour la meilleure série si la série actuelle est plus longue
    const data = getData();
    const currentStreak = getStreak();
    if (currentStreak > (data.stats?.bestStreak || 0)) {
        data.stats = data.stats || {};
        data.stats.bestStreak = currentStreak;
        saveData(data);
    }
}

// Met à jour tous les éléments de la page "Stats"
function updateStats() {
    const avgScore = getAvgScore();
    const rank = getRank(avgScore);

    document.getElementById('rankName').textContent = rank.name;
    document.getElementById('rankName').style.color = rank.color;
    document.getElementById('rankProgress').style.width = avgScore + '%';
    document.getElementById('monthScore').textContent = getMonthScore() + '%';
    document.getElementById('bestStreak').textContent = getBestStreak();
    document.getElementById('totalWins').textContent = getTotalWins();
    document.getElementById('avgScore').textContent = avgScore + '%';

    renderWeeklyGrid();
    renderCharts();
}

// Génère et affiche la grille des scores de la semaine
function renderWeeklyGrid() {
    const container = document.getElementById('weeklyGrid');
    const today = new Date();
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    let html = '';
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const score = getDayScore(date);
        html += `
            <div class="weekly-day ${i === 0 ? 'today' : ''} ${score === 100 ? 'perfect' : ''}">
                <div class="day-name">${dayNames[date.getDay()]}</div>
                <div class="day-score">${score}%</div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// Génère et met à jour les graphiques
function renderCharts() {
    // Graphique de score hebdomadaire
    const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
    const weeklyData = [];
    const weeklyLabels = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        weeklyLabels.push(date.getDate() + '/' + (date.getMonth() + 1));
        weeklyData.push(getDayScore(date));
    }
    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(weeklyCtx, {
        type: 'line',
        data: {
            labels: weeklyLabels,
            datasets: [{
                data: weeklyData,
                borderColor: '#F5F5F0',
                backgroundColor: 'rgba(245, 245, 240, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 100, ticks: { color: '#A3A39E' }, grid: { color: '#2D2D2D' } }, x: { ticks: { color: '#A3A39E' }, grid: { color: '#2D2D2D' } } }
        }
    });

    // Graphique de performance par habitude
    const habitsCtx = document.getElementById('habitsChart').getContext('2d');
    const habitsData = habits.map(h => getHabitMonthProgress(h.id));
    if (habitsChart) habitsChart.destroy();
    habitsChart = new Chart(habitsCtx, {
        type: 'bar',
        data: {
            labels: habits.map(h => h.icon),
            datasets: [{
                data: habitsData,
                backgroundColor: habitsData.map(v => v >= 80 ? '#F5F5F0' : v >= 50 ? '#A3A39E' : '#5A5A55'),
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 100, ticks: { color: '#A3A39E' }, grid: { color: '#2D2D2D' } }, x: { ticks: { color: '#F5F5F0', font: { size: 16 } }, grid: { display: false } } }
        }
    });
}

        // Gère l'affichage des différentes pages (Aujourd'hui, Stats, Motivation)
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
            } else if (page === 'motivation') {
                const quote = quotes[Math.floor(Math.random() * quotes.length)];
                document.getElementById('dailyQuote').textContent = '"' + quote.text + '"';
                document.getElementById('quoteAuthor').textContent = '- ' + quote.author;
            }
        }

        // FONCTIONS BOUCHONS POUR LES FONCTIONNALITÉS NON IMPLEMENTÉES
        function openManageHabitsModal() { Toast.info('La gestion des habitudes est en cours de développement.'); }
        function closeManageHabitsModal() { console.log("closeManageHabitsModal called"); }
        function toggleAddHabitForm() { Toast.info('La gestion des habitudes est en cours de développement.'); }
        function cancelAddHabit() { console.log("cancelAddHabit called"); }
        function saveNewHabit() { Toast.info('La gestion des habitudes est en cours de développement.'); }
        function renderHabitsManagementList() { console.log("renderHabitsManagementList called"); }
        function setupIconPicker() { console.log("setupIconPicker called"); }
        function setupColorPicker() { console.log("setupColorPicker called"); }
        function resetAddHabitForm() { console.log("resetAddHabitForm called"); }
        function updateHabitName(id) { Toast.info('La gestion des habitudes est en cours de développement.'); }
        function deleteHabit(id) { Toast.info('La gestion des habitudes est en cours de développement.'); }
        function moveHabit(id, dir) { Toast.info('La gestion des habitudes est en cours de développement.'); }

// Réinitialise toutes les données de l'application après confirmation
function resetAllData() {
    if (confirm('Es-tu sûr de vouloir tout réinitialiser ? Cette action est irréversible !')) {
        if (confirm('DERNIÈRE CHANCE : Vraiment tout supprimer ?')) {
            localStorage.removeItem('warriorTracker');
            updateUI();
            Toast.success('Données réinitialisées. Nouveau départ WARRIOR !');
        }
    }
}

// Fonction principale de mise à jour de l'UI
function updateUI() {
    renderHabits();
    updateKPIs();
    updateValidateButton();
}

// --- ÉDITION DES HABITUDES ---

// ============================================================
// HABIT MANAGEMENT FUNCTIONS (Gestion dynamique des habitudes)
// ============================================================

// Variables globales pour la gestion des habitudes
let selectedIcon = '🎯';
let selectedColor = '#F5F5F0';

// Ouvrir la modal de gestion des habitudes
function openManageHabitsModal() {
    const modal = document.getElementById('manageHabitsModal');
    renderHabitsManagementList();
    modal.classList.add('active');

    // Reset formulaire d'ajout
    resetAddHabitForm();
}

// Fermer la modal de gestion
function closeManageHabitsModal() {
    document.getElementById('manageHabitsModal').classList.remove('active');
    resetAddHabitForm();
    updateUI(); // Rafraîchir l'affichage principal
}

// Afficher/masquer le formulaire d'ajout
function toggleAddHabitForm() {
    const section = document.getElementById('addHabitSection');
    const form = document.getElementById('addHabitForm');

    if (form.classList.contains('active')) {
        form.classList.remove('active');
        section.classList.add('collapsed');
    } else {
        form.classList.add('active');
        section.classList.remove('collapsed');
        setupIconPicker();
        setupColorPicker();
    }
}

// Configuration du sélecteur d'icônes
function setupIconPicker() {
    const iconOptions = document.querySelectorAll('#iconPicker .icon-option');
    iconOptions.forEach(option => {
        option.addEventListener('click', function() {
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedIcon = this.dataset.icon;
        });
    });

    // Sélectionner la première icône par défaut
    if (iconOptions.length > 0 && !document.querySelector('#iconPicker .icon-option.selected')) {
        iconOptions[0].classList.add('selected');
        selectedIcon = iconOptions[0].dataset.icon;
    }
}

// Configuration du sélecteur de couleurs
function setupColorPicker() {
    const colorOptions = document.querySelectorAll('#colorPicker .color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedColor = this.dataset.color;
        });
    });

    // Sélectionner la première couleur par défaut
    if (colorOptions.length > 0 && !document.querySelector('#colorPicker .color-option.selected')) {
        colorOptions[0].classList.add('selected');
        selectedColor = colorOptions[0].dataset.color;
    }
}

// Réinitialiser le formulaire d'ajout
function resetAddHabitForm() {
    const section = document.getElementById('addHabitSection');
    const form = document.getElementById('addHabitForm');

    form.classList.remove('active');
    section.classList.add('collapsed');
    document.getElementById('newHabitName').value = '';

    // Reset sélections
    document.querySelectorAll('#iconPicker .icon-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('#colorPicker .color-option').forEach(opt => opt.classList.remove('selected'));

    selectedIcon = '🎯';
    selectedColor = '#F5F5F0';
}

// Annuler l'ajout d'une habitude
function cancelAddHabit() {
    resetAddHabitForm();
}

// Sauvegarder une nouvelle habitude
function saveNewHabit() {
    const name = document.getElementById('newHabitName').value.trim().toUpperCase();

    if (!name) {
        Toast.warning('Le nom de l\'habitude est requis');
        return;
    }

    // Générer un ID unique
    const habitId = 'habit_' + Date.now();

    // Ajouter l'habitude au tableau
    const newHabit = {
        id: habitId,
        name: name,
        icon: selectedIcon,
        color: selectedColor
    };

    habits.push(newHabit);

    // Sauvegarder dans localStorage (ou Firestore si configuré)
    const data = getData();
    if (!data.customHabits) data.customHabits = [];
    data.customHabits.push(newHabit);
    saveData(data);

    // Feedback
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
    Toast.success(`Habitude "${name}" ajoutée avec succès !`);

    // Reset et refresh
    resetAddHabitForm();
    renderHabitsManagementList();
    updateUI();
}

// Afficher la liste des habitudes dans la modal
function renderHabitsManagementList() {
    const container = document.getElementById('habitsManagementList');

    if (habits.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--accent-dim); padding: 20px;">Aucune habitude. Ajoute-en une !</p>';
        return;
    }

    container.innerHTML = habits.map((habit, index) => {
        const color = habit.color || '#F5F5F0';
        const disabledUp = index === 0 ? 'disabled' : '';
        const disabledDown = index === habits.length - 1 ? 'disabled' : '';
        const escapedName = (habit.name || '').replace(/"/g, '&quot;');
        const escapedId = habit.id.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `
            <div class="habit-management-item" data-habit-id="${habit.id}">
                <div class="move-buttons">
                    <button class="move-btn" onclick="moveHabit('${escapedId}', -1)" ${disabledUp}>▲</button>
                    <button class="move-btn" onclick="moveHabit('${escapedId}', 1)" ${disabledDown}>▼</button>
                </div>
                <div class="habit-color-indicator" style="background: ${color};"></div>
                <div class="habit-icon-display">${habit.icon}</div>
                <input type="text" class="habit-name-input" id="name-${habit.id}" value="${escapedName}" placeholder="Nom de l'habitude">
                <div class="habit-actions">
                    <button class="habit-action-btn" onclick="updateHabitName('${escapedId}')">💾</button>
                    <button class="habit-action-btn delete" onclick="deleteHabit('${escapedId}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// Mettre à jour le nom d'une habitude
function updateHabitName(habitId) {
    const input = document.getElementById(`name-${habitId}`);
    const newName = input.value.trim().toUpperCase();

    if (!newName) {
        Toast.warning('Le nom ne peut pas être vide');
        return;
    }

    // Trouver l'habitude
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Mettre à jour le nom
    const originalName = habit.name;
    habit.name = newName;

    // Sauvegarder
    const data = getData();
    if (!data.customHabitNames) data.customHabitNames = {};

    // Si c'est une habitude par défaut
    const defaultHabit = [
        { id: 'coldshower', name: 'DOUCHE FROIDE' },
        { id: 'reading', name: 'LECTURE (30 min)' },
        { id: 'nutrition', name: 'NUTRITION CLEAN' },
        { id: 'sleep', name: 'SOMMEIL 8H+ (couché avant 22h)' },
        { id: 'hydration', name: 'HYDRATATION 2L+' },
        { id: 'wakeup', name: 'RÉVEIL 5H-6H' }
    ].find(h => h.id === habitId);

    if (defaultHabit) {
        data.customHabitNames[habitId] = newName;
    } else {
        // Habitude personnalisée
        if (!data.customHabits) data.customHabits = [];
        const customHabit = data.customHabits.find(h => h.id === habitId);
        if (customHabit) {
            customHabit.name = newName;
        }
    }

    saveData(data);

    // Feedback
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);

    renderHabitsManagementList();
    updateUI();
}

// Supprimer une habitude
function deleteHabit(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!confirm(`🗑️ Supprimer "${habit.name}" ?\n\nL'historique sera conservé mais l'habitude n'apparaîtra plus.`)) {
        return;
    }

    // Retirer du tableau
    const index = habits.findIndex(h => h.id === habitId);
    if (index > -1) {
        habits.splice(index, 1);
    }

    // Sauvegarder
    const data = getData();

    // Retirer des habitudes personnalisées
    if (data.customHabits) {
        data.customHabits = data.customHabits.filter(h => h.id !== habitId);
    }

    // Marquer comme supprimée (pour historique)
    if (!data.deletedHabits) data.deletedHabits = [];
    data.deletedHabits.push(habitId);

    saveData(data);

    // Feedback
    if (navigator.vibrate) navigator.vibrate(50);
    Toast.success(`Habitude "${habit.name}" supprimée`);

    renderHabitsManagementList();
    updateUI();
}

// Déplacer une habitude (haut/bas)
function moveHabit(habitId, direction) {
    const index = habits.findIndex(h => h.id === habitId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= habits.length) return;

    // Swap
    [habits[index], habits[newIndex]] = [habits[newIndex], habits[index]];

    // Sauvegarder l'ordre
    const data = getData();
    if (!data.habitOrder) data.habitOrder = [];
    data.habitOrder = habits.map(h => h.id);
    saveData(data);

    // Feedback
    if (navigator.vibrate) navigator.vibrate(20);

    renderHabitsManagementList();
    updateUI();
}

// Charger les habitudes depuis Firestore (pour utilisateurs connectés)
async function loadHabitsFromFirestore() {
    if (!isFirebaseConfigured || !appState.currentUser) return;

    try {
        const userId = appState.currentUser.uid;
        const habitsSnapshot = await db.collection('users').doc(userId).collection('habits').get();

        // Vider le tableau habits
        habits.length = 0;

        // Charger toutes les habitudes actives
        const loadedHabits = [];
        habitsSnapshot.forEach(doc => {
            const habitData = doc.data();
            if (habitData.isActive !== false) {
                loadedHabits.push({
                    id: doc.id,
                    name: habitData.name,
                    icon: habitData.icon,
                    color: habitData.color || '#F5F5F0'
                });
            }
        });

        // Trier par order
        loadedHabits.sort((a, b) => {
            const orderA = habitsSnapshot.docs.find(d => d.id === a.id)?.data().order || 0;
            const orderB = habitsSnapshot.docs.find(d => d.id === b.id)?.data().order || 0;
            return orderA - orderB;
        });

        // Ajouter au tableau habits
        loadedHabits.forEach(habit => habits.push(habit));

        console.log(`✅ ${habits.length} habitudes chargées depuis Firestore`);
    } catch (error) {
        console.error('❌ Erreur chargement habitudes Firestore:', error);
    }
}

// Charger les habitudes personnalisées au démarrage
async function loadCustomHabits() {
    // Si Firebase configuré et utilisateur connecté, charger depuis Firestore
    if (isFirebaseConfigured && appState.currentUser) {
        await loadHabitsFromFirestore();
        return;
    }

    // Sinon, charger depuis localStorage
    const data = getData();

    // Charger les noms personnalisés
    if (data.customHabitNames) {
        Object.entries(data.customHabitNames).forEach(([habitId, customName]) => {
            const habit = habits.find(h => h.id === habitId);
            if (habit) {
                habit.name = customName;
            }
        });
    }

    // Charger les habitudes personnalisées ajoutées
    if (data.customHabits && data.customHabits.length > 0) {
        data.customHabits.forEach(customHabit => {
            // Vérifier qu'elle n'existe pas déjà
            if (!habits.find(h => h.id === customHabit.id)) {
                // Vérifier qu'elle n'a pas été supprimée
                if (!data.deletedHabits || !data.deletedHabits.includes(customHabit.id)) {
                    habits.push(customHabit);
                }
            }
        });
    }

    // Restaurer l'ordre
    if (data.habitOrder && data.habitOrder.length > 0) {
        const orderedHabits = [];
        data.habitOrder.forEach(habitId => {
            const habit = habits.find(h => h.id === habitId);
            if (habit) {
                orderedHabits.push(habit);
            }
        });
        // Ajouter les habitudes qui ne sont pas dans l'ordre (nouvelles)
        habits.forEach(habit => {
            if (!orderedHabits.find(h => h.id === habit.id)) {
                orderedHabits.push(habit);
            }
        });
        // Remplacer le tableau
        habits.length = 0;
        habits.push(...orderedHabits);
    }
}

// Fermer la modale si on clique en dehors
document.getElementById('manageHabitsModal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeManageHabitsModal();
    }
});


// --- GESTION DES NOTIFICATIONS ---

// Demande la permission d'envoyer des notifications
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Notifications non supportées');
        return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
}

// Programme une notification quotidienne à l'heure configurée
function scheduleNotification() {
    const data = getData();
    const notifTime = data.notificationTime || '21:00'; // Par défaut 21h

    // Parser l'heure (format "HH:MM")
    const [hours, minutes] = notifTime.split(':').map(Number);

    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    if (now > target) { // Si l'heure est déjà passée, programmer pour demain
        target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();
    setTimeout(() => {
        sendNotification();
        scheduleNotification(); // Reprogramme pour le jour suivant
    }, delay);

    console.log(`⏰ Notification programmée dans ${Math.round(delay / 60000)} minutes (${notifTime})`);
}

// Envoie la notification avec un message personnalisé
function sendNotification() {
    if (Notification.permission !== 'granted') return;
    const dayData = getDayData(new Date());
    const completed = habits.filter(h => dayData[h.id]).length;
    const remaining = habits.length - completed;
    let title, body;
    if (remaining === 0) {
        title = "🏆 LÉGENDE !"; body = "Tu as complété toutes tes habitudes. STAY HARD!";
    } else if (remaining <= 2) {
        title = "⚔️ PRESQUE WARRIOR !"; body = `Plus que ${remaining} habitude${remaining > 1 ? 's' : ''} à valider. Tu peux le faire !`;
    } else {
        title = "🔥 RAPPEL WARRIOR"; body = `${remaining} habitudes restantes. Ne lâche rien !`;
    }
    const notification = new Notification(title, {
        body: body,
        icon: 'data:image/svg+xml,...', // (icône SVG)
        tag: 'warrior-reminder',
        renotify: true
    });
    notification.onclick = () => { window.focus(); notification.close(); };

    // Afficher automatiquement le popup de validation
    setTimeout(() => {
        showValidateDayModal();
    }, 2000); // Attendre 2 secondes pour laisser l'utilisateur voir la notification
}

// Active ou désactive les notifications via le bouton
function toggleNotifications() {
    const data = getData();
    if (data.notificationsEnabled) {
        data.notificationsEnabled = false;
        saveData(data);
        Toast.info('Notifications désactivées');
    } else {
        requestNotificationPermission().then(granted => {
            if (granted) {
                data.notificationsEnabled = true;
                saveData(data);
                scheduleNotification();
                const notifTime = data.notificationTime || '21:00';
                Toast.success(`Notifications activées ! Rappel à ${notifTime}.`);
            } else {
                Toast.error('Permission refusée.');
            }
        });
    }
    updateNotificationButton();
}

// Met à jour le texte du bouton de notifications
function updateNotificationButton() {
    const btn = document.getElementById('notifBtn');
    if (btn) {
        const data = getData();
        btn.textContent = data.notificationsEnabled ? '🔔 Notifications ON' : '🔕 Notifications OFF';
    }
}

// --- VALIDATION DE JOURNÉE ---

// Met à jour l'heure de notification personnalisée
function updateNotificationTime() {
    const timeInput = document.getElementById('notifTime');
    if (!timeInput) return;

    const time = timeInput.value; // Format: "HH:MM"
    const data = getData();
    data.notificationTime = time;
    saveData(data);

    console.log(`⏰ Heure de notification mise à jour: ${time}`);

    // Reprogrammer la notification si activée
    if (data.notificationsEnabled) {
        scheduleNotification();
    }

    // Feedback visuel
    if (navigator.vibrate) navigator.vibrate(50);
}

// Affiche le modal de validation de journée
function showValidateDayModal() {
    const modal = document.getElementById('validateDayModal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Ferme le modal de validation
function closeValidateDayModal() {
    const modal = document.getElementById('validateDayModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Confirme et valide la journée en cours
function confirmValidateDay() {
    const data = getData();
    const today = getDateKey(new Date());

    // Initialiser le tableau des jours validés si nécessaire
    if (!data.validatedDays) {
        data.validatedDays = [];
    }

    // Vérifier si déjà validé
    if (data.validatedDays.includes(today)) {
        closeValidateDayModal();
        Toast.info('Cette journée est déjà validée !');
        return;
    }

    // Ajouter le jour aux jours validés
    data.validatedDays.push(today);
    saveData(data);

    // Fermer le modal
    closeValidateDayModal();

    // Feedback
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
    Toast.success('Journée validée ! Bravo WARRIOR !', 5000);

    // Confettis si jour parfait
    const dayData = getDayData(new Date());
    const completed = habits.filter(h => dayData[h.id]).length;
    if (completed === habits.length && habits.length > 0) {
        triggerConfetti();
    }

    // Masquer le bouton de validation et mettre à jour l'UI
    updateValidateButton();
    renderHabits(); // Re-render pour verrouiller la journée
}

// Met à jour la visibilité du bouton de validation
function updateValidateButton() {
    const btn = document.getElementById('validateDayBtn');
    if (!btn) return;

    const today = getDateKey(new Date());
    const currentDateKey = getDateKey(currentDate);

    // Afficher uniquement si on visualise aujourd'hui
    if (currentDateKey !== today) {
        btn.style.display = 'none';
        return;
    }

    // Vérifier si déjà validé
    const data = getData();
    if (!data.validatedDays) data.validatedDays = [];

    if (data.validatedDays.includes(today)) {
        btn.style.display = 'none';
    } else {
        btn.style.display = 'block';
    }
}

// Vérifie si un jour est validé
function isDayValidated(date) {
    const data = getData();
    if (!data.validatedDays) return false;
    const dateKey = getDateKey(date);
    return data.validatedDays.includes(dateKey);
}

// Charge l'heure de notification configurée dans l'input
function loadNotificationTime() {
    const notifTimeInput = document.getElementById('notifTime');
    if (!notifTimeInput) return;

    const data = getData();
    const savedTime = data.notificationTime || '21:00';
    notifTimeInput.value = savedTime;
}

// --- DIVERS ---

// Affiche un message de bienvenue différent selon l'heure
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return "Debout tôt, GUERRIER !";
    if (hour < 12) return "Bonne matinée, WARRIOR !";
    if (hour < 18) return "Continue comme ça !";
    if (hour < 21) return "Finis en beauté !";
    return "Dernière ligne droite !";
}


// --- INITIALISATION DE L'APPLICATION ---
document.addEventListener('DOMContentLoaded', () => {

    async function initializeApp() {
        await loadCustomHabits();
        updateUI();
        const savedData = getData();
        if (savedData.notificationsEnabled && Notification.permission === 'granted') {
            scheduleNotification();
        }
        document.querySelector('.header .quote').textContent = `"${getGreeting()}" - STAY HARD`;
        updateNotificationButton();
        loadNotificationTime(); // Charger l'heure de notification configurée
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

        // Masquer header et navigation si on est sur la page auth
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

    // Gérer l'affichage initial
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    if (!isFirebaseConfigured) {
        console.log("Mode localStorage seul activé.");
        document.getElementById('logoutBtn').style.display = 'none';
        showAppPage('today');
        initializeApp();
    } else {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                appState.currentUser = user;
                console.log('✅ Utilisateur connecté:', user.email);

                // Mettre à jour lastLogin
                try {
                    await db.collection('users').doc(user.uid).update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (error) {
                    console.warn('Erreur MAJ lastLogin:', error);
                }

                // Vérifier s'il faut migrer les données localStorage
                checkLocalStorageMigration(user);

                document.getElementById('logoutBtn').style.display = 'block';
                document.getElementById('deleteAccountBtn').style.display = 'block';
                showAppPage('today');
                await initializeApp();
            } else {
                appState.currentUser = null;
                console.log('⚠️ Utilisateur non connecté');
                document.getElementById('logoutBtn').style.display = 'none';
                document.getElementById('deleteAccountBtn').style.display = 'none';
                showAppPage('auth');
            }
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch((err) => {
            console.log('Échec de l\'enregistrement du Service Worker:', err);
        });
    }
});
