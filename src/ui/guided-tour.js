// ============================================================
// GUIDED TOUR - Tour guidé interactif pour les nouveaux utilisateurs
// ============================================================

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
        selector: '.habit-item',
        title: '🎯 Tes habitudes',
        text: 'Tape pour cocher une habitude ✅ Chaque ligne montre ta série et ta progression mensuelle.',
        position: 'bottom'
    },
    {
        selector: '#validateDayBtn',
        fallbackSelector: '.validate-day-btn',
        title: '✅ Validation',
        text: 'Valide ta journée pour gagner de l\'XP ! Tu as 24h.',
        position: 'top'
    },
    {
        selector: '.share-day-btn',
        title: '📤 Partage',
        text: 'Partage ton score du jour en image 📸',
        position: 'top'
    },
    {
        selector: '.nav-item[aria-label="Statistiques"]',
        fallbackSelector: '.nav-item:nth-child(2)',
        title: '📊 Stats',
        text: 'Consulte tes statistiques détaillées ici 📊',
        position: 'top',
        page: 'today'
    },
    {
        selector: '.nav-item[aria-label="Informations et motivation"]',
        fallbackSelector: '.nav-item:nth-child(3)',
        title: '🔥 Infos',
        text: 'Citations motivantes et système de rangs 🔥',
        position: 'top',
        page: 'today'
    },
    {
        selector: '.nav-item[aria-label="Profil"]',
        fallbackSelector: '.nav-item:nth-child(4)',
        title: '👤 Profil',
        text: 'Ton profil : avatar, pseudo, streaks, thèmes débloqués 👤',
        position: 'top',
        page: 'today'
    },
    {
        selector: '.nav-item[aria-label="Groupes"]',
        fallbackSelector: '.nav-item:nth-child(5)',
        title: '👥 Groupes',
        text: 'Rejoins ou crée des groupes pour te motiver en équipe ! 👥',
        position: 'top',
        page: 'today'
    },
    {
        selector: '.settings-btn.primary[onclick*="openManageHabitsModal"]',
        fallbackSelector: '.settings-btn.primary',
        title: '➕ Ajouter une habitude',
        text: 'Clique ici pour créer ou gérer tes habitudes !',
        position: 'bottom',
        prepare: () => {
            if (typeof window.showPage === 'function') {
                window.showPage('motivation', null);
            }
        }
    },
    {
        selector: '#themeToggleBtn',
        title: '🎨 Thème',
        text: 'Change le thème clair/sombre/auto 🎨',
        position: 'bottom',
        prepare: () => {
            if (typeof window.showPage === 'function') {
                window.showPage('motivation', null);
            }
        }
    },
    {
        selector: null,
        isFinal: true,
        title: 'Tu es prêt ! 🔥',
        text: 'Commence par cocher ta première habitude.',
        position: 'center'
    }
];

let currentStepIndex = 0;
let overlayEl = null;
let spotlightEl = null;
let tooltipEl = null;
let isActive = false;

// Bloque les clics en dehors du tooltip
function tourClickBlocker(e) {
    if (!isActive) return;
    if (tooltipEl && tooltipEl.contains(e.target)) return;
    e.stopPropagation();
    e.preventDefault();
}

export function needsGuidedTour() {
    return localStorage.getItem('guidedTourDone') !== 'true';
}

export function startGuidedTour() {
    if (!needsGuidedTour()) return;
    if (isActive) return;

    isActive = true;
    currentStepIndex = 0;

    if (typeof window.showPage === 'function') {
        window.showPage('today', null);
    }

    createElements();
    document.addEventListener('click', tourClickBlocker, true);

    setTimeout(() => showStep(0), 400);
}

function createElements() {
    // Overlay sombre (couvre tout)
    if (overlayEl) overlayEl.remove();
    overlayEl = document.createElement('div');
    overlayEl.id = 'guidedTourOverlay';
    overlayEl.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75);
        z-index: 29998;
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(overlayEl);

    // Spotlight (trou lumineux autour de l'élément)
    if (spotlightEl) spotlightEl.remove();
    spotlightEl = document.createElement('div');
    spotlightEl.id = 'guidedTourSpotlight';
    spotlightEl.style.cssText = `
        position: fixed;
        z-index: 29999;
        border-radius: 12px;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.75);
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        border: 2px solid rgba(245,245,240,0.4);
    `;
    document.body.appendChild(spotlightEl);

    // Tooltip
    if (tooltipEl) tooltipEl.remove();
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'guidedTourTooltip';
    tooltipEl.style.cssText = `
        position: fixed;
        z-index: 30000;
        background: var(--charcoal, #1E1E1E);
        border: 1px solid var(--steel, #2D2D2D);
        border-radius: 14px;
        padding: 18px;
        max-width: 300px;
        width: calc(100vw - 40px);
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(10px);
    `;
    document.body.appendChild(tooltipEl);
}

function showStep(index) {
    if (index < 0 || index >= TOUR_STEPS.length) {
        endTour();
        return;
    }

    currentStepIndex = index;
    const step = TOUR_STEPS[index];

    if (step.prepare) {
        step.prepare();
        setTimeout(() => renderStep(step, index), 500);
    } else {
        renderStep(step, index);
    }
}

function renderStep(step, index) {
    const totalSteps = TOUR_STEPS.length;

    if (step.isFinal) {
        renderFinalStep(step, totalSteps);
        return;
    }

    // Trouver l'élément
    let targetEl = document.querySelector(step.selector);
    if (!targetEl && step.fallbackSelector) {
        targetEl = document.querySelector(step.fallbackSelector);
    }

    if (!targetEl) {
        console.warn(`[GuidedTour] Skip: ${step.selector}`);
        nextStep();
        return;
    }

    // Scroll si nécessaire
    const rect = targetEl.getBoundingClientRect();
    if (rect.top < 60 || rect.bottom > window.innerHeight - 80) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setTimeout(() => {
        // Positionner le spotlight sur l'élément (coordonnées FIXED = pas de scrollY)
        const r = targetEl.getBoundingClientRect();
        const pad = 8;
        spotlightEl.style.top = (r.top - pad) + 'px';
        spotlightEl.style.left = (r.left - pad) + 'px';
        spotlightEl.style.width = (r.width + pad * 2) + 'px';
        spotlightEl.style.height = (r.height + pad * 2) + 'px';
        spotlightEl.style.display = 'block';

        // Overlay invisible (le box-shadow du spotlight fait le travail)
        overlayEl.style.background = 'transparent';

        // Construire le tooltip
        const progressPct = ((index + 1) / totalSteps) * 100;
        tooltipEl.innerHTML = `
            <div style="font-weight:700; font-size:0.95rem; color:var(--accent,#F5F5F0); margin-bottom:6px;">
                ${step.title}
            </div>
            <div style="font-size:0.82rem; color:var(--accent-dim,#A3A39E); line-height:1.5; margin-bottom:14px;">
                ${step.text}
            </div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
                <div style="flex:1; height:4px; background:var(--steel,#2D2D2D); border-radius:2px; overflow:hidden;">
                    <div style="height:100%; width:${progressPct}%; background:var(--accent-green,#19E639); border-radius:2px; transition:width 0.3s;"></div>
                </div>
                <span style="font-size:0.65rem; color:var(--accent-dim,#A3A39E);">${index + 1}/${totalSteps}</span>
            </div>
            <div style="display:flex; gap:10px;">
                <button id="gtSkipBtn" style="flex:1; padding:10px; border:1px solid var(--steel,#2D2D2D); background:transparent; color:var(--accent-dim,#A3A39E); border-radius:10px; font-size:0.8rem; cursor:pointer;">Passer</button>
                <button id="gtNextBtn" style="flex:2; padding:10px; background:var(--accent,#F5F5F0); color:var(--black,#0A0A0A); border:none; border-radius:10px; font-size:0.8rem; font-weight:700; cursor:pointer;">Suivant →</button>
            </div>
        `;

        // Positionner le tooltip — centré horizontalement, au-dessus ou en-dessous
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const tooltipH = 200; // estimation
        const gap = 14;

        let tooltipTop;
        const spaceBelow = vh - r.bottom;
        const spaceAbove = r.top;

        if (step.position === 'top' || (step.position !== 'bottom' && spaceAbove > spaceBelow && spaceAbove > tooltipH + gap)) {
            // Au-dessus
            tooltipTop = Math.max(10, r.top - tooltipH - gap);
        } else {
            // En-dessous
            tooltipTop = Math.min(vh - tooltipH - 10, r.bottom + gap);
        }

        const tooltipW = Math.min(300, vw - 40);
        tooltipEl.style.top = tooltipTop + 'px';
        tooltipEl.style.left = ((vw - tooltipW) / 2) + 'px';
        tooltipEl.style.width = tooltipW + 'px';
        tooltipEl.style.opacity = '1';
        tooltipEl.style.transform = 'translateY(0)';

        document.getElementById('gtSkipBtn').addEventListener('click', endTour);
        document.getElementById('gtNextBtn').addEventListener('click', nextStep);
    }, 300);
}

function renderFinalStep(step, totalSteps) {
    if (typeof window.showPage === 'function') {
        window.showPage('today', null);
    }

    // Cacher le spotlight
    spotlightEl.style.display = 'none';
    overlayEl.style.background = 'rgba(0,0,0,0.8)';

    tooltipEl.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:3rem; margin-bottom:10px;">🔥</div>
            <div style="font-weight:900; font-size:1.2rem; color:var(--accent,#F5F5F0); margin-bottom:8px;">
                ${step.title}
            </div>
            <div style="font-size:0.9rem; color:var(--accent-dim,#A3A39E); margin-bottom:20px; line-height:1.5;">
                ${step.text}
            </div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
                <div style="flex:1; height:4px; background:var(--steel,#2D2D2D); border-radius:2px; overflow:hidden;">
                    <div style="height:100%; width:100%; background:var(--accent-green,#19E639); border-radius:2px;"></div>
                </div>
                <span style="font-size:0.65rem; color:var(--accent-dim,#A3A39E);">${totalSteps}/${totalSteps}</span>
            </div>
            <button id="gtFinishBtn" style="width:100%; padding:14px; background:var(--accent-green,#19E639); color:var(--black,#0A0A0A); border:none; border-radius:12px; font-size:0.95rem; font-weight:800; cursor:pointer; text-transform:uppercase; letter-spacing:1px;">
                C'est parti ! 🚀
            </button>
        </div>
    `;

    // Centrer sur l'écran
    const vw = window.innerWidth;
    const tooltipW = Math.min(300, vw - 40);
    tooltipEl.style.top = '50%';
    tooltipEl.style.left = ((vw - tooltipW) / 2) + 'px';
    tooltipEl.style.width = tooltipW + 'px';
    tooltipEl.style.transform = 'translateY(-50%)';
    tooltipEl.style.opacity = '1';

    document.getElementById('gtFinishBtn').addEventListener('click', endTour);
}

function nextStep() {
    // Fade out tooltip briefly
    tooltipEl.style.opacity = '0';
    tooltipEl.style.transform = 'translateY(10px)';
    setTimeout(() => showStep(currentStepIndex + 1), 200);
}

function endTour() {
    isActive = false;
    localStorage.setItem('guidedTourDone', 'true');

    // Retirer le bloqueur de clics
    document.removeEventListener('click', tourClickBlocker, true);

    // Fade out tout
    if (overlayEl) overlayEl.style.opacity = '0';
    if (spotlightEl) spotlightEl.style.opacity = '0';
    if (tooltipEl) { tooltipEl.style.opacity = '0'; tooltipEl.style.transform = 'translateY(10px)'; }

    // Supprimer après l'animation
    setTimeout(() => {
        if (overlayEl) { overlayEl.remove(); overlayEl = null; }
        if (spotlightEl) { spotlightEl.remove(); spotlightEl = null; }
        if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    }, 400);

    // Retirer toute classe highlight résiduelle
    document.querySelectorAll('.gt-highlighted').forEach(el => {
        el.classList.remove('gt-highlighted');
    });

    if (typeof window.showPage === 'function') {
        window.showPage('today', null);
    }
}

export function resetGuidedTour() {
    localStorage.removeItem('guidedTourDone');
}
