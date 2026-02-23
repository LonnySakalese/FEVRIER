/**
 * admin.js — Admin Panel page
 */
import { isAdmin } from '../core/admin.js';
import { appState } from '../services/state.js';

/**
 * Show/hide admin button on profile based on admin status
 */
export async function checkAdminButton() {
    const btn = document.getElementById('adminPanelBtn');
    if (!btn) return;
    const uid = appState.currentUser?.uid;
    if (uid && await isAdmin(uid)) {
        btn.style.display = 'flex';
    } else {
        btn.style.display = 'none';
    }
}

/**
 * Load admin panel data
 */
export async function loadAdminPanel() {
    const uid = appState.currentUser?.uid;
    if (!uid || !(await isAdmin(uid))) return;

    const db = firebase.firestore();

    // Total users
    try {
        const usersSnap = await db.collection('users').get();
        const el = document.getElementById('adminTotalUsers');
        if (el) el.textContent = usersSnap.size;

        // Render users list
        renderUsersList(usersSnap.docs);
    } catch (e) {
        console.warn('Admin: users load error', e);
    }

    // Total groups
    try {
        const groupsSnap = await db.collection('groups').get();
        const el = document.getElementById('adminTotalGroups');
        if (el) el.textContent = groupsSnap.size;

        renderGroupsList(groupsSnap.docs);
    } catch (e) {
        console.warn('Admin: groups load error', e);
    }

    // Total challenges (across all groups)
    try {
        const groupsSnap = await db.collection('groups').get();
        let totalChallenges = 0;
        for (const g of groupsSnap.docs) {
            const chSnap = await g.ref.collection('challenges').get();
            totalChallenges += chSnap.size;
        }
        const el = document.getElementById('adminTotalChallenges');
        if (el) el.textContent = totalChallenges;
    } catch (e) {
        console.warn('Admin: challenges load error', e);
    }
}

function renderUsersList(docs) {
    const container = document.getElementById('adminUsersList');
    if (!container) return;

    if (docs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color: var(--accent-dim); padding: 20px;">Aucun utilisateur</div>';
        return;
    }

    container.innerHTML = docs.map(doc => {
        const d = doc.data();
        const pseudo = d.pseudo || d.displayName || 'Sans pseudo';
        const avatar = d.avatar || '👤';
        const email = d.email || '';
        const lastLogin = d.lastLogin?.toDate?.();
        const lastStr = lastLogin ? timeSince(lastLogin) : 'jamais';

        return `<div class="admin-user-card">
            <div class="admin-user-avatar">${avatar}</div>
            <div class="admin-user-info">
                <div class="admin-user-name">${pseudo}</div>
                <div class="admin-user-email">${email}</div>
            </div>
            <div class="admin-user-meta">
                <span class="admin-user-last">${lastStr}</span>
            </div>
        </div>`;
    }).join('');
}

function renderGroupsList(docs) {
    const container = document.getElementById('adminGroupsList');
    if (!container) return;

    if (docs.length === 0) {
        container.innerHTML = '<div style="text-align:center; color: var(--accent-dim); padding: 20px;">Aucun groupe</div>';
        return;
    }

    container.innerHTML = docs.map(doc => {
        const d = doc.data();
        const name = d.name || 'Sans nom';
        const emoji = d.emoji || '👥';
        const members = d.memberCount || d.members?.length || '?';

        return `<div class="admin-group-card">
            <div class="admin-user-avatar">${emoji}</div>
            <div class="admin-user-info">
                <div class="admin-user-name">${name}</div>
                <div class="admin-user-email">${members} membres</div>
            </div>
        </div>`;
    }).join('');
}

function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'à l\'instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
}
