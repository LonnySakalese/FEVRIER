# Configuration de Warrior Habit Tracker

## ✅ Fonctionnalités implémentées

### 1. Gestion dynamique des habitudes
- ✅ Ajouter des habitudes personnalisées (icône + couleur)
- ✅ Modifier le nom des habitudes
- ✅ Supprimer des habitudes
- ✅ Réorganiser l'ordre (↑ ↓)
- ✅ Nombre illimité d'habitudes

### 2. Système de comptes Firebase (optionnel)
- ✅ Inscription / Connexion (email + password)
- ✅ Migration automatique localStorage → Firestore
- ✅ Synchronisation cloud multi-appareils
- ✅ Mode hors ligne avec Firestore

### 3. Traduction
- ✅ Toutes les citations en français
- ✅ Interface 100% française

## 🚀 Utilisation immédiate (sans configuration)

L'application fonctionne **directement** sans aucune configuration :

1. Ouvrez `index.html` dans votre navigateur
2. Utilisez l'app normalement
3. Vos données sont sauvegardées localement (localStorage)
4. Gérez vos habitudes via **"⚙️ GÉRER LES HABITUDES"**

**Limites du mode local :**
- Données stockées uniquement sur cet appareil
- Pas de synchronisation entre appareils
- Données perdues si vous videz le cache du navigateur

## 🔥 Configuration Firebase (synchronisation cloud)

### Étape 1 : Créer un projet Firebase

1. Allez sur https://console.firebase.google.com/
2. Cliquez sur **"Ajouter un projet"**
3. Nom du projet : `warrior-tracker` (ou autre)
4. Suivez les étapes (Google Analytics optionnel)

### Étape 2 : Activer Authentication

1. Menu Firebase → **Authentication**
2. Cliquez sur **"Commencer"**
3. Onglet **"Sign-in method"**
4. Activez **"E-mail/Mot de passe"**
5. Cliquez sur **"Enregistrer"**

### Étape 3 : Activer Firestore

1. Menu Firebase → **Firestore Database**
2. Cliquez sur **"Créer une base de données"**
3. Mode : **"Démarrer en mode production"**
4. Emplacement : Choisissez le plus proche (ex: `europe-west`)

### Étape 4 : Configurer les règles de sécurité

1. Dans Firestore Database → **Règles**
2. Remplacez le contenu par :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règle : Un utilisateur ne peut lire/écrire que ses propres données
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Cliquez sur **"Publier"**

### Étape 5 : Obtenir la configuration Firebase

1. Dans Firebase Console → **Paramètres du projet** ⚙️ (en haut à gauche)
2. Section **"Vos applications"**
3. Cliquez sur l'icône **Web** `</>`
4. Donnez un nom : `Warrior Tracker Web`
5. **NE PAS** cocher "Configurer Firebase Hosting"
6. Cliquez sur **"Enregistrer l'application"**
7. Copiez les valeurs de `firebaseConfig`

### Étape 6 : Mettre à jour index.html

Ouvrez `index.html` et cherchez la section **FIREBASE CONFIGURATION** (lignes ~1297-1304).

Remplacez :
```javascript
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_PROJECT.firebaseapp.com",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_PROJECT.appspot.com",
    messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
    appId: "VOTRE_APP_ID"
};
```

Par vos vraies valeurs :
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC...",
    authDomain: "warrior-tracker-12345.firebaseapp.com",
    projectId: "warrior-tracker-12345",
    storageBucket: "warrior-tracker-12345.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

### Étape 7 : Ajouter les domaines autorisés

1. Firebase Console → **Authentication** → **Settings**
2. Section **"Authorized domains"**
3. Ajoutez votre domaine GitHub Pages : `lonnysakalese.github.io`
4. Ajoutez `localhost` pour les tests locaux

### Étape 8 : Tester

1. Ouvrez `index.html` dans votre navigateur
2. Vous devriez voir la page de **connexion/inscription**
3. Créez un compte avec email + mot de passe
4. Si vous aviez des données locales, une modal de **migration** s'affichera
5. Vos données sont maintenant synchronisées dans le cloud ! ☁️

## 📊 Structure des données

### localStorage (mode local)
```javascript
{
  days: {
    "2025-12-28": {
      "coldshower": true,
      "reading": false,
      ...
    }
  },
  stats: { bestStreak: 0 },
  customHabitNames: {
    "coldshower": "DOUCHE GLACÉE"
  },
  customHabits: [
    {
      id: "habit_1234567890",
      name: "MÉDITATION",
      icon: "🧘",
      color: "#9370DB"
    }
  ],
  deletedHabits: ["habit_999"],
  habitOrder: ["coldshower", "reading", ...]
}
```

### Firestore (mode cloud)
```
users/{userId}/
  ├── email, createdAt, lastLogin
  ├── habits/ (collection)
  │   └── {habitId}
  │       ├── name, icon, color
  │       ├── order, isActive
  │       └── createdAt
  ├── completions/ (collection)
  │   └── {date-habitId}
  │       ├── date, habitId
  │       ├── completed
  │       └── completedAt
  └── stats/ (collection)
      └── global
          ├── bestStreak
          ├── totalWins
          └── perfectDaysCount
```

## 🎯 Gestion des habitudes

### Ajouter une habitude
1. Page **"Mindset"** → **"⚙️ GÉRER LES HABITUDES"**
2. Cliquez sur **"➕ AJOUTER UNE HABITUDE"**
3. Remplissez :
   - **Nom** : Ex: "MÉDITATION"
   - **Icône** : Choisissez parmi 16 emojis
   - **Couleur** : Choisissez parmi 12 couleurs
4. Cliquez sur **"AJOUTER"**

### Modifier une habitude
1. Dans la liste des habitudes
2. Modifiez le nom directement
3. Cliquez sur **💾** pour sauvegarder

### Supprimer une habitude
1. Cliquez sur **🗑️** à côté de l'habitude
2. Confirmez la suppression
3. L'historique est conservé mais l'habitude n'apparaît plus

### Réorganiser
1. Utilisez les boutons **▲** et **▼**
2. L'ordre est sauvegardé automatiquement

## ⚠️ Dépannage

### "Firebase n'est pas configuré"
➡️ Vous utilisez le mode localStorage (normal si pas configuré)
➡️ Pour activer Firebase, suivez les étapes ci-dessus

### "Erreur d'authentification"
➡️ Vérifiez que Email/Password est activé dans Firebase Auth
➡️ Vérifiez que votre domaine est dans "Authorized domains"

### "Permission denied" dans Firestore
➡️ Vérifiez vos règles de sécurité Firestore (Étape 4)
➡️ Assurez-vous d'être connecté

### La migration ne fonctionne pas
➡️ Vérifiez la console du navigateur (F12)
➡️ Les données localStorage sont peut-être corrompues
➡️ Essayez de vider le localStorage et recommencer

## 🔒 Sécurité

- ✅ Les règles Firestore empêchent l'accès cross-user
- ✅ Les mots de passe sont hashés par Firebase
- ✅ Les données sont chiffrées en transit (HTTPS)
- ✅ Mode hors ligne sécurisé avec persistance locale

## 📝 Notes importantes

1. **Migration** : Elle s'effectue une seule fois, au premier login
2. **Ordre des habitudes** : Sauvegardé séparément pour chaque utilisateur
3. **Suppression** : Soft delete (l'historique reste intact)
4. **Compatibilité** : Fonctionne sur Chrome, Firefox, Safari, Edge
5. **PWA** : Installable comme app sur mobile/desktop

## 🚀 Déploiement GitHub Pages

Vos fichiers sont déjà sur GitHub. Pour activer :

1. GitHub → Votre repo → **Settings**
2. Section **"Pages"**
3. Source : **"Deploy from a branch"**
4. Branch : **main** / Folder : **/ (root)**
5. Cliquez sur **"Save"**
6. L'app sera accessible sur : `https://lonnysakalese.github.io/Habit-Tracker/`

## 🎉 Vous êtes prêt !

L'application fonctionne en mode **local** ou **cloud** selon votre configuration.

**Mode recommandé pour débuter** : Local (aucune config nécessaire)
**Mode recommandé pour production** : Cloud (avec Firebase configuré)

Bon courage dans ton parcours de warrior ! 💪⚔️
