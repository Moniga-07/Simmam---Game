import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import gameRouter from './routes/game';
import leaderboardRouter from './routes/leaderboard';

const app = express();
const port = Number(process.env.PORT) || 3001;

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Railway frontend URL (set in Railway env vars)
  process.env.RAILWAY_FRONTEND_URL || '',
  'https://game.ssesimmam.com'
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/game', gameRouter);
app.use('/api/leaderboard', leaderboardRouter);

// ─── Serve React build in production ─────────────────────────────────────────
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Astro Survivor Server running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
});

export default app;
