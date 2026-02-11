// ============================================================
// GROUPS.JS - Système de Groupes
// ============================================================

import { auth, db, isFirebaseConfigured } from '../config/firebase.js';
import { appState, habits } from '../services/state.js';
import { showPopup } from '../ui/toast.js';
import { ConfirmModal } from '../ui/modals.js';
import { getRank } from '../core/ranks.js';
import { renderChatSection, startChatListener, stopChatListener } from '../ui/chat.js';
import { renderChallenges } from '../ui/challenges.js';
import { renderLeaderboard } from '../ui/leaderboard.js';

// ============================================================
// HELPERS
// ============================================================

function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function generateUniqueCode() {
    let code, exists = true;
    while (exists) {
        code = generateCode();
        const snap = await db.collection('groups').where('code', '==', code).get();
        exists = !snap.empty;
    }
    return code;
}

// ============================================================
// RENDER GROUPS LIST (main page)
// ============================================================

export async function renderGroups() {
    const container = document.getElementById('groupsContainer');
    if (!container) return;

    if (!isFirebaseConfigured || !appState.currentUser) {
        container.innerHTML = `
            <div class="group-empty">
                <div class="group-empty-icon">🔒</div>
                <div>Connecte-toi pour accéder aux groupes</div>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="groups-header">
            <button class="group-action-btn" onclick="openCreateGroupModal()">➕ Créer un groupe</button>
            <button class="group-action-btn group-action-btn-secondary" onclick="openJoinGroupModal()">🔗 Rejoindre</button>
        </div>
        <div class="groups-list" id="groupsList">
            <div class="group-empty"><div class="group-empty-icon">⏳</div><div>Chargement...</div></div>
        </div>`;

    try {
        const userDoc = await db.collection('users').doc(appState.currentUser.uid).get();
        const userData = userDoc.data() || {};
        const groupIds = userData.groups || [];

        const listEl = document.getElementById('groupsList');

        if (groupIds.length === 0) {
            listEl.innerHTML = `
                <div class="group-empty">
                    <div class="group-empty-icon">👥</div>
                    <div>Aucun groupe pour le moment</div>
                    <div style="font-size: 0.8rem; margin-top: 8px; color: var(--accent-dim);">
                        Crée un groupe ou rejoins-en un avec un code d'invitation !
                    </div>
                </div>`;
            return;
        }

        let cardsHtml = '';
        for (const gId of groupIds) {
            try {
                const gDoc = await db.collection('groups').doc(gId).get();
                if (!gDoc.exists) continue;
                const g = gDoc.data();

                // Get member avatars (up to 5)
                const membersSnap = await db.collection('groups').doc(gId).collection('members')
                    .limit(5).get();
                const avatars = membersSnap.docs.map(d => d.data().avatar || '👤');

                cardsHtml += `
                    <div class="group-card" onclick="openGroupDetail('${gId}')">
                        <div class="group-card-header">
                            <div class="group-card-name">${escapeHtml(g.name)}</div>
                            <div class="group-card-count">${g.memberCount || 0} membre${(g.memberCount || 0) > 1 ? 's' : ''}</div>
                        </div>
                        <div class="group-card-avatars">
                            ${avatars.map(a => `<span class="group-card-avatar">${a}</span>`).join('')}
                            ${(g.memberCount || 0) > 5 ? `<span class="group-card-avatar-more">+${g.memberCount - 5}</span>` : ''}
                        </div>
                        ${g.description ? `<div class="group-card-desc">${escapeHtml(g.description)}</div>` : ''}
                    </div>`;
            } catch (e) {
                console.warn('Erreur chargement groupe', gId, e);
            }
        }

        listEl.innerHTML = cardsHtml || `
            <div class="group-empty">
                <div class="group-empty-icon">👥</div>
                <div>Aucun groupe trouvé</div>
            </div>`;

    } catch (err) {
        console.error('Erreur renderGroups:', err);
        document.getElementById('groupsList').innerHTML = `
            <div class="group-empty">
                <div class="group-empty-icon">❌</div>
                <div>Erreur de chargement</div>
            </div>`;
    }
}

// ============================================================
// CREATE GROUP
// ============================================================

export function openCreateGroupModal() {
    const modal = document.getElementById('createGroupModal');
    if (!modal) return;

    // Populate habits checkboxes
    const habitsListEl = document.getElementById('createGroupHabits');
    if (habitsListEl) {
        if (habits.length === 0) {
            habitsListEl.innerHTML = '<div style="color: var(--accent-dim); text-align: center; padding: 10px;">Aucune habitude créée</div>';
        } else {
            habitsListEl.innerHTML = habits.map(h => `
                <label class="group-habit-checkbox">
                    <input type="checkbox" value="${h.id}" data-name="${escapeHtml(h.name)}">
                    <span class="group-habit-icon">${h.icon || '📌'}</span>
                    <span class="group-habit-name">${escapeHtml(h.name)}</span>
                </label>
            `).join('');
        }
    }

    // Reset fields
    const nameInput = document.getElementById('createGroupName');
    const descInput = document.getElementById('createGroupDesc');
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';

    modal.classList.add('active');
}

export function closeCreateGroupModal() {
    const modal = document.getElementById('createGroupModal');
    if (modal) modal.classList.remove('active');
}

export async function createGroup() {
    if (!isFirebaseConfigured || !appState.currentUser) {
        showPopup('Tu dois être connecté', 'error');
        return;
    }

    const name = (document.getElementById('createGroupName')?.value || '').trim();
    const description = (document.getElementById('createGroupDesc')?.value || '').trim();

    if (!name) {
        showPopup('Le nom du groupe est requis', 'warning');
        return;
    }
    if (name.length > 30) {
        showPopup('Le nom ne doit pas dépasser 30 caractères', 'warning');
        return;
    }
    if (description.length > 100) {
        showPopup('La description ne doit pas dépasser 100 caractères', 'warning');
        return;
    }

    // Get selected habits
    const checkboxes = document.querySelectorAll('#createGroupHabits input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showPopup('Sélectionne au moins 1 habitude', 'warning');
        return;
    }

    const habitNames = Array.from(checkboxes).map(cb => cb.dataset.name);

    try {
        showPopup('Création en cours...', 'info');
        const code = await generateUniqueCode();
        const userId = appState.currentUser.uid;
        console.log('📝 Création groupe:', { name, habitNames, userId });

        // Get user profile
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() || {};

        // Create group document
        const groupRef = await db.collection('groups').add({
            name,
            description,
            code,
            creatorId: userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            habitNames,
            memberCount: 1
        });
        console.log('✅ Groupe créé:', groupRef.id);

        // Add creator as member
        await db.collection('groups').doc(groupRef.id).collection('members').doc(userId).set({
            pseudo: userData.pseudo || 'Anonyme',
            avatar: userData.avatar || '👤',
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Add group to user's groups array
        await db.collection('users').doc(userId).update({
            groups: firebase.firestore.FieldValue.arrayUnion(groupRef.id)
        });

        closeCreateGroupModal();
        showPopup(`Groupe créé ! Code : ${code}`, 'success', 5000);
        renderGroups();

    } catch (err) {
        console.error('❌ Erreur createGroup:', err);
        showPopup(`Erreur : ${err.message || err.code || 'Inconnue'}`, 'error', 6000);
    }
}

// ============================================================
// JOIN GROUP
// ============================================================

export function openJoinGroupModal() {
    const modal = document.getElementById('joinGroupModal');
    if (!modal) return;

    const input = document.getElementById('joinGroupCode');
    if (input) input.value = '';

    modal.classList.add('active');
}

export function closeJoinGroupModal() {
    const modal = document.getElementById('joinGroupModal');
    if (modal) modal.classList.remove('active');
}

export async function joinGroup() {
    if (!isFirebaseConfigured || !appState.currentUser) {
        showPopup('Tu dois être connecté', 'error');
        return;
    }

    const code = (document.getElementById('joinGroupCode')?.value || '').trim().toUpperCase();

    if (!code || code.length !== 6) {
        showPopup('Entre un code de 6 caractères', 'warning');
        return;
    }

    try {
        const snap = await db.collection('groups').where('code', '==', code).get();

        if (snap.empty) {
            showPopup('Code invalide. Aucun groupe trouvé.', 'error');
            return;
        }

        const groupDoc = snap.docs[0];
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;
        const userId = appState.currentUser.uid;

        // Check if already a member
        const memberDoc = await db.collection('groups').doc(groupId).collection('members').doc(userId).get();
        if (memberDoc.exists) {
            showPopup('Tu es déjà membre de ce groupe !', 'warning');
            return;
        }

        // Check required habits
        const userHabitNames = habits.map(h => h.name.trim().toLowerCase());
        const requiredNames = groupData.habitNames || [];
        const missing = requiredNames.filter(rn => !userHabitNames.includes(rn.trim().toLowerCase()));

        if (missing.length > 0) {
            showPopup(`Habitudes manquantes : ${missing.join(', ')}`, 'error', 6000);
            return;
        }

        // Get user profile
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data() || {};

        // Add as member
        await db.collection('groups').doc(groupId).collection('members').doc(userId).set({
            pseudo: userData.pseudo || 'Anonyme',
            avatar: userData.avatar || '👤',
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Increment member count
        await db.collection('groups').doc(groupId).update({
            memberCount: firebase.firestore.FieldValue.increment(1)
        });

        // Add to user's groups
        await db.collection('users').doc(userId).update({
            groups: firebase.firestore.FieldValue.arrayUnion(groupId)
        });

        closeJoinGroupModal();
        showPopup(`Tu as rejoint "${groupData.name}" !`, 'success');
        renderGroups();

    } catch (err) {
        console.error('Erreur joinGroup:', err);
        showPopup('Erreur lors de la tentative de rejoindre', 'error');
    }
}

// ============================================================
// GROUP DETAIL
// ============================================================

export async function openGroupDetail(groupId) {
    const modal = document.getElementById('groupDetailModal');
    if (!modal) return;

    const content = document.getElementById('groupDetailContent');
    if (content) content.innerHTML = '<div style="text-align:center; padding: 30px; color: var(--accent-dim);">⏳ Chargement...</div>';

    modal.classList.add('active');
    modal.dataset.groupId = groupId;

    try {
        const gDoc = await db.collection('groups').doc(groupId).get();
        if (!gDoc.exists) {
            content.innerHTML = '<div style="text-align:center; padding: 30px; color: var(--accent-dim);">Groupe introuvable</div>';
            return;
        }

        const g = gDoc.data();
        const userId = appState.currentUser?.uid;
        const isCreator = g.creatorId === userId;

        // Get all members
        const membersSnap = await db.collection('groups').doc(groupId).collection('members').get();
        const members = [];

        for (const mDoc of membersSnap.docs) {
            const mData = mDoc.data();
            const memberId = mDoc.id;

            // Calculate today's score for this member
            let todayScore = 0;
            try {
                const todayKey = getTodayKey();
                const completionsSnap = await db.collection('users').doc(memberId)
                    .collection('completions')
                    .where('date', '==', todayKey)
                    .where('completed', '==', true)
                    .get();

                // Match completions to group habits
                const memberHabitsSnap = await db.collection('users').doc(memberId)
                    .collection('habits').get();
                const memberHabits = {};
                memberHabitsSnap.docs.forEach(h => {
                    memberHabits[h.id] = h.data().name;
                });

                const groupHabitNamesLower = (g.habitNames || []).map(n => n.trim().toLowerCase());
                const relevantHabitIds = Object.entries(memberHabits)
                    .filter(([, name]) => groupHabitNamesLower.includes(name.trim().toLowerCase()))
                    .map(([id]) => id);

                const completedIds = completionsSnap.docs.map(d => d.data().habitId);
                const completed = relevantHabitIds.filter(id => completedIds.includes(id)).length;
                todayScore = relevantHabitIds.length > 0 ? Math.round((completed / relevantHabitIds.length) * 100) : 0;
            } catch (e) {
                console.warn('Erreur calcul score membre', memberId, e);
            }

            // Get member profile for rank calculation
            let avgScore = 0;
            try {
                const statsDoc = await db.collection('users').doc(memberId).collection('stats').doc('global').get();
                if (statsDoc.exists) {
                    avgScore = statsDoc.data().avgScore || 0;
                }
            } catch (e) { /* ignore */ }

            members.push({
                id: memberId,
                pseudo: mData.pseudo || 'Anonyme',
                avatar: mData.avatar || '👤',
                todayScore,
                rank: getRank(avgScore)
            });
        }

        // Sort by today's score descending
        members.sort((a, b) => b.todayScore - a.todayScore);

        content.innerHTML = `
            <div class="group-detail">
                <div class="group-detail-header">
                    <h3 class="group-detail-name">${escapeHtml(g.name)}</h3>
                    ${g.description ? `<p class="group-detail-desc">${escapeHtml(g.description)}</p>` : ''}
                    <div class="group-code-section">
                        <span class="group-code-label">Code d'invitation</span>
                        <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
                            <div class="group-code" onclick="copyGroupCode('${g.code}')">
                                <span class="group-code-value">${g.code}</span>
                                <span class="group-code-copy">📋</span>
                            </div>
                            <button class="group-qr-btn" onclick="showQRModal('${g.code}')" style="background: var(--charcoal); border: 1px solid var(--steel); border-radius: 8px; padding: 8px 12px; color: var(--accent); font-size: 1.1rem; cursor: pointer;">📱 QR</button>
                        </div>
                    </div>
                    <div class="group-detail-count">${g.memberCount || members.length} membre${(g.memberCount || members.length) > 1 ? 's' : ''}</div>
                </div>

                <div class="group-detail-habits">
                    <div class="group-detail-habits-title">Habitudes du groupe</div>
                    <div class="group-detail-habits-list">
                        ${(g.habitNames || []).map(n => `<span class="group-habit-tag">${escapeHtml(n)}</span>`).join('')}
                    </div>
                </div>

                <div class="group-tabs">
                    <button class="group-tab active" data-tab="chat" onclick="switchGroupTab('chat', '${groupId}')">💬 Chat</button>
                    <button class="group-tab" data-tab="leaderboard" onclick="switchGroupTab('leaderboard', '${groupId}')">🏆 Classement</button>
                    <button class="group-tab" data-tab="challenges" onclick="switchGroupTab('challenges', '${groupId}')">⚔️ Challenges</button>
                </div>

                <div class="group-tab-content" id="groupTabChat">
                    <div class="group-members-title">Classement du jour</div>
                    <div class="group-members-list">
                        ${members.map((m, i) => `
                            <div class="group-member ${m.id === userId ? 'group-member-me' : ''}">
                                <div class="group-member-position">${i + 1}</div>
                                <div class="group-member-avatar">${m.avatar}</div>
                                <div class="group-member-info">
                                    <div class="group-member-pseudo">${escapeHtml(m.pseudo)}</div>
                                    <div class="group-member-rank" style="color: ${m.rank.color}">${m.rank.name}</div>
                                </div>
                                <div class="group-member-score">${m.todayScore}%</div>
                            </div>
                        `).join('')}
                    </div>

                    ${renderChatSection(groupId)}
                </div>

                <div class="group-tab-content" id="groupTabLeaderboard" style="display: none;">
                    <div id="leaderboardContent">
                        <div class="leaderboard-loading">
                            <div class="leaderboard-loading-icon">⏳</div>
                            <div>Chargement...</div>
                        </div>
                    </div>
                </div>

                <div class="group-tab-content" id="groupTabChallenges" style="display: none;">
                    <button class="challenge-create-btn" onclick="openCreateChallengeModal('${groupId}')">➕ Créer un challenge</button>
                    <div id="challengesTabContent">
                        <div style="text-align:center; padding: 20px; color: var(--accent-dim);">⏳ Chargement...</div>
                    </div>
                </div>

                <div class="group-detail-actions">
                    ${isCreator ? `
                        <button class="group-danger-btn" onclick="deleteGroup('${groupId}')">🗑️ Supprimer le groupe</button>
                    ` : `
                        <button class="group-danger-btn" onclick="leaveGroup('${groupId}')">🚪 Quitter le groupe</button>
                    `}
                </div>
            </div>`;

        // Start real-time chat listener
        startChatListener(groupId);

    } catch (err) {
        console.error('Erreur openGroupDetail:', err);
        content.innerHTML = '<div style="text-align:center; padding: 30px; color: var(--accent-dim);">Erreur de chargement</div>';
    }
}

// ============================================================
// TAB SWITCHING (Chat / Leaderboard)
// ============================================================

let leaderboardLoaded = false;
let challengesLoaded = false;

export function switchGroupTab(tab, groupId) {
    const chatPanel = document.getElementById('groupTabChat');
    const leaderboardPanel = document.getElementById('groupTabLeaderboard');
    const challengesPanel = document.getElementById('groupTabChallenges');

    // Update tab buttons
    document.querySelectorAll('.group-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Hide all
    if (chatPanel) chatPanel.style.display = 'none';
    if (leaderboardPanel) leaderboardPanel.style.display = 'none';
    if (challengesPanel) challengesPanel.style.display = 'none';

    if (tab === 'chat') {
        if (chatPanel) chatPanel.style.display = 'block';
    } else if (tab === 'leaderboard') {
        if (leaderboardPanel) leaderboardPanel.style.display = 'block';
        if (!leaderboardLoaded) {
            leaderboardLoaded = true;
            renderLeaderboard(groupId);
        }
    } else if (tab === 'challenges') {
        if (challengesPanel) challengesPanel.style.display = 'block';
        if (!challengesLoaded) {
            challengesLoaded = true;
            renderChallenges(groupId);
        }
    }
}

export function closeGroupDetail() {
    leaderboardLoaded = false;
    challengesLoaded = false;
    stopChatListener();
    const modal = document.getElementById('groupDetailModal');
    if (modal) modal.classList.remove('active');
}

// ============================================================
// LEAVE / DELETE GROUP
// ============================================================

export async function leaveGroup(groupId) {
    const confirmed = await ConfirmModal.show({
        title: '🚪 QUITTER LE GROUPE',
        message: 'Es-tu sûr de vouloir quitter ce groupe ?',
        confirmText: 'Quitter',
        cancelText: 'Annuler',
        danger: true
    });

    if (!confirmed) return;

    try {
        const userId = appState.currentUser.uid;

        await db.collection('groups').doc(groupId).collection('members').doc(userId).delete();
        await db.collection('groups').doc(groupId).update({
            memberCount: firebase.firestore.FieldValue.increment(-1)
        });
        await db.collection('users').doc(userId).update({
            groups: firebase.firestore.FieldValue.arrayRemove(groupId)
        });

        closeGroupDetail();
        showPopup('Tu as quitté le groupe', 'success');
        renderGroups();

    } catch (err) {
        console.error('Erreur leaveGroup:', err);
        showPopup('Erreur lors de la sortie du groupe', 'error');
    }
}

export async function deleteGroup(groupId) {
    const confirmed = await ConfirmModal.show({
        title: '🗑️ SUPPRIMER LE GROUPE',
        message: 'Supprimer ce groupe définitivement ?',
        subtext: 'Tous les membres seront retirés.',
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        danger: true
    });

    if (!confirmed) return;

    try {
        // Get all members to remove from their groups arrays
        const membersSnap = await db.collection('groups').doc(groupId).collection('members').get();

        const batch = db.batch();

        for (const mDoc of membersSnap.docs) {
            // Remove group from each member's groups array
            batch.update(db.collection('users').doc(mDoc.id), {
                groups: firebase.firestore.FieldValue.arrayRemove(groupId)
            });
            // Delete member sub-doc
            batch.delete(mDoc.ref);
        }

        // Delete the group document
        batch.delete(db.collection('groups').doc(groupId));

        await batch.commit();

        closeGroupDetail();
        showPopup('Groupe supprimé', 'success');
        renderGroups();

    } catch (err) {
        console.error('Erreur deleteGroup:', err);
        showPopup('Erreur lors de la suppression', 'error');
    }
}

// ============================================================
// COPY CODE
// ============================================================

export function copyGroupCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showPopup('Code copié !', 'success');
    }).catch(() => {
        showPopup(`Code : ${code}`, 'info');
    });
}

// ============================================================
// PROFILE GROUPS SECTION
// ============================================================

export async function renderProfileGroups() {
    const container = document.getElementById('profileGroups');
    if (!container) return;

    if (!isFirebaseConfigured || !appState.currentUser) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--accent-dim);">
                <div style="font-size: 2rem; margin-bottom: 10px;">👥</div>
                <div>Connecte-toi pour voir tes groupes</div>
            </div>`;
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(appState.currentUser.uid).get();
        const userData = userDoc.data() || {};
        const groupIds = userData.groups || [];

        if (groupIds.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--accent-dim);">
                    <div style="font-size: 2rem; margin-bottom: 10px;">👥</div>
                    <div>Aucun groupe pour le moment</div>
                    <div style="font-size: 0.8rem; margin-top: 5px; cursor: pointer; color: var(--accent);"
                         onclick="showPage('groups', event)">Rejoindre ou créer un groupe →</div>
                </div>`;
            return;
        }

        let html = '<div class="profile-groups-list">';
        for (const gId of groupIds) {
            try {
                const gDoc = await db.collection('groups').doc(gId).get();
                if (!gDoc.exists) continue;
                const g = gDoc.data();
                html += `
                    <div class="profile-group-item" onclick="openGroupDetail('${gId}')">
                        <span class="profile-group-name">${escapeHtml(g.name)}</span>
                        <span class="profile-group-count">${g.memberCount || 0} 👥</span>
                    </div>`;
            } catch (e) { /* skip */ }
        }
        html += '</div>';
        container.innerHTML = html;

    } catch (err) {
        console.error('Erreur renderProfileGroups:', err);
    }
}

// ============================================================
// UTILS
// ============================================================

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
