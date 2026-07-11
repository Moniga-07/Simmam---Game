import { useState, useRef, useCallback } from 'react';
import { api, type StartGameResponse } from '../lib/api';

interface PlayerData {
  playerName: string;
  registerNumber: string;
  email: string;
  house: string;
}

interface UseGameSessionReturn {
  sessionId: string | null;
  totalSeconds: number | null;
  error: string | null;
  starting: boolean;
  ending: boolean;
  startSession: (player: PlayerData) => Promise<StartGameResponse | null>;
  endSession: (completed: boolean, score: number) => Promise<{ totalSeconds: number } | null>;
}

/**
 * Manages server-authoritative game session lifecycle.
 * Call startSession() before game begins, endSession() when all levels complete.
 * The server computes the authoritative survival time — we never trust the client timer.
 */
export function useGameSession(): UseGameSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const playerDataRef = useRef<PlayerData | null>(null);

  const startSession = useCallback(async (player: PlayerData): Promise<StartGameResponse | null> => {
    setStarting(true);
    setError(null);
    playerDataRef.current = player;
    try {
      const res = await api.startGame(player);
      setSessionId(res.sessionId);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      setError(msg);
      return null;
    } finally {
      setStarting(false);
    }
  }, []);

  const endSession = useCallback(async (completed: boolean, score: number = 0): Promise<{ totalSeconds: number } | null> => {
    if (!sessionId) {
      setError('No active session');
      return null;
    }
    setEnding(true);
    setError(null);
    try {
      const res = await api.endGame({ sessionId, completed, score });
      setTotalSeconds(res.totalSeconds);
      return { totalSeconds: res.totalSeconds };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to end session';
      setError(msg);
      // Fallback: use client timer if server fails (graceful degradation)
      return null;
    } finally {
      setEnding(false);
    }
  }, [sessionId]);

  return { sessionId, totalSeconds, error, starting, ending, startSession, endSession };
}
