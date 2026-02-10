// ============================================================
// MINI ONBOARDING - 3 slides simples
// ============================================================

let onboardingStep = 0;

export function isFirstTimeUser() {
    return !localStorage.getItem('warriorOnboardingDone');
}

export function showTutorial() {
    showOnboarding();
}

export function hideTutorial() {
    hideOnboarding();
}

function showOnboarding() {
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;
    onboardingStep = 0;
    updateOnboardingSlide();
    overlay.classList.add('active');
}

function hideOnboarding() {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) overlay.classList.remove('active');
}

function updateOnboardingSlide() {
    const slides = [
        {
            icon: '🎯',
            title: 'DÉFINIS TES HABITUDES',
            text: 'Crée tes habitudes quotidiennes et personnalise-les avec des icônes et des couleurs.'
        },
        {
            icon: '✅',
            title: 'VALIDE CHAQUE JOUR',
            text: 'Coche tes habitudes au fur et à mesure. Maintiens ta série et ne brise jamais la chaîne !'
        },
        {
            icon: '🏆',
            title: 'PROGRESSE ET ÉVOLUE',
            text: 'Suis tes stats, monte en rang, débloque des badges. Deviens meilleur chaque jour.'
        }
    ];
    
    const slide = slides[onboardingStep];
    document.getElementById('onboardingIcon').textContent = slide.icon;
    document.getElementById('onboardingTitle').textContent = slide.title;
    document.getElementById('onboardingText').textContent = slide.text;
    
    // Update dots
    document.querySelectorAll('.onboarding-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === onboardingStep);
    });
    
    // Update buttons
    document.getElementById('onboardingPrev').style.visibility = onboardingStep === 0 ? 'hidden' : 'visible';
    const nextBtn = document.getElementById('onboardingNext');
    if (onboardingStep === slides.length - 1) {
        nextBtn.textContent = "C'EST PARTI ! 🔥";
        nextBtn.onclick = completeOnboarding;
    } else {
        nextBtn.textContent = 'SUIVANT →';
        nextBtn.onclick = nextOnboardingSlide;
    }
}

function nextOnboardingSlide() {
    if (onboardingStep < 2) {
        onboardingStep++;
        updateOnboardingSlide();
    }
}

function prevOnboardingSlide() {
    if (onboardingStep > 0) {
        onboardingStep--;
        updateOnboardingSlide();
    }
}

function completeOnboarding() {
    localStorage.setItem('warriorOnboardingDone', 'true');
    hideOnboarding();
}

function skipOnboarding() {
    localStorage.setItem('warriorOnboardingDone', 'true');
    hideOnboarding();
}

// Expose needed functions
export function initTutorial() {}
export function nextTutorialStep() { nextOnboardingSlide(); }
export function prevTutorialStep() { prevOnboardingSlide(); }
export function skipTutorial() { skipOnboarding(); }
export function completeTutorial() { completeOnboarding(); }
export function toggleDemoCheckbox() {}
export function restartTutorial() { showOnboarding(); }
export function goToTutorialStep() {}
export function getCurrentTutorialStep() { return onboardingStep; }
export function setCurrentTutorialStep(s) { onboardingStep = s; }
