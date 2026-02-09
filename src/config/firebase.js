// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// Firebase SDK is loaded via CDN in index.html (compat mode)
// The global `firebase` object is available from the CDN scripts

const firebaseConfig = {
    apiKey: "AIzaSyAS0RofOjkTjaDjYhlLc1wISqCgozDOjNY",
    authDomain: "warrior-habit-tracker.firebaseapp.com",
    projectId: "warrior-habit-tracker",
    storageBucket: "warrior-habit-tracker.firebasestorage.app",
    messagingSenderId: "986537173596",
    appId: "1:986537173596:web:1ba2b4ec5e8991def47c99"
};

let auth = null;
let db = null;
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

export { auth, db, isFirebaseConfigured };
