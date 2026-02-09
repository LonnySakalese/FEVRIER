// ============================================================
// TUTORIEL ONBOARDING - SYSTÈME INTERACTIF
// ============================================================

import { ConfirmModal } from './modals.js';
import { triggerConfetti } from './confetti.js';

let currentTutorialStep = 1;
const totalTutorialSteps = 6;

// Vérifie si c'est la première visite de l'utilisateur
export function isFirstTimeUser() {
    const data = localStorage.getItem('warriorTracker');
    const tutorialCompleted = localStorage.getItem('warriorTutorialCompleted');

    if (tutorialCompleted === 'true') {
        return false;
    }

    if (data) {
        const parsedData = JSON.parse(data);
        if (parsedData.days && Object.keys(parsedData.days).length > 0) {
            return false;
        }
    }

    return true;
}

// Affiche le tutoriel
export function showTutorial() {
    const overlay = document.getElementById('tutorialOverlay');
    if (overlay) {
        overlay.classList.add('active');
        createParticles();
        if (navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
        }
    }
}

// Cache le tutoriel
export function hideTutorial() {
    const overlay = document.getElementById('tutorialOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Crée les particules d'arrière-plan
function createParticles() {
    const container = document.getElementById('tutorialParticles');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (10 + Math.random() * 10) + 's';
        particle.style.opacity = 0.1 + Math.random() * 0.3;
        particle.style.width = (2 + Math.random() * 4) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// Navigation vers l'étape suivante
export function nextTutorialStep() {
    if (currentTutorialStep < totalTutorialSteps) {
        goToTutorialStep(currentTutorialStep + 1);
    }
}

// Navigation vers l'étape précédente
export function prevTutorialStep() {
    if (currentTutorialStep > 1) {
        goToTutorialStep(currentTutorialStep - 1);
    }
}

// Aller à une étape spécifique
export function goToTutorialStep(stepNum) {
    document.querySelectorAll('.tutorial-step').forEach(step => {
        step.classList.remove('active');
    });

    const targetStep = document.querySelector(`.tutorial-step[data-step="${stepNum}"]`);
    if (targetStep) {
        targetStep.classList.add('active');
    }

    document.querySelectorAll('.progress-dot').forEach(dot => {
        const dotStep = parseInt(dot.dataset.step);
        dot.classList.remove('active', 'completed');

        if (dotStep === stepNum) {
            dot.classList.add('active');
        } else if (dotStep < stepNum) {
            dot.classList.add('completed');
        }
    });

    const stepNumEl = document.getElementById('currentStepNum');
    if (stepNumEl) {
        stepNumEl.textContent = stepNum;
    }

    currentTutorialStep = stepNum;

    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    if (stepNum === 4) {
        resetDemoCheckbox();
    }
}

// Skip le tutoriel
export async function skipTutorial() {
    const confirmed = await ConfirmModal.show({
        title: '⏭️ PASSER LE TUTORIEL',
        message: 'Es-tu sûr de vouloir passer le tutoriel ?',
        subtext: 'Tu peux toujours le revoir plus tard dans les paramètres.',
        confirmText: 'Passer',
        cancelText: 'Annuler'
    });

    if (confirmed) {
        completeTutorialAndContinue();
    }
}

// Complète le tutoriel et redirige vers l'inscription
export function completeTutorial() {
    localStorage.setItem('warriorTutorialCompleted', 'true');

    const overlay = document.getElementById('tutorialOverlay');
    if (overlay) {
        overlay.style.animation = 'tutorialFadeOut 0.5s ease-out forwards';

        setTimeout(() => {
            hideTutorial();
            overlay.style.animation = '';

            triggerConfetti();

            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100, 50, 200]);
            }
        }, 500);
    }
}

// Complète le tutoriel sans animation spéciale
export function completeTutorialAndContinue() {
    localStorage.setItem('warriorTutorialCompleted', 'true');
    hideTutorial();
}

// Demo checkbox toggle (étape 4)
export function toggleDemoCheckbox() {
    const checkbox = document.getElementById('demoCheckbox');
    const habitItem = document.getElementById('demoHabitItem');
    const instruction = document.getElementById('demoInstruction');
    const success = document.getElementById('demoSuccess');
    const percent = habitItem.querySelector('.demo-percent');
    const streak = habitItem.querySelector('.demo-habit-streak');

    if (!checkbox.classList.contains('checked')) {
        checkbox.classList.add('checked');
        habitItem.classList.add('checked');
        instruction.style.display = 'none';
        success.classList.add('active');
        percent.textContent = '17%';
        streak.textContent = '🔥 Série: 1 jour';

        if (navigator.vibrate) {
            navigator.vibrate([30, 30, 30]);
        }
    } else {
        resetDemoCheckbox();
    }
}

// Reset demo checkbox
export function resetDemoCheckbox() {
    const checkbox = document.getElementById('demoCheckbox');
    const habitItem = document.getElementById('demoHabitItem');
    const instruction = document.getElementById('demoInstruction');
    const success = document.getElementById('demoSuccess');

    if (checkbox && habitItem && instruction && success) {
        checkbox.classList.remove('checked');
        habitItem.classList.remove('checked');
        instruction.style.display = 'flex';
        success.classList.remove('active');

        const percent = habitItem.querySelector('.demo-percent');
        const streak = habitItem.querySelector('.demo-habit-streak');
        if (percent) percent.textContent = '0%';
        if (streak) streak.textContent = '🔥 Série: 0 jours';
    }
}

// Permet de relancer le tutoriel depuis les paramètres
export function restartTutorial() {
    currentTutorialStep = 1;
    goToTutorialStep(1);
    showTutorial();
}

// Initialize tutorial styles and event listeners
export function initTutorial() {
    // Ajouter l'animation de sortie dans le style
    const tutorialFadeOutStyle = document.createElement('style');
    tutorialFadeOutStyle.textContent = `
        @keyframes tutorialFadeOut {
            from {
                opacity: 1;
                transform: scale(1);
            }
            to {
                opacity: 0;
                transform: scale(1.1);
            }
        }
    `;
    document.head.appendChild(tutorialFadeOutStyle);

    // Ajout des event listeners pour les dots de progression
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('progress-dot')) {
            const stepNum = parseInt(e.target.dataset.step);
            if (stepNum && stepNum <= currentTutorialStep + 1) {
                goToTutorialStep(stepNum);
            }
        }
    });
}

// Export current step getter for external use
export function getCurrentTutorialStep() {
    return currentTutorialStep;
}

export function setCurrentTutorialStep(step) {
    currentTutorialStep = step;
}
