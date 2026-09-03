# CORTEX Planning

Modern, reactive and collaborative team and support/operations agent planning application, inspired by Excel ergonomics with frozen columns, intelligent copy, synchronization and an intuitive REST API[...]

---

## 🚀 Key Features

### 1. 📅 Intuitive & Ergonomic Planning Grid
- **Dynamic display** by customizable period (7, 14, 21, 28 days or monthly view).
- **Fluid temporal navigation** with date picker, "Today" jump and previous/next week buttons.
- **Frozen columns** for agents (Name, Station, Team, Contract) during horizontal scrolling.
- **Collapsible/expandable grouping by team** for improved visibility of large workforces.
- **Stamp Mode** to assign a shift in one click directly on any cell.
- **Multi-cell selection** by drag & drop, entire row or entire column selection.
- **Intelligent copy & auto-fill** of week via fill handle or context menu.
- **Complete context menu** (right-click): Copy, Paste, Fill week, Set Time Off/Leave, Extract shifts from date, Clear.
- **Undo / Redo** with keyboard shortcuts (`Ctrl+Z` / `Ctrl+Y`).

### 2. 👥 Agent & Team Management
- Creation, modification and deletion of agents (Name, Team, Station, Contract, Display Order).
- Filtering by team and instant search.
- Reorganization by drag & drop of agent order.
- Import & Export CSV / JSON of agent lists.

### 3. 🏷️ Shift Catalog & Legend
- Pre-configured standard shifts (Morning `M1`/`M2`, Day `J1`/`J2`, Evening `S1`/`S2`, Night `N1`, Time Off `OFF`, Leave `CP`/`CA`, etc.).
- Creation and customization of custom shifts (code, label, start/end times, mandatory break, color, season).
- Display toggle: detailed mode or compact mode (code-only badge grid with counters).
- Hiding / showing inactive or archived shifts.

### 4. 📊 Statistics & Operational Coverage
- Statistics bar per day and per shift to instantly visualize position coverage.
- Key performance indicators: Total agents, Active on duty, Off/on leave, Planned hours.

### 5. 🔌 Extraction & Token-Secured REST API
High-performance API endpoint with token authentication (Bearer Token / Header / URL query) and full CORS support to feed your other tools (dashboards, bots, HRIS, payroll).

### 6. 🔑 API Keys & Token Management
- **Integrated Access Token Generator** in the interface and persisted on Cloud Firestore.
- **Multi-method support**: `Authorization: Bearer <TOKEN>` header, `x-api-key: <TOKEN>` or `?apiKey=<TOKEN>` parameter.
- **Instant revocation / activation** of compromised or expired keys.
- **Automatic code snippet generation** (cURL, JavaScript Fetch, Python Requests) with your active key injected.

### 7. 🔐 User Authentication & Firebase Access Control
- **Secure Login Page**: Protected application access with mandatory identification.
- **Google Login (Popup)**: Native integration with Firebase Auth and Google Identity.
- **Email / Password Login & Registration** with error message handling.
- **User Profile & Logout**: Avatar, email/name display in header and logout button.
- **Quick Access / Demo**: Toggle buttons for operational testing (Ops Manager & Supervisor).

---

## 📡 REST API Documentation & Authentication

All data routes are protected by API token authentication.

### 🔑 Accepted Authentication Modes

1. **Bearer Header (Recommended)** :
   ```http
   Authorization: Bearer YOUR_API_TOKEN
   ```
2. **Custom Header** :
   ```http
   x-api-key: YOUR_API_TOKEN
   ```
3. **URL Parameter (Query parameter)** :
   ```http
   https://my-app.com/api/shifts/daily?date=2026-08-30&apiKey=YOUR_API_TOKEN
   ```

---

### `GET /api/shifts/daily`
Retrieves all shifts assigned to agents for a given date.

#### URL Parameters (Query Params) :
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `date` | `string` | *today* | Date in `YYYY-MM-DD` or `DD/MM/YYYY` format |
| `team` | `string` | *all* | Filter by team (ex: `Paris`, `Nice`, `Night`) |
| `station` | `string` | *all* | Filter by station code (ex: `ABN`, `JS`, `RC`) |
| `format` | `string` | `json` | Output format: `json` (complete), `compact` (key/value), or `csv` |
| `apiKey` | `string` | *optional if Bearer header provided* | API access token |

#### Example Secure cURL Call :
```bash
curl -X GET "http://localhost:3000/api/shifts/daily?date=2026-08-30&team=Paris" \
  -H "Authorization: Bearer cortex_live_sec_7f9a12c840be6d318e47"
```

#### Example JSON Response (200 OK) :
```json
{
  "date": "2026-08-30",
  "dayName": "Sunday",
  "isoTimestamp": "2026-08-30T00:00:00.000Z",
  "totalAgents": 28,
  "totalAssigned": 24,
  "totalWorking": 18,
  "totalOff": 6,
  "shiftCounts": {
    "M1": 6,
    "J1": 8,
    "S1": 4,
    "OFF": 6
  },
  "assignments": [
    {
      "agentId": "agent_1",
      "agentName": "Ahmed B.",
      "station": "ABN",
      "team": "Paris",
      "shiftCode": "M1",
      "shiftLabel": "Morning 1",
      "hours": "07:00 - 15:30",
      "startTime": "07:00",
      "endTime": "15:30",
      "defaultPause": "00:30",
      "isOff": false
    }
  ]
}
```

#### In case of missing or invalid API key (401 Unauthorized) :
```json
{
  "error": "Unauthorized",
  "message": "Access denied. Please provide a valid API token via the 'Authorization: Bearer <TOKEN>', 'x-api-key: <TOKEN>' header or the '?apiKey=<TOKEN>' parameter."
}
```

### Other Secured Endpoints :
- `GET /api/planning/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` : Retrieves planning over a complete date range.
- `GET /api/agents` & `POST /api/agents` : Agent management.
- `GET /api/shifts` & `POST /api/shifts` : Shift catalog management.
- `GET /api/tokens` & `POST /api/tokens` : Programmatic API key management.
- `GET /api/docs` : OpenAPI specification and live documentation (accessible without token).
- `GET /api/health` : Server health status and Firestore synchronization.

---

## 🛠️ Tech Stack

- **Frontend** : [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/), [Motion](https:/[...]
- **Backend / Server** : [Express 4](https://expressjs.com/), [Node.js](https://nodejs.org/), [TSX](https://github.com/privatenumber/tsx) / [esbuild](https://esbuild.github.io/)
- **Database** : [Google Cloud Firestore (Firebase SDK v12)](https://firebase.google.com/docs/firestore)
- **Bundler & Tooling** : [Vite 6](https://vitejs.dev/)

---

## 📦 Installation & Getting Started

### Requirements
- Node.js 18+ or 20+
- npm or bun

### 1. Install dependencies
```bash
npm install
```

### 2. Start in Development Mode
```bash
npm run dev
```
The application starts on `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```
This command compiles the frontend application with Vite in `dist/` and generates the standalone CommonJS server `dist/server.cjs` with esbuild.

### 4. Launch in Production
```bash
npm start
```

---

## 🗄️ Project Structure

```
├── src/
│   ├── components/
│   │   ├── Header.tsx                   # Navigation bar, filters, export and temporal jump
│   │   ├── PlanningGrid.tsx             # Interactive Excel-style planning grid
│   │   ├── ShiftLegendSidebar.tsx       # Shifts sidebar & stamp mode
│   │   ├── DateShiftExtractorModal.tsx  # Extraction modal and REST API tester
│   │   ├── AgentManagerModal.tsx        # Complete agent & team manager
│   │   ├── ContextMenu.tsx              # Right-click context menu on cells
│   │   ├── StatsBar.tsx                 # KPI indicators & coverage
│   │   └── DatePickerPopover.tsx        # Calendar picker popover
│   ├── firebase.ts                      # Firestore configuration and helpers
│   ├── types.ts                         # TypeScript interfaces (Agent, Shift, HistoryAction...)
│   ├── utils/
│   │   ├── dateUtils.ts                 # Date manipulation utilities
│   │   └── shiftUtils.ts                # Shift hours, colors and styles calculations
│   ├── App.tsx                          # Root component orchestrating state
│   └── main.tsx                         # React entry point
├── server.ts                            # Express API REST server + Vite middleware integration
├── firestore.rules                      # Firestore security rules
├── firebase-blueprint.json              # Firestore collections schema
├── package.json                         # Dependencies and scripts
└── tsconfig.json                        # TypeScript configuration
```

---

## 🤝 How to Contribute?

We welcome contributions to CORTEX Planning! Here's how you can help:

### Getting Started
1. **Fork the repository** and clone it locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/CORTEX-planning.git
   cd CORTEX-planning
   ```

2. **Create a feature branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install dependencies** and start development:
   ```bash
   npm install
   npm run dev
   ```

### Code Guidelines
- Use **TypeScript** for all code contributions
- Follow the existing code style and structure
- Keep components modular and reusable
- Add proper type annotations
- Use meaningful variable and function names
- Comment complex logic sections

### Before Submitting a PR
- **Test your changes** thoroughly in development mode
- **Run the build** to ensure no errors: `npm run build`
- **Keep commits clean** and descriptive
- **Update documentation** if adding new features
- **Check for conflicts** with the main branch

### Types of Contributions Welcome
- 🐛 **Bug fixes** : Report and fix issues in existing features
- ✨ **New features** : Propose and implement enhancements
- 📚 **Documentation** : Improve README, API docs, or code comments
- 🎨 **UI/UX improvements** : Enhance the planning grid or user interface
- ⚡ **Performance optimizations** : Optimize code and queries
- 🧪 **Tests** : Add or improve test coverage

### Reporting Issues
When reporting a bug, please include:
- Clear description of the issue
- Steps to reproduce
- Expected behavior vs. actual behavior
- Screenshots or error logs (if applicable)
- Your environment (Node.js version, OS, etc.)

### Questions?
Feel free to open an issue for questions or discussions. We're here to help!

---

## 📄 License
Proprietary - Richard Digonal

---

---

# CORTEX Planning

Application moderne, réactive et collaborative de planification des équipes et des agents de support/opérations, inspirée de l'ergonomie d'Excel avec colonnes figées, recopie intelligente, synchronisation et une API REST intuitive[...]

---

## 🚀 Fonctionnalités Principales

### 1. 📅 Grille de Planification Intuitive & Ergonomique
- **Affichage dynamique** par période personnalisable (7, 14, 21, 28 jours ou vue mensuelle).
- **Navigation temporelle fluide** avec sélecteur de date, saut "Aujourd'hui" et boutons semaine précédente/suivante.
- **Colonnes figées** pour les agents (Nom, Station, Équipe, Contrat) lors du défilement horizontal.
- **Groupement par équipe** pliable/dépliable pour une visibilité accrue des grands effectifs.
- **Mode Tampon (Stamp Mode)** pour affecter un shift en un clic direct sur n'importe quelle cellule.
- **Sélection multi-cellules** par glisser-déposer (drag & drop), sélection de ligne entière ou de colonne entière.
- **Recopie intelligente & Remplissage automatique** de semaine via poignée de recopie (fill handle) ou menu contextuel.
- **Menu contextuel complet** (clic droit) : Copier, Coller, Remplir la semaine, Définir Repos/Congé, Extraire les shifts d'une date, Effacer.
- **Annuler / Rétablir (Undo / Redo)** avec raccourcis clavier (`Ctrl+Z` / `Ctrl+Y`).

### 2. 👥 Gestion des Agents & Équipes
- Création, modification et suppression d'agents (Nom, Équipe, Station, Contrat, Ordre d'affichage).
- Filtrage par équipe et recherche instantanée.
- Réorganisation par glisser-déposer (Drag & Drop) de l'ordre des agents.
- Importation & Exportation CSV / JSON des listes d'agents.

### 3. 🏷️ Catalogue des Shifts & Légende
- Shifts standards préconfigurés (Matin `M1`/`M2`, Journée `J1`/`J2`, Soir `S1`/`S2`, Nuit `N1`, Repos `OFF`, Congés `CP`/`CA`, etc.).
- Création et personnalisation de shifts personnalisés (code, libellé, horaires de début/fin, pause obligatoire, couleur, saison).
- Bascule d'affichage : mode détaillé ou mode compact (grille de badges codes-seuls avec compteurs).
- Masquage / affichage des shifts inactifs ou archivés.

### 4. 📊 Statistiques & Couverture Opérationnelle
- Barre de statistiques par jour et par shift pour visualiser instantanément la couverture des postes.
- Indicateurs clés de performance : Total agents, Actifs en poste, En repos/congés, Heures planifiées.

### 5. 🔌 Extraction & API REST Sécurisée par Token
Endpoint API haute performance avec authentification par jeton (Bearer Token / Header / URL query) et support CORS complet pour alimenter vos autres outils (dashboards, bots, SIRH, paie).

### 6. 🔑 Gestion des Clés & Jetons API
- **Générateur de Tokens d'Accès** intégré dans l'interface et persisté sur Cloud Firestore.
- **Support multi-méthodes** : en-tête `Authorization: Bearer <TOKEN>`, `x-api-key: <TOKEN>` ou paramètre `?apiKey=<TOKEN>`.
- **Révocation / Activation** instantanée des clés compromises ou expirées.
- **Génération automatique de snippets de code** (cURL, JavaScript Fetch, Python Requests) avec votre clé active injectée.

### 7. 🔐 Authentification Utilisateur & Contrôle d'Accès Firebase
- **Page de Connexion Sécurisée** : Accès protégé à l'application avec identification obligatoire.
- **Connexion Google (Popup)** : Intégration native avec Firebase Auth et Google Identity.
- **Connexion & Inscription E-mail / Mot de passe** avec gestion des messages d'erreur.
- **Profil Utilisateur & Déconnexion** : Affichage dans l'en-tête de l'avatar, e-mail/nom et bouton de déconnexion.
- **Accès Rapide / Démo** : Boutons de bascule rapide pour les tests opérationnels (Ops Manager & Superviseur).

---

## 📡 Documentation API REST & Authentification

Toutes les routes de données sont protégées par authentification de jeton API.

### 🔑 Modes d'Authentification Acceptés

1. **En-tête Bearer (Recommandé)** :
   ```http
   Authorization: Bearer VOTRE_TOKEN_API
   ```
2. **En-tête personnalisé** :
   ```http
   x-api-key: VOTRE_TOKEN_API
   ```
3. **Paramètre d'URL (Query parameter)** :
   ```http
   https://mon-app.com/api/shifts/daily?date=2026-08-30&apiKey=VOTRE_TOKEN_API
   ```

---

### `GET /api/shifts/daily`
Récupère tous les shifts assignés aux agents pour une date donnée.

#### Paramètres d'URL (Query Params) :
| Paramètre | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `date` | `string` | *aujourd'hui* | Date au format `YYYY-MM-DD` ou `DD/MM/YYYY` |
| `team` | `string` | *toutes* | Filtrer par équipe (ex: `Paris`, `Nice`, `Nuit`) |
| `station` | `string` | *toutes* | Filtrer par code station (ex: `ABN`, `JS`, `RC`) |
| `format` | `string` | `json` | Format de sortie : `json` (complet), `compact` (clé/valeur), ou `csv` |
| `apiKey` | `string` | *optionnel si Bearer header fourni* | Jeton d'accès API |

#### Exemple d'appel cURL Sécurisé :
```bash
curl -X GET "http://localhost:3000/api/shifts/daily?date=2026-08-30&team=Paris" \
  -H "Authorization: Bearer cortex_live_sec_7f9a12c840be6d318e47"
```

#### Exemple de réponse JSON (200 OK) :
```json
{
  "date": "2026-08-30",
  "dayName": "Dimanche",
  "isoTimestamp": "2026-08-30T00:00:00.000Z",
  "totalAgents": 28,
  "totalAssigned": 24,
  "totalWorking": 18,
  "totalOff": 6,
  "shiftCounts": {
    "M1": 6,
    "J1": 8,
    "S1": 4,
    "OFF": 6
  },
  "assignments": [
    {
      "agentId": "agent_1",
      "agentName": "Ahmed B.",
      "station": "ABN",
      "team": "Paris",
      "shiftCode": "M1",
      "shiftLabel": "Matin 1",
      "hours": "07:00 - 15:30",
      "startTime": "07:00",
      "endTime": "15:30",
      "defaultPause": "00:30",
      "isOff": false
    }
  ]
}
```

#### En cas d'absence ou invalidité de clé API (401 Unauthorized) :
```json
{
  "error": "Unauthorized",
  "message": "Accès refusé. Veuillez fournir un token API valide via l'en-tête 'Authorization: Bearer <TOKEN>', 'x-api-key: <TOKEN>' ou le paramètre '?apiKey=<TOKEN>'."
}
```

### Autres Endpoints Sécurisés :
- `GET /api/planning/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` : Récupère les plannings sur une plage de dates complète.
- `GET /api/agents` & `POST /api/agents` : Gestion des agents.
- `GET /api/shifts` & `POST /api/shifts` : Gestion du catalogue des shifts.
- `GET /api/tokens` & `POST /api/tokens` : Gestion programmatique des clés API.
- `GET /api/docs` : Spécification OpenAPI et documentation en direct (accessible sans token).
- `GET /api/health` : État de santé du serveur et de la synchronisation Firestore.

---

## 🛠️ Stack Technique

- **Frontend** : [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/), [Motion](https:/[...]
- **Backend / Serveur** : [Express 4](https://expressjs.com/), [Node.js](https://nodejs.org/), [TSX](https://github.com/privatenumber/tsx) / [esbuild](https://esbuild.github.io/)
- **Base de Données** : [Google Cloud Firestore (Firebase SDK v12)](https://firebase.google.com/docs/firestore)
- **Bundler & Outillage** : [Vite 6](https://vitejs.dev/)

---

## 📦 Installation & Démarrage

### Prérequis
- Node.js 18+ ou 20+
- npm ou bun

### 1. Installation des dépendances
```bash
npm install
```

### 2. Démarrage en mode Développement
```bash
npm run dev
```
L'application démarre sur `http://localhost:3000`.

### 3. Build pour la Production
```bash
npm run build
```
Cette commande compile l'application frontend avec Vite dans `dist/` et génère le serveur CommonJS autonome `dist/server.cjs` avec esbuild.

### 4. Lancement en Production
```bash
npm start
```

---

## 🗄️ Structure du Projet

```
├── src/
│   ├── components/
│   │   ├── Header.tsx                   # Barre de navigation, filtres, export et saut temporel
│   │   ├── PlanningGrid.tsx             # Grille de planning interactive style Excel
│   │   ├── ShiftLegendSidebar.tsx       # Barre latérale des shifts & mode tampon
│   │   ├── DateShiftExtractorModal.tsx  # Modal d'extraction et testeur API REST
│   │   ├── AgentManagerModal.tsx        # Gestionnaire complet des agents & équipes
│   │   ├── ContextMenu.tsx              # Menu contextuel clic droit sur cellules
│   │   ├── StatsBar.tsx                 # Indicateurs KPI & couverture
│   │   └── DatePickerPopover.tsx        # Sélecteur de calendrier popover
│   ├── firebase.ts                      # Configuration et helpers Firestore
│   ├── types.ts                         # Interfaces TypeScript (Agent, Shift, HistoryAction...)
│   ├── utils/
│   │   ├── dateUtils.ts                 # Utilitaires de manipulation des dates
│   │   └── shiftUtils.ts                # Calculs des heures, couleurs et styles de shifts
│   ├── App.tsx                          # Composant racine orchestrant l'état
│   └── main.tsx                         # Point d'entrée React
├── server.ts                            # Serveur Express API REST + intégration middleware Vite
├── firestore.rules                      # Règles de sécurité Firestore
├── firebase-blueprint.json              # Schéma des collections Firestore
├── package.json                         # Dépendances et scripts
└── tsconfig.json                        # Configuration TypeScript
```

---

## 🤝 Comment Contribuer ?

Nous accueillons les contributions à CORTEX Planning ! Voici comment vous pouvez nous aider :

### Pour Commencer
1. **Forkez le dépôt** et clonez-le localement :
   ```bash
   git clone https://github.com/YOUR_USERNAME/CORTEX-planning.git
   cd CORTEX-planning
   ```

2. **Créez une branche de fonctionnalité** pour votre travail :
   ```bash
   git checkout -b feature/nom-de-votre-fonctionnalite
   ```

3. **Installez les dépendances** et démarrez le développement :
   ```bash
   npm install
   npm run dev
   ```

### Directives de Code
- Utilisez **TypeScript** pour toutes les contributions de code
- Suivez le style et la structure du code existant
- Gardez les composants modulaires et réutilisables
- Ajoutez des annotations de type appropriées
- Utilisez des noms de variables et de fonctions significatifs
- Commentez les sections de logique complexe

### Avant de Soumettre une PR
- **Testez vos modifications** à fond en mode développement
- **Exécutez la compilation** pour vérifier qu'il n'y a pas d'erreurs : `npm run build`
- **Gardez les commits propres** et descriptifs
- **Mettez à jour la documentation** si vous ajoutez de nouvelles fonctionnalités
- **Vérifiez les conflits** avec la branche principale

### Types de Contributions Bienvenues
- 🐛 **Corrections de bugs** : Signalez et corrigez les problèmes dans les fonctionnalités existantes
- ✨ **Nouvelles fonctionnalités** : Proposez et implémentez des améliorations
- 📚 **Documentation** : Améliorez le README, les docs API ou les commentaires du code
- 🎨 **Améliorations UI/UX** : Améliorez la grille de planification ou l'interface utilisateur
- ⚡ **Optimisations de performance** : Optimisez le code et les requêtes
- 🧪 **Tests** : Ajoutez ou améliorez la couverture de tests

### Signaler des Problèmes
Lors du signalement d'un bug, veuillez inclure :
- Une description claire du problème
- Les étapes pour le reproduire
- Le comportement attendu par rapport au comportement réel
- Des captures d'écran ou des journaux d'erreur (le cas échéant)
- Votre environnement (version Node.js, OS, etc.)

### Des Questions ?
N'hésitez pas à ouvrir une issue pour poser des questions ou lancer des discussions. Nous sommes là pour vous aider !

---

## 📄 Licence
Propriétaire - Richard Digonal
