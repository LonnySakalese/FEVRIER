// ============================================================
// SHARE — Partager son score dans les groupes de l'app
// ============================================================

import { appState } from '../services/state.js';
import { db, isFirebaseConfigured } from '../config/firebase.js';
import { showPopup } from './toast.js';

/**
 * Opens the share modal with user's groups
 */
export async function shareDay() {
    if (!isFirebaseConfigured || !appState.currentUser) {
        showPopup('Connecte-toi pour partager', 'warning');
        return;
    }

    const userId = appState.currentUser.uid;

    // Get user's groups
    let groupIds = [];
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        groupIds = userDoc.data()?.groups || [];
    } catch (e) {
        showPopup('Erreur chargement groupes', 'error');
        return;
    }

    if (groupIds.length === 0) {
        showPopup('Rejoins un groupe pour partager ton score !', 'warning');
        return;
    }

    // Get today's score
    const { getData } = await import('../services/storage.js');
    const { getDateKey } = await import('../services/storage.js');
    const data = getData();
    const today = getDateKey(new Date());
    const dayData = data.history?.[today];
    
    let score = 0;
    let completed = 0;
    let total = 0;
    
    if (dayData) {
        const habits = data.customHabits || [];
        total = habits.filter(h => {
            if (!h.schedule || h.schedule.type === 'everyday') return true;
            if (h.schedule.type === 'specific') {
                const dayIndex = new Date().getDay();
                const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
                return h.schedule.days?.includes(dayNames[dayIndex]);
            }
            return true;
        }).length;
        
        if (total > 0) {
            completed = Object.values(dayData.habits || {}).filter(v => v === true).length;
            score = Math.round((completed / total) * 100);
        }
    }

    // Get today's share status for each group
    const shareKey = `shareDay_${today}`;
    const sharedGroups = JSON.parse(localStorage.getItem(shareKey) || '[]');

    // Fetch group details
    let groupsHtml = '';
    for (const gId of groupIds) {
        try {
            const gDoc = await db.collection('groups').doc(gId).get();
            if (!gDoc.exists) continue;
            const g = gDoc.data();
            const alreadyShared = sharedGroups.includes(gId);

            groupsHtml += `
                <div class="share-group-item ${alreadyShared ? 'share-group-shared' : ''}" 
                     id="shareGroup-${gId}"
                     onclick="${alreadyShared ? '' : `shareToGroup('${gId}', ${score}, ${completed}, ${total})`}">
                    <div class="share-group-emoji">${g.emoji || '👥'}</div>
                    <div class="share-group-info">
                        <div class="share-group-name">${escapeHtml(g.name || 'Groupe')}</div>
                        <div class="share-group-status">${alreadyShared ? '✅ Partagé' : 'Appuie pour partager'}</div>
                    </div>
                    <div class="share-group-action">
                        ${alreadyShared 
                            ? '<span style="color: #2ECC71; font-size: 1.2rem;">✓</span>' 
                            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'}
                    </div>
                </div>`;
        } catch (e) { /* skip */ }
    }

    // Show modal
    let modal = document.getElementById('shareGroupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'shareGroupModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <h3>📤 PARTAGER MON SCORE</h3>
            <div class="share-score-preview">
                <div class="share-score-value">${score}%</div>
                <div class="share-score-detail">${completed}/${total} habitudes</div>
            </div>
            <div class="share-group-list">
                ${groupsHtml || '<div style="text-align:center; color: var(--accent-dim); padding: 20px;">Aucun groupe disponible</div>'}
            </div>
            <div class="modal-buttons">
                <button class="modal-btn cancel" onclick="closeShareGroupModal()">Fermer</button>
            </div>
        </div>`;
    
    modal.classList.add('active');
}

/**
 * Share score to a specific group
 */
window.shareToGroup = async function(groupId, score, completed, total) {
    const userId = appState.currentUser?.uid;
    if (!userId) return;

    try {
        // Get user profile
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() || {};
        const pseudo = userData.pseudo || userData.profile?.pseudo || 'Anonyme';
        const avatar = userData.avatar || userData.profile?.avatar || '👤';

        // Send as system-style message in chat
        await db.collection('groups').doc(groupId).collection('messages').add({
            type: 'score-share',
            text: `${pseudo} a partagé son score : ${score}% (${completed}/${total}) 🔥`,
            senderId: userId,
            senderPseudo: pseudo,
            senderAvatar: avatar,
            score,
            completed,
            total,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mark as shared today
        const today = new Date().toISOString().split('T')[0];
        const shareKey = `shareDay_${today}`;
        const sharedGroups = JSON.parse(localStorage.getItem(shareKey) || '[]');
        sharedGroups.push(groupId);
        localStorage.setItem(shareKey, JSON.stringify(sharedGroups));

        // Update UI
        const item = document.getElementById(`shareGroup-${groupId}`);
        if (item) {
            item.classList.add('share-group-shared');
            item.onclick = null;
            const status = item.querySelector('.share-group-status');
            if (status) status.textContent = '✅ Partagé';
            const action = item.querySelector('.share-group-action');
            if (action) action.innerHTML = '<span style="color: #2ECC71; font-size: 1.2rem;">✓</span>';
        }

        showPopup('Score partagé ! 🔥', 'success');
        if (navigator.vibrate) navigator.vibrate([30, 30]);

    } catch (e) {
        console.error('Share error:', e);
        showPopup('Erreur lors du partage', 'error');
    }
};

window.closeShareGroupModal = function() {
    const modal = document.getElementById('shareGroupModal');
    if (modal) modal.classList.remove('active');
};

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
