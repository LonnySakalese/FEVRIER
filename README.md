# ⚔️ WARRIOR HABIT TRACKER

**Tracker d'habitudes ultime avec mentalité de champion**

🔗 **Site web** : https://lonnysakalese.github.io/Habit-Tracker/

---

## 🎯 Description

Warrior Habit Tracker est une application de suivi d'habitudes inspirée de **David Goggins** et de la mentalité warrior. Elle combine un design minimaliste dark mode avec des fonctionnalités puissantes pour transformer tes habitudes et devenir la meilleure version de toi-même.

### ✨ Version 2.0 - Nouvelles fonctionnalités

- ✅ **Gestion dynamique des habitudes** - Ajoute, modifie, supprime tes habitudes
- ✅ **Système de comptes** - Synchronisation cloud avec Firebase (optionnel)
- ✅ **Citations françaises** - Toutes les citations motivantes traduites
- ✅ **Personnalisation complète** - Icônes, couleurs, ordre personnalisables
- ✅ **Migration automatique** - Garde tes données existantes
- ✅ **Mode hors ligne** - Fonctionne partout, tout le temps

---

## 🚀 Utilisation rapide

### Mode local (sans configuration)

1. Clone ou télécharge ce repo
2. Ouvre `index.html` dans ton navigateur
3. Commence à tracker tes habitudes !

**Tes données sont sauvegardées localement** - aucune configuration nécessaire.

### Mode cloud (avec synchronisation)

Pour synchroniser entre appareils :

1. Suis le guide dans [`CONFIGURATION.md`](CONFIGURATION.md)
2. Configure Firebase (gratuit)
3. Connecte-toi à ton compte
4. Tes données sont synchronisées ! ☁️

---

## 🎮 Fonctionnalités principales

### 📊 Suivi quotidien
- ✅ Coche tes habitudes chaque jour
- ✅ Visualise ta progression en temps réel
- ✅ Système de streak (séries consécutives)
- ✅ Score journalier en pourcentage
- ✅ Verrouillage automatique des jours passés

### 🏆 Système de rangs
Progresse à travers 5 rangs selon ta moyenne :
- **RECRUIT** (0-30%) - Débutant
- **SOLDIER** (31-50%) - En progression
- **WARRIOR** (51-70%) - Discipliné
- **ELITE** (71-85%) - Excellence
- **LEGEND** (86-100%) - Maîtrise totale

### ⚙️ Gestion des habitudes
- ➕ **Ajouter** des habitudes personnalisées
- ✏️ **Renommer** n'importe quelle habitude
- 🗑️ **Supprimer** les habitudes (historique conservé)
- ↕️ **Réorganiser** l'ordre (boutons ▲▼)
- 🎨 **16 icônes** et **12 couleurs** au choix
- 📦 **Nombre illimité** d'habitudes

### 📈 Statistiques détaillées
- Graphique de progression sur 7 jours
- Performance par habitude (bar chart)
- Score du mois en cours
- Meilleure série de tous les temps
- Nombre total de victoires
- Moyenne globale

### 🔥 Motivation
- **Citations inspirantes** de champions
- **Les 10 commandements** du warrior
- **Confettis** lors des jours parfaits (100%)
- **Vibration** tactile pour le feedback
- **Messages personnalisés** selon l'heure

### 🔔 Notifications
- Rappel quotidien à 21h
- Messages adaptatifs selon ta progression
- Activable/désactivable facilement

### 💾 Sauvegarde & Sync
- **Mode local** : localStorage (pas de config)
- **Mode cloud** : Firebase Firestore (sync multi-appareils)
- **Migration automatique** des données existantes
- **Mode hors ligne** fonctionnel dans les deux modes

---

## 📸 Captures d'écran

*(L'app utilise un thème sombre élégant avec des accents beige)*

**Pages principales :**
- 🎯 Missions du jour - Liste des habitudes avec checkboxes
- 📊 Stats - Graphiques et statistiques détaillées
- 🔥 Mindset - Citations et paramètres

**Modals :**
- 🔐 Connexion/Inscription (si Firebase configuré)
- ⚙️ Gestion des habitudes (ajouter/modifier/supprimer)
- 🔄 Migration des données (automatique)

---

## 🛠️ Technologies

- **Frontend** : HTML5, CSS3, JavaScript Vanilla
- **Graphiques** : Chart.js
- **Backend** : Firebase (optionnel)
  - Authentication
  - Firestore Database
  - Offline Persistence
- **PWA** : Service Workers, Manifest
- **Design** : Mobile-first, Responsive
- **Animations** : CSS Keyframes + Transitions

---

## 📁 Structure du projet

```
Habit-Tracker/
├── index.html              # Application principale (monolithe)
├── sw.js                   # Service Worker (PWA)
├── manifest.json           # Manifest PWA
├── favicon.svg            # Logo de l'app
├── CONFIGURATION.md       # Guide de configuration Firebase
├── CHANGELOG.md           # Historique des changements
└── README.md              # Ce fichier
```

---

## 🔧 Installation & Configuration

### Installation locale (recommandé pour débuter)

```bash
# Clone le repo
git clone https://github.com/lonnysakalese/Habit-Tracker.git

# Entre dans le dossier
cd Habit-Tracker

# Ouvre index.html dans ton navigateur
# (double-clic ou "open index.html" sur macOS)
```

**C'est tout !** L'app fonctionne immédiatement en mode local.

### Configuration Firebase (pour sync cloud)

Voir le guide détaillé dans [`CONFIGURATION.md`](CONFIGURATION.md)

**Résumé rapide :**
1. Crée un projet Firebase
2. Active Authentication (Email/Password)
3. Active Firestore Database
4. Copie ta config Firebase
5. Remplace dans `index.html` (lignes ~1297-1304)
6. Déploie les règles de sécurité

---

## 📚 Documentation

- **[CONFIGURATION.md](CONFIGURATION.md)** - Guide complet Firebase + FAQ
- **[CHANGELOG.md](CHANGELOG.md)** - Historique des versions
- **Code commenté** - Tous les fichiers sont documentés

---

## 🎯 Utilisation

### Ajouter une habitude

1. Va dans **"Mindset"** → **"⚙️ GÉRER LES HABITUDES"**
2. Clique sur **"➕ AJOUTER UNE HABITUDE"**
3. Remplis :
   - Nom (ex: MÉDITATION)
   - Icône (choisis parmi 16 options)
   - Couleur (choisis parmi 12 options)
4. Clique sur **"AJOUTER"**

### Modifier une habitude

1. Dans la modal de gestion
2. Modifie le nom directement
3. Clique sur **💾** pour sauvegarder

### Supprimer une habitude

1. Clique sur **🗑️** à côté de l'habitude
2. Confirme la suppression
3. *(L'historique est conservé)*

### Réorganiser les habitudes

1. Utilise les boutons **▲** et **▼**
2. L'ordre est sauvegardé automatiquement

---

## 🌐 Déploiement

### GitHub Pages (recommandé)

1. Push ton code sur GitHub
2. Va dans **Settings** → **Pages**
3. Source : **main** branch, **/ (root)** folder
4. Clique sur **Save**
5. Ton app sera sur : `https://[username].github.io/Habit-Tracker/`

### Autres hébergeurs

L'app fonctionne sur n'importe quel hébergeur de fichiers statiques :
- Netlify
- Vercel
- Firebase Hosting
- Surge.sh
- etc.

---

## 🔐 Sécurité

- ✅ Règles Firestore strictes (user = owner only)
- ✅ Pas d'accès cross-user
- ✅ Authentification Firebase sécurisée
- ✅ HTTPS obligatoire (via GitHub Pages)
- ✅ Pas de données sensibles en clair

---

## 🐛 Problèmes connus

Aucun bug critique à ce jour.

**Limitations connues :**
- Mode local : pas de sync multi-appareils
- Firebase : configuration manuelle requise
- Habitudes : recommandé < 20 pour UX optimale

Signale un bug : [Issues GitHub](https://github.com/lonnysakalese/Habit-Tracker/issues)

---

## 🤝 Contribution

Les contributions sont bienvenues !

1. Fork le projet
2. Crée une branche (`git checkout -b feature/AmazingFeature`)
3. Commit tes changements (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvre une Pull Request

---

## 📄 Licence

MIT License - Libre d'utilisation

---

## 🙏 Crédits

**Inspiration :** David Goggins, Muhammad Ali, Arnold Schwarzenegger

**Technologies :** Firebase (Google), Chart.js

**Design :** Thème Warrior minimaliste original

---

## 💪 Citations favorites

> "Je ne compte pas mes abdos. Je commence à compter seulement quand ça fait mal." - **Muhammad Ali**

> "Quand tu penses avoir terminé, tu n'es qu'à 40% de ta capacité." - **David Goggins**

> "La seule personne que tu es destiné à devenir est celle que tu décides d'être." - **Ralph Waldo Emerson**

---

## 📞 Contact

**Auteur** : Lonny SAKALESE

**Site** : https://lonnysakalese.github.io/Habit-Tracker/

**GitHub** : https://github.com/lonnysakalese/Habit-Tracker

---

**STAY HARD** 💪⚔️ 
