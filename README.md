# CORTEX Planning

Application moderne, réactive et collaborative de planification des équipes et des agents de support/opérations, inspirée de l'ergonomie d'Excel avec colonnes figées, recopie intelligente, synchronisation temps réel Cloud Firestore et API REST pour applications tierces.

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

- **Frontend** : [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/), [Motion](https://motion.dev/)
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

## 📄 Licence
Propriétaire - Richard Digonal
