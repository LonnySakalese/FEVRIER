// ============================================================
// SYSTÈME DE THÈMES
// ============================================================

import { getData, saveData } from '../services/storage.js';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { appState } from '../services/state.js';
import { showPopup } from './toast.js';

// Charge le thème sauvegardé et l'applique
export function loadTheme() {
    const data = getData();
    const theme = data.theme || 'dark';
    applyTheme(theme, false);
}

// Applique un thème spécifique
export function applyTheme(theme, shouldSave = true) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#0A0A0A');
    }

    if (shouldSave) {
        const data = getData();
        data.theme = theme;
        saveData(data);

        if (isFirebaseConfigured && appState.currentUser) {
            syncThemeToFirestore(theme);
        }
    }

    updateThemeButton(theme);
}

// Synchronise le thème avec Firestore
export async function syncThemeToFirestore(theme) {
    if (!isFirebaseConfigured || !appState.currentUser) return;

    try {
        const userRef = firebase.firestore().collection('users').doc(appState.currentUser.uid);
        await userRef.set({ theme: theme }, { merge: true });
        console.log('✅ Thème synchronisé avec Firestore:', theme);
    } catch (error) {
        console.error('❌ Erreur lors de la synchronisation du thème:', error);
    }
}

// Charge le thème depuis Firestore
export async function loadThemeFromFirestore(userId) {
    if (!userId || !isFirebaseConfigured) return;

    try {
        const userRef = firebase.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.theme) {
                applyTheme(userData.theme, true);
                console.log('✅ Thème chargé depuis Firestore:', userData.theme);
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement du thème depuis Firestore:', error);
    }
}

// Bascule entre les thèmes clair et sombre
export function toggleTheme() {
    const data = getData();
    const currentTheme = data.theme || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    applyTheme(newTheme, true);

    const themeName = newTheme === 'light' ? 'clair' : 'sombre';
    showPopup(`🎨 Thème ${themeName} activé`, 'success');
}

// Met à jour le bouton de thème
export function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggleBtn');
    const icon = document.getElementById('themeToggleIcon');
    const text = document.getElementById('themeToggleText');

    if (btn && icon && text) {
        if (theme === 'light') {
            icon.textContent = '☀️';
            text.textContent = 'Clair';
        } else {
            icon.textContent = '🌙';
            text.textContent = 'Sombre';
        }
    }
}
