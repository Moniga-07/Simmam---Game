import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../lib/supabase';

const router = Router();

// ─── POST /api/game/check ────────────────────────────────────────────────────
// Checks if the user is eligible to play (hasn't played before).
router.post(
  '/check',
  [
    body('registerNumber').trim().notEmpty().withMessage('registerNumber is required'),
    body('email').trim().isEmail().withMessage('valid email is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { registerNumber, email } = req.body;

    try {
      const { data: existingSession } = await supabase
        .from('game_sessions')
        .select('id')
        .or(`email.eq.${email},register_number.eq.${registerNumber}`)
        .limit(1);

      if (existingSession && existingSession.length > 0) {
        res.status(403).json({ error: 'User has already played' });
        return;
      }

      res.json({ success: true, eligible: true });
    } catch (err: unknown) {
      console.error('Error checking eligibility:', err);
      const message = err instanceof Error ? err.message : (err as any).message || 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

// ─── POST /api/game/start ────────────────────────────────────────────────────
// Creates a new game session on the server with a UTC start_time.
// Returns session_id to the client — client must include this on /end.
router.post(
  '/start',
  [
    body('playerName').trim().notEmpty().withMessage('playerName is required'),
    body('registerNumber').trim().notEmpty().withMessage('registerNumber is required'),
    body('email').trim().isEmail().withMessage('valid email is required').custom(value => {
      if (!value.toLowerCase().endsWith('@saveetha.com')) {
        throw new Error('Only @saveetha.com email addresses are allowed');
      }
      return true;
    }),
    body('house').trim().notEmpty().withMessage('house is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { playerName, registerNumber, email, house } = req.body as {
      playerName: string;
      registerNumber: string;
      email: string;
      house: string;
    };

    try {
      // Check if user already played
      const { data: existingSession } = await supabase
        .from('game_sessions')
        .select('id')
        .or(`email.eq.${email},register_number.eq.${registerNumber}`)
        .limit(1);

      if (existingSession && existingSession.length > 0) {
        res.status(403).json({ error: 'User has already played' });
        return;
      }

      const { data, error } = await supabase
        .from('game_sessions')
        .insert([
          {
            player_name: playerName,
            register_number: registerNumber,
            email,
            house,
            start_time: new Date().toISOString(),
          },
        ])
        .select('id, start_time')
        .single();

      if (error) throw error;

      res.json({ success: true, sessionId: data.id, startTime: data.start_time });
    } catch (err: unknown) {
      console.error('Error starting game session:', err);
      const message = err instanceof Error ? err.message : (err as any).message || 'Unknown error';
      res.status(500).json({ error: message });
    }
  }
);

// ─── POST /api/game/end ──────────────────────────────────────────────────────
// Records end_time and computes survival_time_ms on the SERVER.
// Never trusts client-provided survival time.
router.post(
  '/end',
  [
    body('sessionId').isUUID().withMessage('sessionId must be a valid UUID'),
    body('completed').isBoolean().withMessage('completed must be boolean'),
    body('score').optional().isNumeric().withMessage('score must be a number'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { sessionId, completed, score } = req.body as { sessionId: string; completed: boolean; score?: number };

    try {
      // Fetch the session's start_time
      const { data: session, error: fetchError } = await supabase
        .from('game_sessions')
        .select('id, start_time, player_name, register_number, email, house, completed')
        .eq('id', sessionId)
        .single();

      if (fetchError || !session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (session.completed) {
        res.status(409).json({ error: 'Session already completed' });
        return;
      }

      const endTime = new Date();
      const startTime = new Date(session.start_time);
      const survivalTimeMs = endTime.getTime() - startTime.getTime();
      const totalSeconds = Math.floor(survivalTimeMs / 1000);

      let highScore = score || 0;
      let isNewRecord = false;
      let isFirstTime = false;
      
      if (completed) {
        // Fetch current high score
        const { data: previousRuns } = await supabase
          .from('runs')
          .select('score')
          .eq('register_number', session.register_number)
          .order('score', { ascending: false })
          .limit(1);
          
        isFirstTime = !previousRuns || previousRuns.length === 0;
        const previousHighScore = isFirstTime ? -1 : (previousRuns?.[0]?.score ?? -1);
        
        if (highScore > previousHighScore) {
          isNewRecord = true;
        } else {
          highScore = previousHighScore;
        }
      }

      // Update the session
      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({
          end_time: endTime.toISOString(),
          survival_time_ms: survivalTimeMs,
          score: score || 0,
          high_score: highScore,
          is_new_record: isNewRecord && !isFirstTime,
          completed,
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Only save to leaderboard if the game was completed AND it's a new record or first time
      if (completed && (isNewRecord || isFirstTime)) {
        const { error: lbError } = await supabase.from('runs').upsert([
          {
            player_name: session.player_name,
            register_number: session.register_number,
            email: session.email,
            house: session.house,
            total_seconds: totalSeconds,
            score: score || 0,
            session_id: sessionId,
          },
        ], { onConflict: 'register_number' });
        if (lbError) throw lbError;
      }

      res.json({ success: true, totalSeconds, survivalTimeMs });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error ending game session:', message);
      res.status(500).json({ error: message });
    }
  }
);

export default router;
