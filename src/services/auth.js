// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

import { setFirebaseMode, setCurrentUser } from './state.js';

const firebaseConfig = {
    apiKey: "AIzaSyAS0RofOjkTjaDjYhlLc1wISqCgozDOjNY",
    authDomain: "warrior-habit-tracker.firebaseapp.com",
    projectId: "warrior-habit-tracker",
    storageBucket: "warrior-habit-tracker.firebasestorage.app",
    messagingSenderId: "986537173596",
    appId: "1:986537173596:web:1ba2b4ec5e8991def47c99"
};

let auth;
let db;

export const initFirebase = () => {
    const isFirebaseConfigured = firebaseConfig.apiKey !== "VOTRE_API_KEY";
    setFirebaseMode(isFirebaseConfigured);

    if (isFirebaseConfigured) {
        try {
            const app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            console.log('✅ Firebase initialisé avec succès');
            return { auth, db };
        } catch (error) {
            console.error('❌ Erreur initialisation Firebase:', error);
        }
    } else {
        console.warn('⚠️ Firebase non configuré - mode localStorage uniquement');
    }
    return null;
};

export const listenToAuthChanges = () => {
    if (!auth) return;
    onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });
};
