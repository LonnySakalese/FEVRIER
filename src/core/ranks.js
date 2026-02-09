// ============================================================
// SYSTÈME DE RANGS PERSONNALISABLES
// ============================================================

import { getData, saveData } from '../services/storage.js';
import { showPopup } from '../ui/toast.js';
import { ConfirmModal } from '../ui/modals.js';

// State
export let rankSettings = [];
export let isRankEditMode = false;
let rankSettingsBackup = [];
export let selectedPaletteId = 'samourai';
let selectedPaletteIdBackup = 'samourai';

// Callback for when ranks change (set by app.js to trigger updateStats)
let _onRanksChanged = null;
export function setOnRanksChanged(callback) { _onRanksChanged = callback; }

// Les 7 palettes de couleurs prédéfinies
export const colorPalettes = [
    {
        id: 'monochrome',
        name: 'Thème Principal',
        colors: ['#4A4A45', '#6A6A65', '#9A9A95', '#C5C5C0', '#F5F5F0']
    },
    {
        id: 'or-bronze',
        name: 'Or & Bronze',
        colors: ['#8B5A2B', '#CD853F', '#C0C0C0', '#DAA520', '#FFD700']
    },
    {
        id: 'feu-glace',
        name: 'Feu & Glace',
        colors: ['#5B7C99', '#48D1CC', '#BFFF00', '#FF6B35', '#FF2D2D']
    },
    {
        id: 'neon',
        name: 'Néon Cyberpunk',
        colors: ['#5C4B8A', '#00D4FF', '#39FF14', '#FFFF00', '#FF00FF']
    },
    {
        id: 'nature',
        name: 'Nature & Terre',
        colors: ['#6B4423', '#8B9A6B', '#228B22', '#87CEEB', '#FFB347']
    },
    {
        id: 'pastel',
        name: 'Minimaliste Pastel',
        colors: ['#A8D8EA', '#AA96DA', '#FCBAD3', '#FF9AA2', '#FFDAC1']
    },
    {
        id: 'samourai',
        name: 'Guerrier Samouraï',
        colors: ['#2C2C2C', '#4B5D67', '#8B0000', '#D4AF37', '#FFFAF0']
    }
];

// Charge les rangs par défaut avec la palette sélectionnée
export function loadDefaultRanks() {
    const palette = colorPalettes.find(p => p.id === selectedPaletteId) || colorPalettes[6];
    return [
        { id: 'debutant', name: 'DÉBUTANT', minScore: 0, color: palette.colors[0] },
        { id: 'apprenti', name: 'APPRENTI', minScore: 31, color: palette.colors[1] },
        { id: 'confirme', name: 'CONFIRMÉ', minScore: 51, color: palette.colors[2] },
        { id: 'expert', name: 'EXPERT', minScore: 71, color: palette.colors[3] },
        { id: 'maitre', name: 'MAÎTRE', minScore: 86, color: palette.colors[4], isTop: true }
    ];
}

// Applique une palette de couleurs aux rangs
export function applyPaletteToRanks(paletteId) {
    const palette = colorPalettes.find(p => p.id === paletteId);
    if (!palette) return;

    selectedPaletteId = paletteId;
    rankSettings.forEach((rank, index) => {
        if (index < palette.colors.length) {
            rank.color = palette.colors[index];
        }
    });
}

// Charge les paramètres de rangs depuis le stockage
export function loadRankSettings() {
    const data = getData();
    if (data.rankSettings && Array.isArray(data.rankSettings) && data.rankSettings.length > 0) {
        rankSettings.length = 0;
        data.rankSettings.forEach(r => rankSettings.push(r));
        selectedPaletteId = data.selectedPaletteId || 'samourai';
        console.log('✅ Rangs personnalisés chargés:', rankSettings.length);
    } else {
        const defaults = loadDefaultRanks();
        rankSettings.length = 0;
        defaults.forEach(r => rankSettings.push(r));
        console.log('📋 Rangs par défaut chargés');
    }
    rankSettings.sort((a, b) => a.minScore - b.minScore);
}

// Sauvegarde les paramètres de rangs
export function saveRankSettingsToStorage() {
    const data = getData();
    data.rankSettings = rankSettings;
    data.selectedPaletteId = selectedPaletteId;
    saveData(data);
    console.log('💾 Rangs sauvegardés');
}

// Calcule la plage de score pour un rang donné
export function getRankScoreRange(index) {
    const rank = rankSettings[index];
    const nextRank = rankSettings[index + 1];
    const minScore = rank.minScore;
    const maxScore = nextRank ? nextRank.minScore - 1 : 100;
    return { min: minScore, max: maxScore };
}

// Détermine le rang de l'utilisateur en fonction de son score moyen
export function getRank(score) {
    if (rankSettings.length === 0) {
        loadRankSettings();
    }

    for (let i = rankSettings.length - 1; i >= 0; i--) {
        if (score >= rankSettings[i].minScore) {
            return {
                name: rankSettings[i].name,
                color: rankSettings[i].color
            };
        }
    }

    if (rankSettings.length > 0) {
        return {
            name: rankSettings[0].name,
            color: rankSettings[0].color
        };
    }

    return { name: 'DÉBUTANT', color: '#5A5A55' };
}

// Génère l'aperçu d'une palette
export function renderPalettePreview(palette) {
    return palette.colors.map(color =>
        `<span class="palette-color-dot" style="background: ${color};"></span>`
    ).join('');
}

// Rendu dynamique de la liste des rangs
export function renderRanks(isEditing = false) {
    const container = document.getElementById('ranksContainer');
    if (!container) return;

    if (rankSettings.length === 0) {
        loadRankSettings();
    }

    let html = '';

    if (isEditing) {
        html += `
            <div class="palette-selector">
                <div class="palette-selector-header">
                    <span class="palette-icon">🎨</span>
                    <span class="palette-label">PALETTE DE COULEURS</span>
                </div>
                <div class="palette-grid" id="paletteGrid">
                    ${colorPalettes.map(palette => `
                        <div class="palette-card ${palette.id === selectedPaletteId ? 'selected' : ''}"
                             onclick="onPaletteChange('${palette.id}')"
                             data-palette-id="${palette.id}">
                            <div class="palette-card-colors">
                                ${palette.colors.map(color => `
                                    <span class="palette-card-dot" style="background: ${color};"></span>
                                `).join('')}
                            </div>
                            <div class="palette-card-name">${palette.name}</div>
                            ${palette.id === 'samourai' ? '<span class="palette-recommended">★</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    rankSettings.forEach((rank, index) => {
        const range = getRankScoreRange(index);
        const isTopRank = rank.isTop || index === rankSettings.length - 1;

        if (isEditing) {
            html += `
                <div class="stat-card rank-edit-card" style="margin-bottom: 10px; border-color: ${rank.color};">
                    <div class="rank-edit-row">
                        <span class="rank-color-preview" style="background: ${rank.color};"></span>
                        <input type="text"
                            class="rank-name-input"
                            value="${rank.name}"
                            data-rank-id="${rank.id}"
                            data-field="name"
                            placeholder="Nom du rang"
                            style="color: ${rank.color}; border-color: ${rank.color};">
                        <div class="rank-score-fixed" style="color: ${rank.color};">
                            ${range.min}-${range.max}%
                        </div>
                    </div>
                </div>
            `;
        } else {
            const bgStyle = isTopRank ? `background: ${rank.color};` : '';
            const textColor = isTopRank ? 'var(--black)' : rank.color;

            html += `
                <div class="stat-card" style="margin-bottom: 10px; border-color: ${rank.color}; ${bgStyle}">
                    <div style="color: ${textColor}; font-weight: bold;">${rank.name}</div>
                    <div style="color: ${textColor}; font-size: 0.7rem;">${range.min}-${range.max}%</div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
}

// Gère le changement de palette
export function onPaletteChange(paletteId) {
    applyPaletteToRanks(paletteId);

    document.querySelectorAll('.palette-card').forEach(card => {
        if (card.dataset.paletteId === paletteId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    renderRanks(true);

    if (navigator.vibrate) navigator.vibrate(20);
}

// Active/désactive le mode édition des rangs
export function toggleRankEditMode() {
    isRankEditMode = !isRankEditMode;

    const editBtn = document.getElementById('editRanksBtn');
    const editButtons = document.getElementById('rankEditButtons');

    if (isRankEditMode) {
        rankSettingsBackup = JSON.parse(JSON.stringify(rankSettings));
        selectedPaletteIdBackup = selectedPaletteId;
        editBtn.textContent = '🔒';
        editBtn.title = 'Mode édition actif';
        editButtons.style.display = 'flex';
        renderRanks(true);
    } else {
        editBtn.textContent = '✏️';
        editBtn.title = 'Modifier les rangs';
        editButtons.style.display = 'none';
        renderRanks(false);
    }
}

// Annule l'édition des rangs
export function cancelRankEdit() {
    rankSettings.length = 0;
    JSON.parse(JSON.stringify(rankSettingsBackup)).forEach(r => rankSettings.push(r));
    selectedPaletteId = selectedPaletteIdBackup;
    isRankEditMode = false;

    const editBtn = document.getElementById('editRanksBtn');
    const editButtons = document.getElementById('rankEditButtons');

    editBtn.textContent = '✏️';
    editButtons.style.display = 'none';
    renderRanks(false);

    showPopup('Modifications annulées', 'info');
}

// Sauvegarde les paramètres de rangs depuis les inputs
export function saveRankSettings() {
    const nameInputs = document.querySelectorAll('.rank-name-input');

    let hasError = false;

    const palette = colorPalettes.find(p => p.id === selectedPaletteId);

    nameInputs.forEach((input, index) => {
        const name = input.value.trim().toUpperCase();

        if (!name) {
            showPopup(`Le nom du rang ${index + 1} est requis`, 'warning');
            hasError = true;
            return;
        }

        rankSettings[index].name = name;
        rankSettings[index].color = palette ? palette.colors[index] : rankSettings[index].color;
    });

    if (hasError) return;

    if (rankSettings.length > 0) {
        rankSettings.forEach((r, i) => r.isTop = (i === rankSettings.length - 1));
    }

    saveRankSettingsToStorage();

    isRankEditMode = false;
    const editBtn = document.getElementById('editRanksBtn');
    const editButtons = document.getElementById('rankEditButtons');

    editBtn.textContent = '✏️';
    editButtons.style.display = 'none';
    renderRanks(false);

    // Trigger stats update via callback (avoids circular dependency)
    if (_onRanksChanged) _onRanksChanged();

    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
    showPopup('Rangs personnalisés sauvegardés !', 'success');
}

// Réinitialiser les rangs par défaut
export async function resetRanksToDefault() {
    const confirmed = await ConfirmModal.show({
        title: '🔄 RÉINITIALISER LES RANGS',
        message: 'Remettre les rangs par défaut ?',
        confirmText: 'Réinitialiser',
        cancelText: 'Annuler'
    });

    if (confirmed) {
        const defaults = loadDefaultRanks();
        rankSettings.length = 0;
        defaults.forEach(r => rankSettings.push(r));
        saveRankSettingsToStorage();
        renderRanks(false);
        if (_onRanksChanged) _onRanksChanged();
        showPopup('Rangs réinitialisés', 'success');
    }
}
