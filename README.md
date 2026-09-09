# EN

## Aether

Final exam project

Web-based, turn-based RPG: character-/class selection, battle/ability mechanics, profile and leaderboard (lots of stuff is in hungarian in the code)

### Content

- Registration and Login (JWT)
- Character-/Class selection and turn-based battle logic (HP / MP, status effects)
- Leaderboard, profile (Highscore, Recent runs, avatar theme)
- Settings: Language (HU/EN), dark/light theme, anonimity on the leaderboard

### Tech

Node.js, Express, Supabase, bcrypt, JSON Web Token. Game data (character/class data, ability data, enemy data) from Supabase

### (How to) run

Required: Node.js, npm, and the Supabase project

```bash
git clone https://github.com/gyorgyadam0228/Aether.git
cd Aether
npm install
```

Create a `.env` file in the root (don't commit):

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
```

```bash
npm start
```

Open in browser: [http://localhost:3000](http://localhost:3000) — to enter the login page

For development: `npm run dev` (nodemon).

### Folder summary

```
Public/         # frontend (login, main menu, game, profile, leaderboard)
routes/         # API endpoints
controllers/    # core logic
models/         # Supabase queries
config/         # Supabase client
middleware/     # JWT authentication
index.js        # server, static files, port 3000
```

### Variables

| Variable | Role |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | public (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side key — never in the frontend |
| `JWT_SECRET` | token signature |

The service role key should only be stored on the Node server. A `.env` a `.gitignore`-ban van.

### License

School project



# HU

## Aether

Szakmai vizsga projekt.

Böngészős, körökre osztott RPG: karakterválasztás, harc képességekkel, profil és ranglista.

### Funkciók

- Regisztráció és bejelentkezés (JWT)
- Karakterválasztás és körökre osztott harc (HP / MP, státuszok)
- Ranglista, profil (legjobb pontszám, utolsó menetek, avatar téma)
- Beállítások: nyelv (HU/EN), sötét/világos téma, anonimitás a ranglistán

### Tech

Node.js, Express, Supabase, bcrypt, JSON Web Token. A játékadatok (karakterek, képességek, ellenfelek) a Supabase-ből jönnek.

### Futtatás

Szükséges: Node.js, npm, és egy feltöltött Supabase projekt.

```bash
git clone https://github.com/gyorgyadam0228/Aether.git
cd Aether
npm install
```

Hozz létre egy `.env` fájlt a gyökérben (ne commitold):

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
```

```bash
npm start
```

Nyisd meg: [http://localhost:3000](http://localhost:3000) — belépés a login oldalon.

Fejlesztéshez: `npm run dev` (nodemon).

### Mappaáttekintés

```
Public/         # frontend (login, menü, játék, profil, ranglista)
routes/         # API végpontok
controllers/    # üzleti logika
models/         # Supabase lekérdezések
config/         # Supabase kliens
middleware/     # JWT ellenőrzés
index.js        # szerver, statikus fájlok, port 3000
```

### Környezeti változók

| Változó | Szerep |
|---|---|
| `SUPABASE_URL` | Supabase projekt URL |
| `SUPABASE_ANON_KEY` | publikus (anon) kulcs |
| `SUPABASE_SERVICE_ROLE_KEY` | szerveroldali kulcs — soha a frontendbe |
| `JWT_SECRET` | token aláírás |

A service role kulcs csak a Node szerveren legyen. A `.env` a `.gitignore`-ban van.

### Licenc

Iskolai vizsgaprojekt.
