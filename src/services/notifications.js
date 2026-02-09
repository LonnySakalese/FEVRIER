// ============================================================
// NOTIFICATIONS
// ============================================================

import { habits } from './state.js';
import { getData, saveData, getDayData } from './storage.js';
import { showPopup } from '../ui/toast.js';

// Référence vers showValidateDayModal (set by app.js to avoid circular dep)
let _showValidateDayModal = null;
export function setShowValidateDayModal(fn) { _showValidateDayModal = fn; }

// Demande la permission d'envoyer des notifications
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Notifications non supportées');
        return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
}

// Programme une notification quotidienne à l'heure configurée
export function scheduleNotification() {
    const data = getData();
    const notifTime = data.notificationTime || '21:00';

    const [hours, minutes] = notifTime.split(':').map(Number);

    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    if (now > target) {
        target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();
    setTimeout(() => {
        sendNotification();
        scheduleNotification();
    }, delay);

    console.log(`⏰ Notification programmée dans ${Math.round(delay / 60000)} minutes (${notifTime})`);
}

// Envoie la notification avec un message personnalisé
export function sendNotification() {
    if (Notification.permission !== 'granted') return;
    const dayData = getDayData(new Date());
    const completed = habits.filter(h => dayData[h.id]).length;
    const remaining = habits.length - completed;
    let title, body;
    if (remaining === 0) {
        title = "🏆 LÉGENDE !"; body = "Tu as complété toutes tes habitudes.";
    } else if (remaining <= 2) {
        title = "⚔️ PRESQUE WARRIOR !"; body = `Plus que ${remaining} habitude${remaining > 1 ? 's' : ''} à valider. Tu peux le faire !`;
    } else {
        title = "🔥 RAPPEL WARRIOR"; body = `${remaining} habitudes restantes. Ne lâche rien !`;
    }
    const notification = new Notification(title, {
        body: body,
        icon: 'data:image/svg+xml,...',
        tag: 'warrior-reminder',
        renotify: true
    });
    notification.onclick = () => { window.focus(); notification.close(); };

    // Afficher automatiquement le popup de validation
    setTimeout(() => {
        if (_showValidateDayModal) _showValidateDayModal();
    }, 2000);
}

// Active ou désactive les notifications via le bouton
export function toggleNotifications() {
    const data = getData();
    if (data.notificationsEnabled) {
        data.notificationsEnabled = false;
        saveData(data);
        showPopup('🔕 Notifications désactivées', 'info');
    } else {
        requestNotificationPermission().then(granted => {
            if (granted) {
                data.notificationsEnabled = true;
                saveData(data);
                scheduleNotification();
                const notifTime = data.notificationTime || '21:00';
                showPopup(`🔔 Notifications activées ! Rappel à ${notifTime}.`, 'success');
            } else {
                showPopup('❌ Permission refusée', 'error');
            }
        });
    }
    updateNotificationButton();
}

// Met à jour le texte du bouton de notifications
export function updateNotificationButton() {
    const btn = document.getElementById('notifBtn');
    if (btn) {
        const data = getData();
        btn.textContent = data.notificationsEnabled ? '🔔 Notifications ON' : '🔕 Notifications OFF';
    }
}

// Met à jour l'heure de notification personnalisée
export function updateNotificationTime() {
    const timeInput = document.getElementById('notifTime');
    if (!timeInput) return;

    const time = timeInput.value;
    const data = getData();
    data.notificationTime = time;
    saveData(data);

    console.log(`⏰ Heure de notification mise à jour: ${time}`);

    if (data.notificationsEnabled) {
        scheduleNotification();
    }
}

// Charge l'heure de notification configurée dans l'input
export function loadNotificationTime() {
    const notifTimeInput = document.getElementById('notifTime');
    if (!notifTimeInput) return;

    const data = getData();
    const savedTime = data.notificationTime || '21:00';
    notifTimeInput.value = savedTime;
}
