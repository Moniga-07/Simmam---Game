import { useState, useRef, useCallback } from 'react';
import { api, type StartGameResponse } from '../lib/api';

interface PlayerData {
  playerName: string;
  registerNumber: string;
  email: string;
  house: string;
}

export interface EndSessionResult {
  totalSeconds: number;
  highScore: number;
  isNewRecord: boolean;
}

interface UseGameSessionReturn {
  sessionId: string | null;
  totalSeconds: number | null;
  error: string | null;
  starting: boolean;
  ending: boolean;
  startSession: (player: PlayerData) => Promise<StartGameResponse | null>;
  endSession: (completed: boolean, score: number) => Promise<EndSessionResult | null>;
}

/**
 * Manages server-authoritative game session lifecycle.
 *
 * KEY FIX: sessionId is stored in BOTH state (for React rendering) and a ref
 * (for stable access inside the game loop / stale closures).
 * endSession reads from the ref so it always has the current sessionId,
 * even when called from a useCallback that was created before the session started.
 */
export function useGameSession(): UseGameSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null); // ← KEY: always up-to-date

  const [totalSeconds, setTotalSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  const startSession = useCallback(async (player: PlayerData): Promise<StartGameResponse | null> => {
    setStarting(true);
    setError(null);
    try {
      const res = await api.startGame(player);
      setSessionId(res.sessionId);
      sessionIdRef.current = res.sessionId; // sync the ref immediately
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start session';
      setError(msg);
      return null;
    } finally {
      setStarting(false);
    }
  }, []);

  /**
   * endSession has NO dependencies — it reads sessionId from the ref,
   * so it is safe to call from any stale closure (e.g. the game loop).
   */
  const endSession = useCallback(async (completed: boolean, score: number = 0): Promise<EndSessionResult | null> => {
    const sid = sessionIdRef.current;
    if (!sid) {
      setError('No active session');
      return null;
    }

    // Clear the ref immediately so it cannot be called twice
    sessionIdRef.current = null;

    setEnding(true);
    setError(null);
    try {
      const res = await api.endGame({ sessionId: sid, completed, score });
      setTotalSeconds(res.totalSeconds);
      return {
        totalSeconds: res.totalSeconds,
        highScore: res.highScore,
        isNewRecord: res.isNewRecord,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to end session';
      setError(msg);
      return null;
    } finally {
      setEnding(false);
    }
  }, []); // ← no deps — reads from ref, never stale

  return { sessionId, totalSeconds, error, starting, ending, startSession, endSession };
}
