// ============================================================
// AUTO-MESSAGES - Messages système automatiques dans les chats
// ============================================================

import { db, isFirebaseConfigured } from '../config/firebase.js';

/**
 * Envoie un message système dans le chat d'un groupe
 * @param {string} groupId - ID du groupe Firestore
 * @param {string} text - Texte du message système
 */
export async function sendAutoMessage(groupId, text) {
    if (!isFirebaseConfigured || !db) return;

    try {
        await db.collection('groups').doc(groupId).collection('messages').add({
            type: 'system',
            text,
            senderId: 'system',
            senderPseudo: '🤖 Système',
            senderAvatar: '🤖',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Erreur sendAutoMessage:', err);
    }
}

/**
 * Envoie un message système dans TOUS les groupes d'un utilisateur
 * @param {string} userId - UID de l'utilisateur
 * @param {string} text - Texte du message système
 */
export async function broadcastToUserGroups(userId, text) {
    if (!isFirebaseConfigured || !db) return;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();
        const groupIds = userData.groups || [];

        if (groupIds.length === 0) return;

        const promises = groupIds.map(groupId => sendAutoMessage(groupId, text));
        await Promise.all(promises);
    } catch (err) {
        console.error('Erreur broadcastToUserGroups:', err);
    }
}
