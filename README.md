# Planora

Application web de gestion d'événements et de réservations, composée d'un front-end Next.js, d'un back-end NestJS et d'une base de données MongoDB.

---

## 📁 Structure du projet

```
planora/
├── docker-compose.yml        # Orchestration des services
├── .env.example               # Variables d'environnement (Docker Compose)
├── backend/
│   ├── Dockerfile             # Image Docker du back-end
│   ├── .env.example           # Variables d'environnement back-end
│   └── src/
├── frontend/
│   ├── Dockerfile             # Image Docker du front-end
│   ├── .env.example           # Variables d'environnement front-end
│   └── app/
└── README.md
```

---

## 🐳 Déploiement Docker

### Prérequis

- [Docker](https://docs.docker.com/get-docker/) ≥ 24.0
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.20

### Services

| Service      | Image / Build      | Port exposé | Description             |
| ------------ | ------------------ | ----------- | ----------------------- |
| **mongodb**  | `mongo:7`          | 27017       | Base de données MongoDB |
| **backend**  | Build `./backend`  | 3001        | API REST NestJS         |
| **frontend** | Build `./frontend` | 3000        | Application web Next.js |

### Réseau Docker

Tous les services communiquent via un réseau bridge nommé `planora-network`. Le back-end se connecte à MongoDB via le hostname interne `mongodb` (résolution DNS Docker).

### Lancement rapide (Production)

```bash
# 1. Cloner le projet
git clone https://github.com/Mohammed-Ben-Cheikh/planora.git
cd planora

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs de production (JWT_SECRET, mot de passe MongoDB, etc.)

# 3. Construire et démarrer tous les services
docker compose up -d --build

# 4. Vérifier que tout fonctionne
docker compose ps
```

L'application est accessible sur :

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:3001/api

### Commandes utiles

```bash
# Voir les logs de tous les services
docker compose logs -f

# Voir les logs d'un service spécifique
docker compose logs -f backend

# Arrêter tous les services
docker compose down

# Arrêter et supprimer les volumes (reset base de données)
docker compose down -v

# Reconstruire un service spécifique
docker compose up -d --build backend
```

---

## ⚙️ Variables d'environnement

### Séparation Dev / Prod

Le projet utilise des fichiers `.env.example` à trois niveaux :

| Fichier                 | Usage                                      |
| ----------------------- | ------------------------------------------ |
| `.env.example` (racine) | Variables pour `docker-compose.yml` (prod) |
| `backend/.env.example`  | Variables pour le back-end en dev local    |
| `frontend/.env.example` | Variables pour le front-end en dev local   |

#### Mode Développement (sans Docker)

```bash
# Back-end
cd backend
cp .env.example .env
# Éditer .env : MONGODB_URI pointe vers localhost
npm install
npm run start:dev

# Front-end (dans un autre terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Variables dev typiques :

```env
# backend/.env
PORT=3001
NODE_ENV=development
JWT_SECRET=dev-secret-key
MONGODB_URI=mongodb://localhost:27017/planora
CORS_ORIGIN=http://localhost:3000

# frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

#### Mode Production (avec Docker)

```bash
# À la racine du projet
cp .env.example .env
# Éditer .env avec des valeurs sécurisées
```

Variables prod typiques :

```env
NODE_ENV=production
JWT_SECRET=une-cle-secrete-longue-et-aleatoire
MONGO_ROOT_USERNAME=planora_admin
MONGO_ROOT_PASSWORD=mot-de-passe-fort-et-unique
NEXT_PUBLIC_API_URL=https://votre-domaine.com/api
CORS_ORIGIN=https://votre-domaine.com
```

> ⚠️ **Important** : Ne jamais commiter le fichier `.env` ! Seuls les fichiers `.env.example` sont versionnés.

---

## 🏗️ Images Docker

### Back-end (NestJS) — Multi-stage build

1. **Stage builder** : Installe les dépendances et compile TypeScript
2. **Stage production** : Copie uniquement le build et les dépendances de production

### Front-end (Next.js) — Multi-stage build

1. **Stage deps** : Installe les dépendances
2. **Stage builder** : Build Next.js en mode `standalone`
3. **Stage production** : Image minimale avec utilisateur non-root (`nextjs`)

### Base de données (MongoDB)

- Image officielle `mongo:7`
- Données persistées dans un volume Docker `mongodb_data`
- Health check intégré pour s'assurer que la DB est prête avant le démarrage du back-end
