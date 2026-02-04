# Planora Backend API

API NestJS avec architecture modulaire, authentification JWT et gestion des rôles.

## 🚀 Fonctionnalités

- ✅ **Architecture modulaire** - Organisation claire en modules (Auth, Users)
- ✅ **Authentification JWT** - Tokens sécurisés avec expiration configurable
- ✅ **Gestion des rôles** - Admin et Participant avec guards dédiés
- ✅ **Base de données MongoDB** - Avec TypeORM pour la gestion des entités
- ✅ **Validation des données** - DTOs avec class-validator
- ✅ **Hashage des mots de passe** - Bcrypt pour la sécurité
- ✅ **CORS configuré** - Support des requêtes cross-origin

## 📁 Structure du projet

```
src/
├── auth/                    # Module d'authentification
│   ├── dto/                 # Data Transfer Objects
│   ├── guards/              # JWT Auth Guard
│   ├── interfaces/          # Interfaces (JwtPayload)
│   ├── strategies/          # Stratégie JWT Passport
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── common/                  # Éléments partagés
│   ├── decorators/          # @Roles, @Public, @CurrentUser
│   ├── enums/               # Role enum (ADMIN, PARTICIPANT)
│   └── guards/              # RolesGuard
├── config/                  # Configuration centralisée
├── users/                   # Module utilisateurs
│   ├── dto/
│   ├── entities/
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
├── app.module.ts
└── main.ts
```

## 🔧 Installation

```bash
npm install
```

## ⚙️ Configuration

Créez un fichier `.env` à la racine du projet :

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=votre-clé-secrète-très-longue-et-sécurisée
JWT_EXPIRES_IN=1d
MONGODB_URI=mongodb://localhost:27017/planora
CORS_ORIGIN=http://localhost:3001
```

## 🏃 Lancement

```bash
# Développement
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 📡 Endpoints API

### Authentification (`/api/auth`)

| Méthode | Endpoint             | Description         | Accès       |
| ------- | -------------------- | ------------------- | ----------- |
| POST    | `/api/auth/register` | Inscription         | Public      |
| POST    | `/api/auth/login`    | Connexion           | Public      |
| GET     | `/api/auth/profile`  | Profil utilisateur  | Authentifié |
| GET     | `/api/auth/me`       | Utilisateur courant | Authentifié |

### Utilisateurs (`/api/users`)

| Méthode | Endpoint         | Description                 | Accès       |
| ------- | ---------------- | --------------------------- | ----------- |
| GET     | `/api/users`     | Liste tous les utilisateurs | Admin       |
| GET     | `/api/users/me`  | Mon profil                  | Authentifié |
| GET     | `/api/users/:id` | Détail utilisateur          | Admin       |
| POST    | `/api/users`     | Créer utilisateur           | Admin       |
| PATCH   | `/api/users/:id` | Modifier utilisateur        | Admin       |
| DELETE  | `/api/users/:id` | Supprimer utilisateur       | Admin       |

## 🔐 Authentification

### Inscription

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Connexion

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Utilisation du token

```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <votre-token>"
```

## 👥 Rôles

| Rôle          | Description                              |
| ------------- | ---------------------------------------- |
| `admin`       | Accès complet à toutes les ressources    |
| `participant` | Accès limité aux ressources personnelles |

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Couverture
npm run test:cov
```

## 📝 Licence

MIT
