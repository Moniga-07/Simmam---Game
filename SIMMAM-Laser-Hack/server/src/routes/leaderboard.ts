import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../lib/supabase';

const router = Router();

// ─── GET /api/leaderboard ────────────────────────────────────────────────────
// Returns top N entries and the requesting player's rank (if provided)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { playerName, totalSeconds, limit = '10', house } = req.query as {
    playerName?: string;
    totalSeconds?: string;
    limit?: string;
    house?: string;
  };

  const topLimit = Math.min(parseInt(limit, 10) || 10, 100);

  try {
    // Build leaderboard query
    let query = supabase
      .from('runs')
      .select('player_name, register_number, house, total_seconds, score, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(topLimit);

    // Optional filter by house
    if (house && house !== 'all') {
      query = query.eq('house', house);
    }

    const { data: topRows, error: topError } = await query;
    if (topError) throw topError;

    const mappedTopRows = (topRows || []).map((row, i) => ({
      rank: i + 1,
      playerName: row.player_name,
      registerNumber: row.register_number,
      house: row.house,
      totalSeconds: row.total_seconds,
      score: row.score,
      completedAt: row.created_at,
    }));

    if (!playerName || !totalSeconds) {
      res.json({ leaderboard: mappedTopRows, playerRank: null, totalPlayers: 0 });
      return;
    }

    // Get total players
    const { count: totalPlayers, error: countError } = await supabase
      .from('runs')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get rank
    const { count: fasterPlayers, error: fasterError } = await supabase
      .from('runs')
      .select('*', { count: 'exact', head: true })
      .lt('total_seconds', Number(totalSeconds));

    if (fasterError) throw fasterError;

    const playerRank = (fasterPlayers || 0) + 1;

    res.json({
      leaderboard: mappedTopRows,
      // Keep backward compat — top3 for Result page
      top3: mappedTopRows.slice(0, 3),
      playerRank,
      totalPlayers: totalPlayers || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching leaderboard:', message);
    res.status(500).json({ error: message });
  }
});

// ─── POST /api/leaderboard ───────────────────────────────────────────────────
// Legacy direct insert (kept for backward compatibility during migration)
// New flow: use POST /api/game/start + POST /api/game/end instead
router.post(
  '/',
  [
    body('playerName').trim().notEmpty().withMessage('playerName is required'),
    body('registerNumber').trim().notEmpty().withMessage('registerNumber is required'),
    body('house').trim().notEmpty().withMessage('house is required'),
    body('totalSeconds').isInt({ min: 1 }).withMessage('totalSeconds must be a positive integer'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { playerName, registerNumber, house, totalSeconds } = req.body as {
      playerName: string;
      registerNumber: string;
      house: string;
      totalSeconds: number;
    };

    try {
      const { data, error } = await supabase
        .from('runs')
        .insert([
          {
            player_name: playerName,
            register_number: registerNumber,
            house,
            total_seconds: totalSeconds,
          },
        ])
        .select('id')
        .single();

      if (error) throw error;

      res.json({ success: true, runId: data.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error saving run:', message);
      res.status(500).json({ error: message });
    }
  }
);

export default router;
