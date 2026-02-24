// ============================================================
// HABITS - CRUD, SCHEDULING, LOADING
// ============================================================

import { habits, appState } from '../services/state.js';
import { getData, saveData } from '../services/storage.js';
import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { showPopup } from '../ui/toast.js';
import { ConfirmModal } from '../ui/modals.js';

// --- Habit Categories ---
export const HABIT_CATEGORIES = [
    { id: 'autre', icon: '⭐', label: 'Autre' },
    { id: 'sport', icon: '💪', label: 'Sport' },
    { id: 'mental', icon: '🧠', label: 'Mental' },
    { id: 'sante', icon: '🥗', label: 'Santé' },
    { id: 'apprentissage', icon: '📚', label: 'Apprentissage' },
    { id: 'productivite', icon: '💰', label: 'Productivité' },
    { id: 'creativite', icon: '🎨', label: 'Créativité' },
    { id: 'relations', icon: '❤️', label: 'Relations' }
];

// --- Habit Management State (module-local) ---
let selectedIcon = '🎯';
let selectedColor = '#F5F5F0';
let selectedScheduleType = 'daily';
let selectedDaysOfWeek = [0, 1, 2, 3, 4, 5, 6];
let selectedCategory = 'autre';
let activeFilter = 'all';

export function setHabitCategory(cat) {
    selectedCategory = cat;
    document.querySelectorAll('.category-option').forEach(el => {
        el.classList.toggle('active', el.dataset.category === cat);
    });
}

export function filterByCategory(cat) {
    activeFilter = cat;
    document.querySelectorAll('.category-filter').forEach(el => {
        el.classList.toggle('active', el.dataset.category === cat);
    });
    // Trigger re-render of habits list
    if (typeof window._onFilterChange === 'function') window._onFilterChange();
}

export function getActiveFilter() {
    return activeFilter;
}

export function getSelectedCategory() {
    return selectedCategory;
}

// Callback for when habits change (set by app.js to trigger updateUI)
let _onHabitsChanged = null;
export function setOnHabitsChanged(callback) { _onHabitsChanged = callback; }

// --- SCHEDULING ---

// Vérifie si une habitude est planifiée pour une date donnée
export function isHabitScheduledForDate(habit, date) {
    const scheduleType = habit.scheduleType || 'daily';

    if (scheduleType === 'daily') {
        return true;
    }

    const daysOfWeek = habit.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
    const dayOfWeek = date.getDay();

    return daysOfWeek.includes(dayOfWeek);
}

// --- LOADING ---

// Charger les habitudes depuis Firestore (pour utilisateurs connectés)
export async function loadHabitsFromFirestore() {
    if (!isFirebaseConfigured || !appState.currentUser) return;

    try {
        const userId = appState.currentUser.uid;
        const habitsSnapshot = await db.collection('users').doc(userId).collection('habits').get();

        habits.length = 0;

        const loadedHabits = [];
        habitsSnapshot.forEach(doc => {
            const habitData = doc.data();
            if (habitData.isActive !== false) {
                loadedHabits.push({
                    id: doc.id,
                    name: habitData.name,
                    icon: habitData.icon,
                    color: habitData.color || '#F5F5F0'
                });
            }
        });

        loadedHabits.sort((a, b) => {
            const orderA = habitsSnapshot.docs.find(d => d.id === a.id)?.data().order || 0;
            const orderB = habitsSnapshot.docs.find(d => d.id === b.id)?.data().order || 0;
            return orderA - orderB;
        });

        loadedHabits.forEach(habit => habits.push(habit));

        console.log(`✅ ${habits.length} habitudes chargées depuis Firestore`);
    } catch (error) {
        console.error('❌ Erreur chargement habitudes Firestore:', error);
    }
}

// Charger les habitudes personnalisées au démarrage
export async function loadCustomHabits() {
    if (isFirebaseConfigured && appState.currentUser) {
        await loadHabitsFromFirestore();
        return;
    }

    const data = getData();

    if (data.customHabitNames) {
        Object.entries(data.customHabitNames).forEach(([habitId, customName]) => {
            const habit = habits.find(h => h.id === habitId);
            if (habit) {
                habit.name = customName;
            }
        });
    }

    if (data.customHabits && data.customHabits.length > 0) {
        data.customHabits.forEach(customHabit => {
            if (!habits.find(h => h.id === customHabit.id)) {
                if (!data.deletedHabits || !data.deletedHabits.includes(customHabit.id)) {
                    habits.push(customHabit);
                }
            }
        });
    }

    if (data.habitOrder && data.habitOrder.length > 0) {
        const orderedHabits = [];
        data.habitOrder.forEach(habitId => {
            const habit = habits.find(h => h.id === habitId);
            if (habit) {
                orderedHabits.push(habit);
            }
        });
        habits.forEach(habit => {
            if (!orderedHabits.find(h => h.id === habit.id)) {
                orderedHabits.push(habit);
            }
        });
        habits.length = 0;
        habits.push(...orderedHabits);
    }
}

// --- DISPLAY HELPERS ---

export function getCustomHabitNames() {
    const data = getData();
    return data.customHabitNames || {};
}

export function getHabitDisplayName(habit) {
    const customNames = getCustomHabitNames();
    return customNames[habit.id] || habit.name;
}

// --- MODAL MANAGEMENT ---

export function openManageHabitsModal() {
    const modal = document.getElementById('manageHabitsModal');
    renderHabitsManagementList();
    modal.classList.add('active');
    resetAddHabitForm();
}

export function closeManageHabitsModal() {
    document.getElementById('manageHabitsModal').classList.remove('active');
    resetAddHabitForm();
    if (_onHabitsChanged) _onHabitsChanged();
}

// --- ADD HABIT FORM ---

export function toggleAddHabitForm() {
    const section = document.getElementById('addHabitSection');
    const form = document.getElementById('addHabitForm');

    if (form.classList.contains('active')) {
        form.classList.remove('active');
        section.classList.add('collapsed');
    } else {
        form.classList.add('active');
        section.classList.remove('collapsed');
        setupIconPicker();
        setupColorPicker();
    }
}

export function setupIconPicker() {
    const iconOptions = document.querySelectorAll('#iconPicker .icon-option');
    iconOptions.forEach(option => {
        option.addEventListener('click', function () {
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedIcon = this.dataset.icon;
        });
    });

    if (iconOptions.length > 0 && !document.querySelector('#iconPicker .icon-option.selected')) {
        iconOptions[0].classList.add('selected');
        selectedIcon = iconOptions[0].dataset.icon;
    }
}

export function setupColorPicker() {
    const colorOptions = document.querySelectorAll('#colorPicker .color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', function () {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            selectedColor = this.dataset.color;
        });
    });

    if (colorOptions.length > 0 && !document.querySelector('#colorPicker .color-option.selected')) {
        colorOptions[0].classList.add('selected');
        selectedColor = colorOptions[0].dataset.color;
    }
}

export function setScheduleType(type) {
    selectedScheduleType = type;

    document.querySelectorAll('.schedule-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    const daysOfWeekPicker = document.getElementById('daysOfWeekPicker');
    if (type === 'weekly') {
        daysOfWeekPicker.style.display = 'flex';
        if (selectedDaysOfWeek.length === 0) {
            selectedDaysOfWeek = [1, 2, 3, 4, 5];
            updateDaysOfWeekUI();
        }
    } else {
        daysOfWeekPicker.style.display = 'none';
        selectedDaysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    }
}

export function toggleDayOfWeek(day) {
    const index = selectedDaysOfWeek.indexOf(day);
    if (index > -1) {
        if (selectedDaysOfWeek.length > 1) {
            selectedDaysOfWeek.splice(index, 1);
        }
    } else {
        selectedDaysOfWeek.push(day);
    }
    updateDaysOfWeekUI();
}

function updateDaysOfWeekUI() {
    document.querySelectorAll('.day-checkbox').forEach(checkbox => {
        const day = parseInt(checkbox.dataset.day);
        checkbox.classList.toggle('selected', selectedDaysOfWeek.includes(day));
    });
}

export function resetAddHabitForm() {
    const section = document.getElementById('addHabitSection');
    const form = document.getElementById('addHabitForm');

    form.classList.remove('active');
    section.classList.add('collapsed');
    document.getElementById('newHabitName').value = '';
    document.getElementById('newHabitDescription').value = '';

    document.querySelectorAll('#iconPicker .icon-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('#colorPicker .color-option').forEach(opt => opt.classList.remove('selected'));

    selectedIcon = '🎯';
    selectedColor = '#F5F5F0';
    selectedCategory = 'autre';

    // Reset category picker UI
    document.querySelectorAll('.category-option').forEach(el => {
        el.classList.toggle('active', el.dataset.category === 'autre');
    });

    selectedScheduleType = 'daily';
    selectedDaysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    document.querySelectorAll('.schedule-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'daily');
    });
    const daysOfWeekPicker = document.getElementById('daysOfWeekPicker');
    if (daysOfWeekPicker) {
        daysOfWeekPicker.style.display = 'none';
    }
    updateDaysOfWeekUI();
}

export function cancelAddHabit() {
    resetAddHabitForm();
}

export function saveNewHabit() {
    const name = document.getElementById('newHabitName').value.trim().toUpperCase();
    const description = document.getElementById('newHabitDescription').value.trim();

    if (!name) {
        showPopup('Le nom de l\'habitude est requis', 'warning');
        return;
    }

    const habitId = 'habit_' + Date.now();

    const newHabit = {
        id: habitId,
        name: name,
        description: description || '',
        icon: selectedIcon,
        color: selectedColor,
        scheduleType: selectedScheduleType,
        daysOfWeek: [...selectedDaysOfWeek],
        category: selectedCategory
    };

    habits.push(newHabit);

    const data = getData();
    if (!data.customHabits) data.customHabits = [];
    data.customHabits.push(newHabit);
    saveData(data);

    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
    showPopup(`Habitude "${name}" ajoutée avec succès !`, 'success');

    resetAddHabitForm();
    renderHabitsManagementList();
    if (_onHabitsChanged) _onHabitsChanged();
}

// --- HABITS MANAGEMENT LIST ---

export function renderHabitsManagementList() {
    const container = document.getElementById('habitsManagementList');

    if (habits.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--accent-dim); padding: 20px;">Aucune habitude. Ajoute-en une !</p>';
        return;
    }

    container.innerHTML = habits.map((habit, index) => {
        const color = habit.color || '#F5F5F0';
        const disabledUp = index === 0 ? 'disabled' : '';
        const disabledDown = index === habits.length - 1 ? 'disabled' : '';
        const escapedName = (habit.name || '').replace(/"/g, '&quot;');
        const escapedDesc = (habit.description || '').replace(/"/g, '&quot;');
        const escapedId = habit.id.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        const scheduleType = habit.scheduleType || 'daily';
        const daysOfWeek = habit.daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
        const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

        return `
            <div class="hm-card" data-habit-id="${habit.id}">
                <div class="hm-card-accent" style="background: ${color};"></div>
                <div class="hm-card-body">
                    <div class="hm-card-top">
                        <div class="hm-card-icon">${habit.icon}</div>
                        <div class="hm-card-fields">
                            <input type="text" class="hm-input hm-input-name" id="name-${habit.id}" value="${escapedName}" placeholder="Nom de l'habitude">
                            <input type="text" class="hm-input hm-input-desc" id="desc-${habit.id}" value="${escapedDesc}" placeholder="Description (optionnel)" maxlength="150">
                        </div>
                        <div class="hm-card-order">
                            <button class="hm-order-btn" onclick="moveHabit('${escapedId}', -1)" ${disabledUp}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                            <button class="hm-order-btn" onclick="moveHabit('${escapedId}', 1)" ${disabledDown}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="hm-card-bottom">
                        <div class="hm-schedule">
                            <button type="button" class="hm-sched-btn ${scheduleType === 'daily' ? 'active' : ''}"
                                onclick="setHabitScheduleType('${escapedId}', 'daily')">Quotidien</button>
                            <button type="button" class="hm-sched-btn ${scheduleType === 'weekly' ? 'active' : ''}"
                                onclick="setHabitScheduleType('${escapedId}', 'weekly')">Hebdo</button>
                        </div>
                        <div class="hm-days" id="daysOfWeekPicker-${habit.id}" style="display: ${scheduleType === 'weekly' ? 'flex' : 'none'};">
                            ${[1, 2, 3, 4, 5, 6, 0].map(d => `
                                <div class="hm-day ${daysOfWeek.includes(d) ? 'selected' : ''}"
                                    data-day="${d}" onclick="toggleHabitDayOfWeek('${escapedId}', ${d})">${dayLabels[d]}</div>
                            `).join('')}
                        </div>
                        <div class="hm-card-actions">
                            <button class="hm-btn hm-btn-save" onclick="updateHabit('${escapedId}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Sauvegarder
                            </button>
                            <button class="hm-btn hm-btn-delete" onclick="deleteHabit('${escapedId}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- UPDATE HABIT ---

export function updateHabit(habitId) {
    const nameInput = document.getElementById(`name-${habitId}`);
    const descInput = document.getElementById(`desc-${habitId}`);
    const newName = nameInput.value.trim().toUpperCase();
    const newDesc = descInput ? descInput.value.trim() : '';

    if (!newName) {
        showPopup('Le nom ne peut pas être vide', 'warning');
        return;
    }

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    habit.name = newName;
    habit.description = newDesc;

    const data = getData();
    if (!data.customHabits) data.customHabits = [];

    const customHabit = data.customHabits.find(h => h.id === habitId);
    if (customHabit) {
        customHabit.name = newName;
        customHabit.description = newDesc;
    }

    saveData(data);

    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
    showPopup('Habitude mise à jour !', 'success');

    renderHabitsManagementList();
    if (_onHabitsChanged) _onHabitsChanged();
}

// Fonction de compatibilité (ancien nom)
export function updateHabitName(habitId) {
    updateHabit(habitId);
}

// --- SCHEDULE TYPE FOR EXISTING HABITS ---

export function setHabitScheduleType(habitId, type) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    habit.scheduleType = type;
    if (type === 'daily') {
        habit.daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    } else if (!habit.daysOfWeek || habit.daysOfWeek.length === 7) {
        habit.daysOfWeek = [1, 2, 3, 4, 5];
    }

    saveHabitSchedule(habitId, habit.scheduleType, habit.daysOfWeek);

    const picker = document.getElementById(`daysOfWeekPicker-${habitId}`);
    if (picker) {
        picker.style.display = type === 'weekly' ? 'flex' : 'none';
    }

    const container = document.getElementById(`scheduleTypePicker-${habitId}`);
    if (container) {
        container.querySelectorAll('.schedule-type-btn-mini').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
    }

    renderHabitsManagementList();
}

export function toggleHabitDayOfWeek(habitId, day) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!habit.daysOfWeek) habit.daysOfWeek = [0, 1, 2, 3, 4, 5, 6];

    const index = habit.daysOfWeek.indexOf(day);
    if (index > -1) {
        if (habit.daysOfWeek.length > 1) {
            habit.daysOfWeek.splice(index, 1);
        }
    } else {
        habit.daysOfWeek.push(day);
    }

    saveHabitSchedule(habitId, habit.scheduleType, habit.daysOfWeek);

    const checkbox = document.querySelector(`#daysOfWeekPicker-${habitId} .day-checkbox-mini[data-day="${day}"]`);
    if (checkbox) {
        checkbox.classList.toggle('selected', habit.daysOfWeek.includes(day));
    }
}

function saveHabitSchedule(habitId, scheduleType, daysOfWeek) {
    const data = getData();
    if (!data.customHabits) data.customHabits = [];

    const customHabit = data.customHabits.find(h => h.id === habitId);
    if (customHabit) {
        customHabit.scheduleType = scheduleType;
        customHabit.daysOfWeek = [...daysOfWeek];
    }

    saveData(data);
}

// --- DELETE HABIT ---

export async function deleteHabit(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const confirmed = await ConfirmModal.show({
        title: '🗑️ SUPPRIMER HABITUDE',
        message: `Supprimer "<strong>${habit.name}</strong>" ?`,
        subtext: "L'historique sera conservé mais l'habitude n'apparaîtra plus.",
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        danger: true
    });

    if (!confirmed) return;

    const index = habits.findIndex(h => h.id === habitId);
    if (index > -1) {
        habits.splice(index, 1);
    }

    const data = getData();

    if (data.customHabits) {
        data.customHabits = data.customHabits.filter(h => h.id !== habitId);
    }

    if (!data.deletedHabits) data.deletedHabits = [];
    data.deletedHabits.push(habitId);

    saveData(data);

    if (navigator.vibrate) navigator.vibrate(50);
    showPopup(`Habitude "${habit.name}" supprimée`, 'success');

    renderHabitsManagementList();
    if (_onHabitsChanged) _onHabitsChanged();
}

// --- MOVE HABIT ---

export function moveHabit(habitId, direction) {
    const index = habits.findIndex(h => h.id === habitId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= habits.length) return;

    [habits[index], habits[newIndex]] = [habits[newIndex], habits[index]];

    const data = getData();
    if (!data.habitOrder) data.habitOrder = [];
    data.habitOrder = habits.map(h => h.id);
    saveData(data);

    if (navigator.vibrate) navigator.vibrate(20);

    renderHabitsManagementList();
    if (_onHabitsChanged) _onHabitsChanged();
}
