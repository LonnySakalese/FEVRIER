// ============================================================
// SYSTÈME DE THÈMES
// ============================================================

import { getData, saveData } from '../services/storage.js';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { appState } from '../services/state.js';
import { showPopup } from './toast.js';

// Listener pour le mode auto
let autoThemeListener = null;

// Charge le thème sauvegardé et l'applique
export function loadTheme() {
    const mode = localStorage.getItem('warriorThemeMode') || null;
    if (mode === 'auto') {
        applyAutoTheme(false);
        setupAutoListener();
    } else {
        const data = getData();
        const theme = data.theme || 'dark';
        applyTheme(theme, false);
    }
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

        // Save mode if not already set
        const currentMode = localStorage.getItem('warriorThemeMode');
        if (!currentMode || (currentMode !== 'auto')) {
            localStorage.setItem('warriorThemeMode', theme);
        }

        if (isFirebaseConfigured && appState.currentUser) {
            syncThemeToFirestore(theme);
        }
    }

    // Don't override 'auto' label
    const mode = localStorage.getItem('warriorThemeMode');
    updateThemeButton(mode === 'auto' ? 'auto' : theme);
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

// Bascule entre les thèmes : Sombre → Clair → Auto
export function toggleTheme() {
    const currentMode = localStorage.getItem('warriorThemeMode') || 'dark';
    let newMode;

    if (currentMode === 'dark') {
        newMode = 'light';
    } else if (currentMode === 'light') {
        newMode = 'auto';
    } else {
        newMode = 'dark';
    }

    localStorage.setItem('warriorThemeMode', newMode);

    // Remove old auto listener
    removeAutoListener();

    if (newMode === 'auto') {
        applyAutoTheme(true);
        setupAutoListener();
        showPopup('🎨 Thème automatique activé', 'success');
    } else {
        applyTheme(newMode, true);
        const themeName = newMode === 'light' ? 'clair' : 'sombre';
        showPopup(`🎨 Thème ${themeName} activé`, 'success');
    }
}

// Applique le thème selon les préférences système
function applyAutoTheme(shouldSave) {
    const preferLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = preferLight ? 'light' : 'dark';
    applyTheme(theme, shouldSave);
    updateThemeButton('auto');
}

// Écoute les changements de préférence système
function setupAutoListener() {
    removeAutoListener();
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    autoThemeListener = (e) => {
        const mode = localStorage.getItem('warriorThemeMode');
        if (mode === 'auto') {
            const theme = e.matches ? 'light' : 'dark';
            applyTheme(theme, true);
            updateThemeButton('auto');
        }
    };
    mq.addEventListener('change', autoThemeListener);
}

function removeAutoListener() {
    if (autoThemeListener) {
        window.matchMedia('(prefers-color-scheme: light)').removeEventListener('change', autoThemeListener);
        autoThemeListener = null;
    }
}

// Met à jour le bouton de thème
export function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggleBtn');
    const icon = document.getElementById('themeToggleIcon');
    const text = document.getElementById('themeToggleText');

    if (btn && icon && text) {
        if (theme === 'auto') {
            icon.textContent = '🔄';
            text.textContent = 'Auto';
        } else if (theme === 'light') {
            icon.textContent = '☀️';
            text.textContent = 'Clair';
        } else {
            icon.textContent = '🌙';
            text.textContent = 'Sombre';
        }
    }
}
