/**
 * admin.js — Admin Panel page
 */
import { isAdmin } from '../core/admin.js';
import { appState } from '../services/state.js';

let cachedUsers = null;
let cachedGroups = null;

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
 * Load admin panel data (counts only for menu)
 */
export async function loadAdminPanel() {
    const uid = appState.currentUser?.uid;
    if (!uid || !(await isAdmin(uid))) return;

    // Reset to menu view
    const menu = document.getElementById('adminMenu');
    const detail = document.getElementById('adminDetail');
    if (menu) menu.style.display = 'block';
    if (detail) detail.style.display = 'none';

    const db = firebase.firestore();

    // Load counts
    try {
        const usersSnap = await db.collection('users').get();
        cachedUsers = usersSnap.docs;
        const el = document.getElementById('adminTotalUsers');
        if (el) el.textContent = usersSnap.size;
    } catch (e) { console.warn('Admin: users error', e); }

    try {
        const groupsSnap = await db.collection('groups').get();
        cachedGroups = groupsSnap.docs;
        const el = document.getElementById('adminTotalGroups');
        if (el) el.textContent = groupsSnap.size;
    } catch (e) { console.warn('Admin: groups error', e); }

    try {
        let total = 0;
        if (cachedGroups) {
            for (const g of cachedGroups) {
                const chSnap = await g.ref.collection('challenges').get();
                total += chSnap.size;
            }
        }
        const el = document.getElementById('adminTotalChallenges');
        if (el) el.textContent = total;
    } catch (e) { console.warn('Admin: challenges error', e); }
}

/**
 * Open a section detail
 */
window.openAdminSection = function(section) {
    const menu = document.getElementById('adminMenu');
    const detail = document.getElementById('adminDetail');
    const title = document.getElementById('adminDetailTitle');
    const content = document.getElementById('adminDetailContent');
    if (!menu || !detail || !content) return;

    menu.style.display = 'none';
    detail.style.display = 'block';

    if (section === 'users') {
        title.textContent = '👥 UTILISATEURS';
        renderUsersList(content, cachedUsers || []);
    } else if (section === 'groups') {
        title.textContent = '🏘️ GROUPES';
        renderGroupsList(content, cachedGroups || []);
    } else if (section === 'challenges') {
        title.textContent = '⚔️ CHALLENGES';
        renderChallengesList(content);
    }
};

window.closeAdminSection = function() {
    const menu = document.getElementById('adminMenu');
    const detail = document.getElementById('adminDetail');
    if (menu) menu.style.display = 'block';
    if (detail) detail.style.display = 'none';
};

function renderUsersList(container, docs) {
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

function renderGroupsList(container, docs) {
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

async function renderChallengesList(container) {
    container.innerHTML = '<div class="skeleton-loader" style="height: 60px; border-radius: 12px;"></div>';
    
    if (!cachedGroups || cachedGroups.length === 0) {
        container.innerHTML = '<div style="text-align:center; color: var(--accent-dim); padding: 20px;">Aucun challenge</div>';
        return;
    }

    let html = '';
    for (const g of cachedGroups) {
        const gData = g.data();
        try {
            const chSnap = await g.ref.collection('challenges').get();
            for (const ch of chSnap.docs) {
                const c = ch.data();
                const status = c.status || 'active';
                const statusColor = status === 'active' ? '#2ECC71' : '#E74C3C';
                html += `<div class="admin-user-card">
                    <div class="admin-user-avatar">⚔️</div>
                    <div class="admin-user-info">
                        <div class="admin-user-name">${c.name || 'Challenge'}</div>
                        <div class="admin-user-email">${gData.emoji || '👥'} ${gData.name || 'Groupe'} · ${c.duration || '?'}j</div>
                    </div>
                    <div class="admin-user-meta">
                        <span class="admin-user-last" style="color:${statusColor}">${status}</span>
                    </div>
                </div>`;
            }
        } catch (e) { /* skip */ }
    }

    container.innerHTML = html || '<div style="text-align:center; color: var(--accent-dim); padding: 20px;">Aucun challenge</div>';
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
