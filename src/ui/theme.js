// ============================================================
// SYSTÈME DE THÈMES — Dark mode uniquement
// ============================================================

import { appState } from '../services/state.js';
import { isFirebaseConfigured } from '../config/firebase.js';

// Force dark theme
export function loadTheme() {
    document.documentElement.removeAttribute('data-theme');
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#0A0A0A');
}

// Kept for compatibility — does nothing
export function toggleTheme() {}
export function updateThemeButton() {}

// Load from Firestore — just force dark
export async function loadThemeFromFirestore() {
    loadTheme();
}
