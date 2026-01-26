import { initFirebase, listenToAuthChanges } from './services/auth.js';
import { subscribe, getState } from './services/state.js';

// --- INITIALISATION DE L'APPLICATION ---
document.addEventListener('DOMContentLoaded', () => {
    const { auth, db } = initFirebase();
    listenToAuthChanges();

    subscribe(state => {
        // This function will be called every time the state changes.
        // We will use this to re-render the UI.
        console.log('State changed:', state);
        renderApp(state);
    });

    function renderApp(state) {
        if (state.currentUser) {
            // User is logged in, show the main app
            showAppPage('today');
            initializeApp();
        } else {
            // User is not logged in, show the auth page
            showAppPage('auth');
        }
    }

    async function initializeApp() {
        await loadCustomHabits();
        updateUI();
        const savedData = getData();
        if (savedData.notificationsEnabled && Notification.permission === 'granted') {
            scheduleNotification();
        }
        document.querySelector('.header .quote').textContent = `"${getGreeting()}" - STAY HARD`;
        updateNotificationButton();
        loadNotificationTime(); // Charger l'heure de notification configurée
    }

    function showAppPage(pageName) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const pageElement = document.getElementById('page-' + pageName);
        if (pageElement) {
            pageElement.classList.add('active');
        }
        const navItem = document.querySelector(`.nav-item[onclick*="'${pageName}'"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Masquer header et navigation si on est sur la page auth
        const header = document.querySelector('.header');
        const bottomNav = document.querySelector('.bottom-nav');
        if (pageName === 'auth') {
            if (header) header.style.display = 'none';
            if (bottomNav) bottomNav.style.display = 'none';
        } else {
            if (header) header.style.display = 'block';
            if (bottomNav) bottomNav.style.display = 'flex';
        }
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch((err) => {
            console.log('Échec de l\'enregistrement du Service Worker:', err);
        });
    }
});