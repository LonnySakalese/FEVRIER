// ============================================================
// GUIDED TOUR - Tour guidé interactif pour les nouveaux utilisateurs
// ============================================================

/**
 * Définition des étapes du tour
 * Chaque étape cible un élément DOM et affiche un tooltip explicatif
 */
const TOUR_STEPS = [
    {
        selector: '.date-nav',
        title: '📅 Navigation',
        text: 'Voici ta date du jour. Tu peux naviguer avec les flèches ◀ ▶',
        position: 'bottom'
    },
    {
        selector: '#xpBarContainer',
        title: '⚡ Barre d\'XP',
        text: 'Ta barre d\'expérience. Gagne de l\'XP en validant tes habitudes dans les 24h !',
        position: 'bottom'
    },
    {
        selector: '.kpi-container',
        title: '📊 Indicateurs',
        text: 'Tes indicateurs clés : score du jour, série en cours, jours parfaits',
        position: 'bottom'
    },
    {
        selector: '#habitsList',
        title: '🎯 Habitudes',
        text: 'Tes habitudes du jour. Tape pour cocher ✅',
        position: 'bottom'
    },
    {
        selector: '.habit-item',
        title: '📋 Détail habitude',
        text: 'Chaque habitude montre ta série et ta progression mensuelle',
        position: 'bottom'
    },
    {
        selector: '#validateDayBtn',
        fallbackSelector: '.validate-day-btn',
        title: '✅ Validation',
        text: 'Valide ta journée pour gagner de l\'XP ! Tu as 24h.',
        position: 'top',
        prepare: () => {
            const btn = document.getElementById('validateDayBtn');
            if (btn) btn.style.display = 'block';
        }
    },
    {
        selector: '.share-day-btn',
        title: '📤 Partage',
        text: 'Partage ton score du jour en image 📸',
        position: 'top'
    },
    {
        selector: '.nav-item[aria-label="Statistiques"]',
        title: '📊 Stats',
        text: 'Consulte tes statistiques détaillées ici 📊',
        position: 'top',
        page: 'today'
    },
    {
        selector: '.nav-item[aria-label="Informations et motivation"]',
        title: '🔥 Infos',
        text: 'Citations motivantes et système de rangs 🔥',
        position: 'top',
        page: 'today'
    },
    {
        selector: '.nav-item[aria-label="Profil"]',
        title: '👤 Profil',
        text: 'Ton profil : avatar, pseudo, streaks, thèmes débloqués 👤',
        position: 'top',
        page: 'today'
    },
    {
        selector: '.nav-item[aria-label="Groupes"]',
        title: '👥 Groupes',
        text: 'Rejoins ou crée des groupes pour te motiver en équipe ! 👥',
        position: 'top',
        page: 'today'
    },
    {
        selector: '.add-habit-toggle',
        fallbackSelector: '#addHabitSection',
        title: '➕ Ajouter',
        text: 'Ajoute de nouvelles habitudes quand tu veux ➕',
        position: 'bottom',
        page: 'motivation',
        prepare: () => {
            if (typeof window.showPage === 'function') {
                window.showPage('motivation', null);
            }
            setTimeout(() => {
                const btn = document.querySelector('.settings-btn.primary[onclick*="openManageHabitsModal"]');
                if (btn) btn.click();
            }, 300);
        }
    },
    {
        selector: '#themeToggleBtn',
        title: '🎨 Thème',
        text: 'Change le thème clair/sombre/auto 🎨',
        position: 'bottom',
        page: 'motivation',
        prepare: () => {
            // Close manage habits modal if open
            if (typeof window.closeManageHabitsModal === 'function') {
                window.closeManageHabitsModal();
            }
            if (typeof window.showPage === 'function') {
                window.showPage('motivation', null);
            }
        }
    },
    {
        // Dernier écran : overlay final
        selector: null,
        isFinal: true,
        title: 'Tu es prêt ! 🔥',
        text: 'Commence par cocher ta première habitude.',
        position: 'center'
    }
];

let currentStepIndex = 0;
let overlayEl = null;
let tooltipEl = null;
let isActive = false;

/**
 * Vérifie si le tour guidé est nécessaire
 */
export function needsGuidedTour() {
    return localStorage.getItem('guidedTourDone') !== 'true';
}

/**
 * Lance le tour guidé
 */
export function startGuidedTour() {
    if (!needsGuidedTour()) return;
    if (isActive) return;

    isActive = true;
    currentStepIndex = 0;

    // Navigate to today page first
    if (typeof window.showPage === 'function') {
        window.showPage('today', null);
    }

    createOverlay();
    createTooltip();

    // Petit délai pour laisser le DOM se mettre à jour
    setTimeout(() => showStep(0), 400);
}

/**
 * Crée l'overlay sombre avec cutout
 */
function createOverlay() {
    if (overlayEl) overlayEl.remove();

    overlayEl = document.createElement('div');
    overlayEl.className = 'gt-overlay';
    overlayEl.id = 'guidedTourOverlay';
    document.body.appendChild(overlayEl);

    // Click sur l'overlay (en dehors du tooltip) = rien (ne pas fermer)
    overlayEl.addEventListener('click', (e) => {
        if (e.target === overlayEl) {
            // Ne rien faire — l'user doit utiliser les boutons
        }
    });
}

/**
 * Crée le tooltip
 */
function createTooltip() {
    if (tooltipEl) tooltipEl.remove();

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'gt-tooltip';
    tooltipEl.id = 'guidedTourTooltip';
    document.body.appendChild(tooltipEl);
}

/**
 * Affiche une étape du tour
 */
function showStep(index) {
    if (index < 0 || index >= TOUR_STEPS.length) {
        endTour();
        return;
    }

    currentStepIndex = index;
    const step = TOUR_STEPS[index];

    // Préparation si nécessaire (navigation, etc.)
    if (step.prepare) {
        step.prepare();
        // Attendre un peu pour que la navigation / DOM se mette à jour
        setTimeout(() => renderStep(step, index), 500);
    } else if (step.page) {
        // Navigation simple vers une page
        if (step.page === 'today') {
            // Pour les éléments de nav, on reste sur today
        }
        setTimeout(() => renderStep(step, index), 100);
    } else {
        renderStep(step, index);
    }
}

/**
 * Rend une étape (spotlight + tooltip)
 */
function renderStep(step, index) {
    const totalSteps = TOUR_STEPS.length;

    // Cas spécial : écran final
    if (step.isFinal) {
        renderFinalStep(step, index, totalSteps);
        return;
    }

    // Trouver l'élément cible
    let targetEl = document.querySelector(step.selector);
    if (!targetEl && step.fallbackSelector) {
        targetEl = document.querySelector(step.fallbackSelector);
    }

    if (!targetEl) {
        // Skip cette étape si l'élément n'existe pas
        console.warn(`[GuidedTour] Élément introuvable: ${step.selector}, skip`);
        nextStep();
        return;
    }

    // Scroll vers l'élément si pas visible
    scrollToElement(targetEl);

    // Attendre le scroll puis positionner
    setTimeout(() => {
        // Appliquer le spotlight
        highlightElement(targetEl);

        // Calculer position et afficher tooltip
        positionTooltip(targetEl, step, index, totalSteps);

        // Animation d'entrée
        tooltipEl.classList.remove('gt-tooltip-enter');
        void tooltipEl.offsetWidth; // force reflow
        tooltipEl.classList.add('gt-tooltip-enter');
    }, 300);
}

/**
 * Affiche l'écran final
 */
function renderFinalStep(step, index, totalSteps) {
    // Revenir sur today
    if (typeof window.showPage === 'function') {
        window.showPage('today', null);
    }

    // Overlay plein (pas de cutout)
    overlayEl.style.clipPath = 'none';
    overlayEl.style.boxShadow = 'none';
    overlayEl.classList.add('gt-overlay-final');

    // Retirer tout highlight précédent
    document.querySelectorAll('.gt-highlighted').forEach(el => {
        el.classList.remove('gt-highlighted');
        el.style.position = '';
        el.style.zIndex = '';
    });

    // Tooltip centré comme un card final
    tooltipEl.className = 'gt-tooltip gt-tooltip-final gt-tooltip-enter';
    tooltipEl.innerHTML = `
        <div class="gt-final-icon">🔥</div>
        <div class="gt-tooltip-title">${step.title}</div>
        <div class="gt-tooltip-text">${step.text}</div>
        <div class="gt-progress">
            <div class="gt-progress-bar">
                <div class="gt-progress-fill" style="width: 100%"></div>
            </div>
            <span class="gt-progress-text">${totalSteps}/${totalSteps}</span>
        </div>
        <div class="gt-tooltip-buttons">
            <button class="gt-btn-finish" id="gtFinishBtn">C'est parti ! 🚀</button>
        </div>
    `;

    // Reset positioning for centered display
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.top = '50%';
    tooltipEl.style.left = '50%';
    tooltipEl.style.transform = 'translate(-50%, -50%)';
    tooltipEl.style.bottom = 'auto';
    tooltipEl.style.right = 'auto';

    document.getElementById('gtFinishBtn').addEventListener('click', endTour);
}

/**
 * Met en surbrillance un élément
 */
function highlightElement(el) {
    // Retirer highlight précédent
    document.querySelectorAll('.gt-highlighted').forEach(prev => {
        prev.classList.remove('gt-highlighted');
        prev.style.position = '';
        prev.style.zIndex = '';
    });

    // Appliquer highlight
    el.classList.add('gt-highlighted');

    // Overlay avec cutout via box-shadow
    const rect = el.getBoundingClientRect();
    const padding = 8;

    const top = rect.top - padding + window.scrollY;
    const left = rect.left - padding;
    const width = rect.width + padding * 2;
    const height = rect.height + padding * 2;
    const radius = 12;

    overlayEl.classList.remove('gt-overlay-final');

    // Utiliser clip-path avec un polygon pour créer le cutout
    // Alternative : on utilise un pseudo-element avec box-shadow massif
    overlayEl.style.clipPath = `polygon(
        0% 0%, 0% 100%, 
        ${left}px 100%, 
        ${left}px ${top}px, 
        ${left + width}px ${top}px, 
        ${left + width}px ${top + height}px, 
        ${left}px ${top + height}px, 
        ${left}px 100%, 
        100% 100%, 100% 0%
    )`;
}

/**
 * Positionne le tooltip par rapport à l'élément cible
 */
function positionTooltip(targetEl, step, index, totalSteps) {
    const rect = targetEl.getBoundingClientRect();
    const margin = 16;
    const tooltipMaxWidth = 320;

    // Construire le contenu du tooltip
    const progressPercent = ((index + 1) / totalSteps) * 100;

    tooltipEl.className = 'gt-tooltip gt-tooltip-enter';
    tooltipEl.innerHTML = `
        <div class="gt-tooltip-arrow gt-arrow-${step.position === 'top' ? 'bottom' : 'top'}"></div>
        <div class="gt-tooltip-title">${step.title}</div>
        <div class="gt-tooltip-text">${step.text}</div>
        <div class="gt-progress">
            <div class="gt-progress-bar">
                <div class="gt-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <span class="gt-progress-text">${index + 1}/${totalSteps}</span>
        </div>
        <div class="gt-tooltip-buttons">
            <button class="gt-btn-skip" id="gtSkipBtn">Passer</button>
            <button class="gt-btn-next" id="gtNextBtn">Suivant →</button>
        </div>
    `;

    // Reset transform
    tooltipEl.style.transform = '';

    // Calculer la position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top, left;
    let actualPosition = step.position;

    // Vérifier si on a la place en bas ou en haut
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (actualPosition === 'bottom' && spaceBelow < 200) {
        actualPosition = 'top';
    } else if (actualPosition === 'top' && spaceAbove < 200) {
        actualPosition = 'bottom';
    }

    if (actualPosition === 'bottom') {
        top = rect.bottom + margin + window.scrollY;
        left = Math.max(margin, Math.min(
            rect.left + rect.width / 2 - tooltipMaxWidth / 2,
            viewportWidth - tooltipMaxWidth - margin
        ));
    } else {
        // Position au-dessus
        top = rect.top - margin + window.scrollY;
        left = Math.max(margin, Math.min(
            rect.left + rect.width / 2 - tooltipMaxWidth / 2,
            viewportWidth - tooltipMaxWidth - margin
        ));
        // On va utiliser bottom positioning
        tooltipEl.style.position = 'absolute';
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = 'auto';
        tooltipEl.style.bottom = `${document.documentElement.scrollHeight - rect.top + margin - window.scrollY}px`;
        tooltipEl.style.right = 'auto';

        // Mettre à jour la flèche
        tooltipEl.querySelector('.gt-tooltip-arrow').className = 'gt-tooltip-arrow gt-arrow-bottom';

        // Event listeners
        document.getElementById('gtSkipBtn').addEventListener('click', skipTour);
        document.getElementById('gtNextBtn').addEventListener('click', nextStep);
        return;
    }

    tooltipEl.style.position = 'absolute';
    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.bottom = 'auto';
    tooltipEl.style.right = 'auto';

    // Event listeners
    document.getElementById('gtSkipBtn').addEventListener('click', skipTour);
    document.getElementById('gtNextBtn').addEventListener('click', nextStep);
}

/**
 * Scroll vers un élément s'il n'est pas visible
 */
function scrollToElement(el) {
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (rect.top < 80 || rect.bottom > viewportHeight - 100) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Passe à l'étape suivante
 */
function nextStep() {
    showStep(currentStepIndex + 1);
}

/**
 * Passe le tour (skip)
 */
function skipTour() {
    endTour();
}

/**
 * Termine le tour
 */
function endTour() {
    isActive = false;
    localStorage.setItem('guidedTourDone', 'true');

    // Retirer highlight
    document.querySelectorAll('.gt-highlighted').forEach(el => {
        el.classList.remove('gt-highlighted');
        el.style.position = '';
        el.style.zIndex = '';
    });

    // Fermer manage habits modal si ouvert
    if (typeof window.closeManageHabitsModal === 'function') {
        window.closeManageHabitsModal();
    }

    // Animation de sortie
    if (tooltipEl) {
        tooltipEl.classList.add('gt-tooltip-exit');
    }
    if (overlayEl) {
        overlayEl.classList.add('gt-overlay-exit');
    }

    setTimeout(() => {
        if (overlayEl) { overlayEl.remove(); overlayEl = null; }
        if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    }, 400);

    // Revenir à la page today
    if (typeof window.showPage === 'function') {
        window.showPage('today', null);
    }
}

/**
 * Permet de relancer le tour manuellement (debug ou settings)
 */
export function resetGuidedTour() {
    localStorage.removeItem('guidedTourDone');
}
