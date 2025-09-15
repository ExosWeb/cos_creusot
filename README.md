# 🏛️ Site COS Creusot - Comité des Œuvres Sociales

Site web officiel du Comité des Œuvres Sociales de la Mairie du Creusot, développé avec Node.js et une interface moderne aux couleurs de la France (rouge, blanc, bleu).

## 📋 Fonctionnalités

### 🎯 **Interface Publique**
- **Accueil** : Présentation du COS avec articles mis en avant
- **Avantages** : Liste des avantages réservés aux membres
- **Voyages** : Programmes et offres de voyages organisés
- **Retraites** : Services dédiés aux retraités
- **Événements** : Actualités et manifestations du COS

### 🔐 **Système d'Authentification**
- Inscription avec validation des données
- Système d'approbation par l'administrateur
- Connexion sécurisée avec JWT
- Gestion des sessions utilisateur

### 👨‍💼 **Panel Administrateur**
- **Tableau de bord** : Statistiques temps réel
- **Gestion utilisateurs** : Approbation/rejet des inscriptions
- **Gestion articles** : CRUD complet avec mise en avant
- **Journaux** : Logs de connexions, visites, et actions

### 📊 **Système de Logs Complet**
- Logs de connexion (succès/échecs)
- Logs de visites de pages
- Logs d'actions administratives
- Traçabilité complète des activités

## 🛠️ Installation et Configuration

### Prérequis
- Node.js version 16 ou supérieure
- MySQL (accès au serveur 148.113.194.73)
- Navigateur web moderne

### 1. Installation Backend

```bash
# Naviguer vers le répertoire backend
cd backend/

# Installer les dépendances
npm install

# Vérifier la configuration .env
# DB_HOST=148.113.194.73
# DB_USER=Exost
# DB_PASSWORD=Juillet2006.
# DB_NAME=COS_Creusot
```

### 2. Configuration Base de Données

**Connectez-vous à MySQL :**
```bash
mysql -h 148.113.194.73 -u Exost -p
```

**Exécutez le script d'initialisation :**
```sql
source database/init_database.sql;
```

**Ou copiez-collez le contenu du fichier `database/init_database.sql`**

### 3. Démarrage du Serveur

```bash
# Démarrer le serveur (depuis le répertoire backend)
npm start

# Ou pour le développement avec redémarrage automatique
npm run dev
```

Le serveur sera accessible sur :
- **Frontend** : http://localhost:3000
- **API** : http://localhost:3000/api
- **Admin** : http://localhost:3000/admin

## 🎮 Utilisation

### Premier Démarrage

1. **Créer un compte administrateur**
   - Le script SQL crée automatiquement un compte admin :
   - Email : `admin@cos-creusot.fr`
   - Mot de passe : `admin123` (stocké en clair en mode développement)

2. **Accéder au panel d'administration**
   - Aller sur http://localhost:3000/admin
   - Se connecter avec les identifiants admin
   - Changer le mot de passe immédiatement

### Workflow Standard

#### 👤 **Pour les Utilisateurs :**
1. S'inscrire via le formulaire d'inscription
2. Attendre l'approbation de l'administrateur
3. Se connecter une fois approuvé
4. Consulter les avantages, voyages, événements

#### 👨‍💼 **Pour l'Administrateur :**
1. Se connecter au panel admin
2. Approuver/rejeter les nouvelles inscriptions
3. Créer et gérer les articles
4. Consulter les statistiques et logs
5. Mettre en avant des articles importants

## 📁 Structure du Projet

```
COS-Creusot/
├── backend/                 # Serveur Node.js
│   ├── config/             # Configuration BDD
│   ├── models/             # Modèles de données
│   ├── routes/             # Routes API
│   ├── middleware/         # Middlewares (auth, logs)
│   ├── server.js           # Serveur principal
│   └── .env                # Variables d'environnement
├── frontend/               # Interface utilisateur
│   ├── css/               # Feuilles de style
│   ├── js/                # Scripts JavaScript
│   ├── images/            # Ressources graphiques
│   ├── *.html             # Pages HTML
├── database/              # Scripts SQL
│   └── init_database.sql  # Initialisation BDD
└── README.md              # Ce fichier
```

## 🔧 Mode Développement

Pour faciliter les tests pendant le développement, certaines sécurités sont désactivées :

- **Mots de passe** : Stockés en clair dans la base (pas de cryptage bcrypt)
- **Compte admin** : Email `admin@cos-creusot.fr` / Mot de passe `admin123`
- **Validation** : Moins stricte sur les données d'entrée

⚠️ **Important** : En mode production (`NODE_ENV=production`), le cryptage bcrypt sera automatiquement activé.

## 🎨 Thème et Design

- **Couleurs principales** : Rouge, Blanc, Bleu (tricolore français)
- **Design** : Interface moderne et responsive
- **Typographie** : Police système optimisée pour la lisibilité
- **Compatibilité** : Compatible tous navigateurs modernes

## 🔒 Sécurité

### Mesures Implémentées
- ✅ Hachage des mots de passe avec bcrypt
- ✅ Tokens JWT sécurisés
- ✅ Protection CORS
- ✅ Sécurisation des headers avec Helmet
- ✅ Validation des entrées utilisateur
- ✅ Journalisation complète des activités

### Recommandations Production
1. Changer le JWT_SECRET dans .env
2. Utiliser HTTPS en production
3. Configurer un reverse proxy (nginx)
4. Mettre en place des sauvegardes BDD
5. Monitorer les logs de sécurité

## 📊 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/verify` - Vérification token

### Articles
- `GET /api/articles` - Liste des articles publiés
- `GET /api/articles/featured` - Articles mis en avant
- `GET /api/articles/category/:category` - Articles par catégorie
- `POST /api/articles` - Créer un article (auth requise)
- `PUT /api/articles/:id` - Modifier un article (auth requise)
- `DELETE /api/articles/:id` - Supprimer un article (auth requise)

### Administration (admin uniquement)
- `GET /api/admin/dashboard` - Statistiques du tableau de bord
- `GET /api/admin/users` - Liste des utilisateurs
- `GET /api/admin/users/pending` - Utilisateurs en attente
- `PATCH /api/admin/users/:id/approve` - Approuver un utilisateur
- `PATCH /api/admin/users/:id/reject` - Rejeter un utilisateur
- `GET /api/admin/logs/:type` - Récupérer les logs

## 🚀 Mise en Production

### Serveur Web
Configurez votre serveur web (Apache/Nginx) pour servir les fichiers statiques du dossier `frontend/` et proxy les requêtes API vers le serveur Node.js.

### Base de Données
Assurez-vous que la base de données MySQL est correctement configurée avec les droits appropriés.

### Variables d'Environnement
Modifiez le fichier `.env` avec vos paramètres de production :
```env
NODE_ENV=production
JWT_SECRET=votre_secret_jwt_super_securise
DB_HOST=votre_serveur_mysql
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
```

## 🐛 Dépannage

### Erreur de Connexion MySQL
- Vérifiez les paramètres dans `.env`
- Confirmez que le serveur MySQL est accessible
- Vérifiez les droits de l'utilisateur

### Erreur "Table doesn't exist"
- Exécutez le script `database/init_database.sql`
- Vérifiez que la base de données `COS_Creusot` existe

### Problèmes de Token JWT
- Vérifiez que JWT_SECRET est défini dans `.env`
- Effacez le localStorage du navigateur
- Reconnectez-vous

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs du serveur (`console.log` dans le terminal)
2. Vérifiez les logs MySQL pour les erreurs de base de données
3. Utilisez les outils de développement du navigateur (F12)

## 📝 Changelog

### Version 1.0.0 (Initial)
- ✅ Système d'authentification complet
- ✅ Interface publique avec 5 sections
- ✅ Panel d'administration
- ✅ Système de logs complet
- ✅ API REST sécurisée
- ✅ Design responsive tricolore
- ✅ Gestion des articles avec catégories
- ✅ Système d'approbation des utilisateurs

---

**Développé pour le COS du Creusot - 2024**