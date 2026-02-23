/**
 * admin.js — Système admin global
 * Les admins sont stockés dans Firestore: /config/admins { uids: [...] }
 * Le premier utilisateur à accéder à /config/admins quand il n'existe pas le crée avec son UID
 */

let cachedAdminUids = null;

/**
 * Vérifie si l'utilisateur actuel est admin
 */
export async function isAdmin(uid) {
    if (!uid) return false;
    
    if (cachedAdminUids) return cachedAdminUids.includes(uid);
    
    try {
        const doc = await firebase.firestore().collection('config').doc('admins').get();
        if (doc.exists) {
            cachedAdminUids = doc.data().uids || [];
            return cachedAdminUids.includes(uid);
        }
        return false;
    } catch (e) {
        console.warn('Admin check error:', e);
        return false;
    }
}

/**
 * Initialise le doc admin avec l'UID donné (first-time setup)
 */
export async function setupAdmin(uid) {
    if (!uid) return false;
    try {
        const doc = await firebase.firestore().collection('config').doc('admins').get();
        if (!doc.exists) {
            await firebase.firestore().collection('config').doc('admins').set({
                uids: [uid],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            cachedAdminUids = [uid];
            console.log('✅ Admin setup:', uid);
            return true;
        }
        return false; // Already exists
    } catch (e) {
        console.error('Admin setup error:', e);
        return false;
    }
}

/**
 * Clear le cache admin (pour forcer un re-check)
 */
export function clearAdminCache() {
    cachedAdminUids = null;
}
