# 🚀 SIMMAM Laser Hack — Astro Survivor Architecture

A neon-themed maze game with full production stack: React frontend, Node.js + TypeScript backend, Supabase database, server-authoritative timing, and Railway deployment.

---

## 🏗️ Project Structure

```
SIMMAM-Laser-Hack/
├── client/            # React + Vite frontend
│   ├── src/
│   │   ├── pages/     # Route-level components
│   │   ├── components/ # Shared UI (Maze, NeonButton)
│   │   ├── hooks/     # useGameSession
│   │   ├── lib/       # api.ts, audio.ts
│   │   └── data/      # Level definitions
│   └── railway.toml
├── server/
│   ├── src/
│   │   ├── index.ts          # Express entry
│   │   ├── routes/
│   │   │   ├── game.ts       # /api/game/start, /api/game/end
│   │   │   └── leaderboard.ts # /api/leaderboard
│   │   └── lib/
│   │       └── supabase.ts   # Supabase client
│   └── railway.toml
└── supabase/
    └── schema.sql   # Full DB schema + RLS
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Framer Motion |
| Audio | Howler.js |
| Styling | Vanilla CSS + Tailwind CSS v4 |
| Backend | Node.js, Express 4, TypeScript |
| Database | Supabase PostgreSQL |
| Hosting | Railway (Frontend + Backend) |
| Auth | Supabase (ready for future) |

---

## 🔒 Server-Authoritative Timing

The game uses **server-side timing** to prevent cheating:

```
1. Player starts game  → POST /api/game/start
                         Server records UTC start_time in DB
                         Returns session_id to client

2. Player finishes     → POST /api/game/end { sessionId }
                         Server computes: survival_time = end_time - start_time
                         Never trusts client-provided time
                         Inserts into leaderboard only if completed=true
```

Client displays a local timer for UX — but this is **never used for scoring**.

---

## 🗄️ Database Schema

```sql
game_sessions  -- server timing (start_time, end_time, survival_time_ms)
runs           -- completed leaderboard entries (total_seconds computed server-side)
```

Both tables have **Row Level Security** — only service role can write. Public can read leaderboard.

### Views
- `leaderboard_ranked` — runs with RANK() window function
- `house_leaderboard` — best run per house

---

## 🚀 Local Development

### Prerequisites
- Node.js 20+
- Supabase project (free tier works)

### 1. Setup Supabase
Run `supabase/schema.sql` in your Supabase SQL editor.

### 2. Server
```bash
cd SIMMAM-Laser-Hack/server
cp .env .env.local   # Edit with your Supabase keys
npm install
npm run dev          # ts-node-dev with hot reload
```

### 3. Client
```bash
cd SIMMAM-Laser-Hack/client
npm install
npm run dev          # Vite proxies /api → localhost:3001
```

Open `http://localhost:5173`

---

## 📦 Environment Variables

### Server `.env`
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for server writes) |
| `JWT_SECRET` | Secret for future JWT auth |
| `PORT` | Server port (default: 3001) |
| `CLIENT_ORIGIN` | CORS whitelist (e.g., `http://localhost:5173`) |

---

## 🚂 Railway Deployment

### Backend Service
1. Create Railway project → Add service from GitHub
2. Set root directory: `SIMMAM-Laser-Hack/server`
3. Add env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `CLIENT_ORIGIN`
4. Deploy — health check at `/api/health`

### Frontend Service
1. Add another service → Set root directory: `SIMMAM-Laser-Hack/client`
2. Add env var: `VITE_API_URL` = your backend Railway URL
3. Deploy

---

## 🌿 Git Workflow

```
main          ← production (protected)
  └── develop ← integration testing
        ├── feature/gameplay
        ├── feature/auth
        └── feature/api
```

**Workflow:**
1. Create `feature/*` branch
2. Open PR → develop
3. Review + merge to develop
4. Test on staging
5. PR develop → main for production release

---

## 🎵 Audio Setup (Optional)

Add audio files to `client/public/audio/`:
- `bg_music.mp3` / `.ogg` — background music
- `sfx_wall_hit.mp3` / `.ogg` — wall collision sound
- `sfx_level_complete.mp3` / `.ogg` — level clear jingle
- `sfx_game_complete.mp3` / `.ogg` — victory fanfare
- `sfx_ui_click.mp3` / `.ogg` — button click

The audio manager in `src/lib/audio.ts` gracefully skips missing files.

---

## ✅ Production Checklist

- [x] HTTPS (Railway auto-provisions TLS)
- [x] CORS locked to frontend origin
- [x] Server-authoritative timing (anti-cheat)
- [x] Input validation (express-validator)
- [x] Row Level Security on Supabase tables
- [x] Health check endpoint `/api/health`
- [ ] Configure custom domain in Railway
- [ ] Enable Supabase database backups (Dashboard → Database → Backups)
- [ ] Set up monitoring (Railway metrics / Sentry)

---

## 🔮 Future Enhancements

- Daily challenges with reset leaderboards
- Achievement system per house
- Google OAuth via Supabase Auth
- Admin panel for leaderboard moderation
- Seasonal leaderboards
- Analytics dashboard
- More maze levels and level variants
