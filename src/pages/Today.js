import { getData, getDayData, setHabitStatus, isDayValidated, canEditDate } from '../services/firestore.js';
import { getState } from '../services/state.js';
import { setDayAsValidated } from '../services/firestore.js';

// Récupère la date du jour au format AAAA-MM-JJ
function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Vérifie si toutes les habitudes sont complétées
function checkAllHabitsCompleted(habits, dayData) {
    if (habits.length === 0) return false;
    return habits.every(habit => dayData[habit.id] === true);
}

// Met à jour l'état du bouton de validation
function updateValidateButton(button, habits, dayData, isValidated) {
    if (!button) return;

    const allCompleted = checkAllHabitsCompleted(habits, dayData);

    if (isValidated) {
        // Journée déjà validée
        button.disabled = true;
        button.textContent = '✅ Journée validée';
        button.classList.add('validated');
    } else if (allCompleted) {
        // Toutes les habitudes complétées, bouton actif
        button.disabled = false;
        button.textContent = '🏆 Valider ma journée';
        button.classList.remove('validated');
    } else {
        // Habitudes manquantes, bouton désactivé
        button.disabled = true;
        button.textContent = 'Valider ma journée';
        button.classList.remove('validated');
    }
}

function Today() {
    const container = document.createElement('div');
    container.className = 'today-page';

    const today = new Date();
    const dateKey = getDateKey(today);

    // Récupérer l'état actuel
    const { habits } = getState();
    const dayData = getDayData(today);
    const isValidated = isDayValidated(today);
    const canEdit = canEditDate(today);

    // Formatage de la date
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = today.toLocaleDateString('fr-FR', options);

    // Calcul du score actuel
    const completedCount = habits.filter(h => dayData[h.id]).length;
    const totalHabits = habits.length;
    const score = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

    container.innerHTML = `
        <div class="today-header">
            <h2>Aujourd'hui</h2>
            <p class="today-date">${formattedDate}</p>
            <div class="today-score">
                <span class="score-value">${score}%</span>
                <span class="score-label">${completedCount}/${totalHabits} habitudes</span>
            </div>
        </div>

        <div class="habit-list">
            ${habits.length > 0 ? habits.map(habit => `
                <div class="habit-item ${dayData[habit.id] ? 'completed' : ''} ${!canEdit ? 'locked' : ''}">
                    <div class="habit-info">
                        <span class="habit-icon">${habit.icon || '📌'}</span>
                        <span class="habit-name">${habit.name}</span>
                    </div>
                    <input
                        type="checkbox"
                        class="habit-checkbox"
                        data-habit-id="${habit.id}"
                        ${dayData[habit.id] ? 'checked' : ''}
                        ${!canEdit ? 'disabled' : ''}
                    >
                </div>
            `).join('') : '<p class="no-habits">Aucune habitude configurée.</p>'}
        </div>

        ${isValidated ? `
            <div class="day-validated-banner">
                <span class="validated-icon">🎉</span>
                <span class="validated-text">Journée validée !</span>
            </div>
        ` : ''}

        <button id="validate-day-btn" class="validate-btn" disabled>
            Valider ma journée
        </button>
    `;

    // Référence au bouton
    const validateBtn = container.querySelector('#validate-day-btn');

    // Initialiser l'état du bouton
    updateValidateButton(validateBtn, habits, dayData, isValidated);

    // Écouteur pour le changement d'état des habitudes
    container.addEventListener('change', async (e) => {
        if (e.target.type === 'checkbox' && e.target.classList.contains('habit-checkbox')) {
            const habitId = e.target.dataset.habitId;
            const isChecked = e.target.checked;

            console.log(`Habitude ${habitId} changée: ${isChecked}`);

            // Mettre à jour le statut de l'habitude
            setHabitStatus(habitId, isChecked);

            // Récupérer les nouvelles données
            const newDayData = getDayData(today);

            // Mettre à jour l'apparence de l'item
            const habitItem = e.target.closest('.habit-item');
            if (habitItem) {
                habitItem.classList.toggle('completed', isChecked);
            }

            // Mettre à jour le score affiché
            const newCompletedCount = habits.filter(h => newDayData[h.id]).length;
            const newScore = totalHabits > 0 ? Math.round((newCompletedCount / totalHabits) * 100) : 0;

            const scoreValueEl = container.querySelector('.score-value');
            const scoreLabelEl = container.querySelector('.score-label');
            if (scoreValueEl) scoreValueEl.textContent = `${newScore}%`;
            if (scoreLabelEl) scoreLabelEl.textContent = `${newCompletedCount}/${totalHabits} habitudes`;

            // Mettre à jour l'état du bouton de validation
            updateValidateButton(validateBtn, habits, newDayData, isValidated);
        }
    });

    // Écouteur pour le clic sur le bouton de validation
    validateBtn.addEventListener('click', async () => {
        if (validateBtn.disabled) return;

        // Désactiver immédiatement pour éviter les doubles clics
        validateBtn.disabled = true;
        validateBtn.textContent = 'Validation en cours...';

        try {
            // Appeler la fonction pour enregistrer dans Firestore/localStorage
            const userId = 'current-user'; // À remplacer par l'ID réel de l'utilisateur
            await setDayAsValidated(userId, today);

            // Afficher le message de succès
            validateBtn.textContent = '✅ Journée validée';
            validateBtn.classList.add('validated');

            // Afficher une notification/alerte
            showSuccessMessage(container);

            console.log('Journée validée avec succès !');

        } catch (error) {
            console.error('Erreur lors de la validation:', error);
            validateBtn.disabled = false;
            validateBtn.textContent = '🏆 Valider ma journée';
            alert('Erreur lors de la validation. Veuillez réessayer.');
        }
    });

    return container;
}

// Affiche un message de succès
function showSuccessMessage(container) {
    // Créer le banner de succès s'il n'existe pas
    let banner = container.querySelector('.day-validated-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.className = 'day-validated-banner success-animation';
        banner.innerHTML = `
            <span class="validated-icon">🎉</span>
            <span class="validated-text">Félicitations ! Journée validée avec succès.</span>
        `;

        const validateBtn = container.querySelector('#validate-day-btn');
        container.insertBefore(banner, validateBtn);
    }

    // Animation de confettis (optionnel)
    triggerConfetti();
}

// Animation de confettis simple
function triggerConfetti() {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}vw;
            top: -10px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            pointer-events: none;
            z-index: 9999;
            animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 4000);
    }
}

export default Today;
