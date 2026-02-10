// ============================================================
// SYSTÈME DE RÉCOMPENSES VISUELLES (THÈMES DÉBLOQUABLES)
// ============================================================

import { getXPData } from '../core/xp.js';
import { showPopup } from './toast.js';

// Définition des thèmes débloquables
export const THEMES = [
    {
        id: 'default',
        name: 'Défaut',
        emoji: '⚪',
        level: 1,
        accent: '#F5F5F0',
        accentDim: '#D4D4CF',
        accentDark: '#A3A39E',
        accentGreen: '#19E639',
        description: 'Le thème original'
    },
    {
        id: 'neon',
        name: 'Néon',
        emoji: '💚',
        level: 5,
        accent: '#00FF88',
        accentDim: '#00CC6A',
        accentDark: '#009950',
        accentGreen: '#00FF88',
        description: 'Vert cyber futuriste'
    },
    {
        id: 'gold',
        name: 'Or',
        emoji: '🥇',
        level: 10,
        accent: '#FFD700',
        accentDim: '#CCAC00',
        accentDark: '#997F00',
        accentGreen: '#FFD700',
        description: 'Luxe doré'
    },
    {
        id: 'ruby',
        name: 'Rubis',
        emoji: '💎',
        level: 15,
        accent: '#FF1744',
        accentDim: '#CC1236',
        accentDark: '#990D29',
        accentGreen: '#FF1744',
        description: 'Rouge intense'
    },
    {
        id: 'diamond',
        name: 'Diamant',
        emoji: '🧊',
        level: 20,
        accent: '#00E5FF',
        accentDim: '#00B7CC',
        accentDark: '#008999',
        accentGreen: '#00E5FF',
        description: 'Bleu glacé'
    },
    {
        id: 'galaxy',
        name: 'Galaxy',
        emoji: '🌌',
        level: 30,
        accent: '#E040FB',
        accentDim: '#B333C9',
        accentDark: '#862697',
        accentGreen: '#E040FB',
        description: 'Violet cosmique'
    }
];

const STORAGE_KEY = 'fevrier_selected_theme';

// Récupère le thème sélectionné depuis localStorage
export function getSelectedThemeId() {
    return localStorage.getItem(STORAGE_KEY) || 'default';
}

// Sauvegarde le thème sélectionné
function saveSelectedTheme(themeId) {
    localStorage.setItem(STORAGE_KEY, themeId);
}

// Vérifie si un thème est débloqué
export function isThemeUnlocked(theme) {
    const xpData = getXPData();
    return xpData.level >= theme.level;
}

// Applique un thème via CSS custom properties
export function applyTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    // Ne pas appliquer si verrouillé
    if (!isThemeUnlocked(theme)) return;

    const root = document.documentElement;

    // On ne modifie les accents que si on est en thème sombre
    // En thème clair, les variables sont gérées par [data-theme="light"]
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light') {
        // En mode clair, on applique une version adaptée
        root.style.setProperty('--reward-accent', theme.accent);
        root.style.setProperty('--reward-accent-dim', theme.accentDim);
        root.style.setProperty('--reward-accent-dark', theme.accentDark);
        root.style.setProperty('--reward-accent-green', theme.accentGreen);
    } else {
        // Mode sombre : appliquer directement
        root.style.setProperty('--accent', theme.accent);
        root.style.setProperty('--accent-dim', theme.accentDim);
        root.style.setProperty('--accent-dark', theme.accentDark);
        root.style.setProperty('--accent-green', theme.accentGreen);
    }

    // Ajouter un data attribute pour CSS conditionnel
    root.setAttribute('data-reward-theme', themeId);
    saveSelectedTheme(themeId);
}

// Réinitialise les variables CSS aux valeurs par défaut
function resetThemeVars() {
    const root = document.documentElement;
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-dim');
    root.style.removeProperty('--accent-dark');
    root.style.removeProperty('--accent-green');
    root.style.removeProperty('--reward-accent');
    root.style.removeProperty('--reward-accent-dim');
    root.style.removeProperty('--reward-accent-dark');
    root.style.removeProperty('--reward-accent-green');
    root.removeAttribute('data-reward-theme');
}

// Sélectionne un thème
export function selectTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme || !isThemeUnlocked(theme)) return;

    if (themeId === 'default') {
        resetThemeVars();
        saveSelectedTheme('default');
        document.documentElement.setAttribute('data-reward-theme', 'default');
    } else {
        applyTheme(themeId);
    }

    renderThemeSelector();
}

// Rendu du sélecteur de thèmes dans le profil
export function renderThemeSelector() {
    const container = document.getElementById('themeRewardsContainer');
    if (!container) return;

    const selectedId = getSelectedThemeId();
    const xpData = getXPData();

    container.innerHTML = THEMES.map(theme => {
        const unlocked = xpData.level >= theme.level;
        const selected = theme.id === selectedId;

        return `
            <div class="reward-theme-card ${unlocked ? 'unlocked' : 'locked'} ${selected ? 'selected' : ''}"
                 onclick="${unlocked ? `window.selectRewardTheme('${theme.id}')` : ''}"
                 style="${unlocked ? '' : 'cursor: not-allowed;'}">
                <div class="reward-theme-preview" style="background: ${theme.accent}; ${!unlocked ? 'filter: grayscale(1) brightness(0.4);' : ''}">
                    <span class="reward-theme-emoji">${theme.emoji}</span>
                </div>
                <div class="reward-theme-info">
                    <div class="reward-theme-name">${unlocked ? '' : '🔒 '}${theme.name}</div>
                    <div class="reward-theme-desc">${unlocked ? theme.description : `Niveau ${theme.level} requis`}</div>
                </div>
                ${selected ? '<div class="reward-theme-check">✓</div>' : ''}
            </div>
        `;
    }).join('');
}

// Vérifie si de nouveaux thèmes sont débloqués après un level up
export function checkNewThemeUnlocks(newLevel) {
    const newlyUnlocked = THEMES.filter(t => t.level === newLevel);

    newlyUnlocked.forEach(theme => {
        setTimeout(() => {
            showPopup(`🎨 Nouveau thème débloqué : ${theme.emoji} ${theme.name} !`, 'success', 5000);
        }, 1500); // Délai pour ne pas chevaucher le toast de level up
    });

    // Mettre à jour le sélecteur si visible
    renderThemeSelector();
}

// Initialise le système de récompenses
export function initRewards() {
    const selectedId = getSelectedThemeId();
    if (selectedId && selectedId !== 'default') {
        applyTheme(selectedId);
    } else {
        document.documentElement.setAttribute('data-reward-theme', 'default');
    }

    // Exposer la fonction de sélection sur window
    window.selectRewardTheme = selectTheme;
}
