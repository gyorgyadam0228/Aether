# Aether

Szakmai vizsga projekt.

Böngészős, körökre osztott RPG: karakterválasztás, harc képességekkel, profil és ranglista.

## Funkciók

- Regisztráció és bejelentkezés (JWT)
- Karakterválasztás és körökre osztott harc (HP / MP, státuszok)
- Ranglista, profil (legjobb pontszám, utolsó menetek, avatar téma)
- Beállítások: nyelv (HU/EN), sötét/világos téma, anonimitás a ranglistán

## Tech

Node.js, Express, Supabase, bcrypt, JSON Web Token. A játékadatok (osztályok, képességek, ellenfelek) a Supabase-ből jönnek.

## Futtatás

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

## Mappaáttekintés

```
Public/         # frontend (login, menü, játék, profil, ranglista)
routes/         # API végpontok
controllers/    # üzleti logika
models/         # Supabase lekérdezések
config/         # Supabase kliens
middleware/     # JWT ellenőrzés
index.js        # szerver, statikus fájlok, port 3000
```

## Környezeti változók

| Változó | Szerep |
|---|---|
| `SUPABASE_URL` | Supabase projekt URL |
| `SUPABASE_ANON_KEY` | publikus (anon) kulcs |
| `SUPABASE_SERVICE_ROLE_KEY` | szerveroldali kulcs — soha a frontendbe |
| `JWT_SECRET` | token aláírás |

A service role kulcs csak a Node szerveren legyen. A `.env` a `.gitignore`-ban van.

## Licenc

Iskolai vizsgaprojekt.
