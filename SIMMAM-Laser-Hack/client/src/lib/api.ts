// ─── Typed API Client ────────────────────────────────────────────────────────
// All API calls go through here. In development, Vite proxies /api to :3001.
// In production, the same origin serves the API.

const BASE = '';

export interface StartGameResponse {
  success: boolean;
  sessionId: string;
  startTime: string;
}

export interface EndGameResponse {
  success: boolean;
  totalSeconds: number;
  survivalTimeMs: number;
  highScore: number;
  isNewRecord: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  registerNumber: string;
  house: string;
  totalSeconds: number;
  completedAt: string;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  top3: LeaderboardEntry[];
  playerRank: number | null;
  totalPlayers: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((errBody as { error: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  /** Pre-check if a user has already played before going to the game screen */
  checkEligibility: (payload: { registerNumber: string; email: string }) =>
    request<{ success: boolean; eligible: boolean }>('/api/game/check', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Call when the player clicks "GO" — server records UTC start_time */
  startGame: (payload: { playerName: string; registerNumber: string; email: string; house: string }) =>
    request<StartGameResponse>('/api/game/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Call when all levels are complete — server computes survival_time */
  endGame: (payload: { sessionId: string; completed: boolean; score: number }) =>
    request<EndGameResponse>('/api/game/end', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Fetch the leaderboard, optionally filtering by house and paginating */
  getLeaderboard: (params?: {
    playerName?: string;
    totalSeconds?: number;
    limit?: number;
    house?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.playerName) qs.set('playerName', params.playerName);
    if (params?.totalSeconds !== undefined) qs.set('totalSeconds', String(params.totalSeconds));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.house) qs.set('house', params.house);
    return request<LeaderboardResponse>(`/api/leaderboard?${qs.toString()}`);
  },

  /** Legacy direct leaderboard post (fallback if session flow fails) */
  postRun: (payload: { playerName: string; registerNumber: string; email: string; house: string; totalSeconds: number }) =>
    request<{ success: boolean; runId: number }>('/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
