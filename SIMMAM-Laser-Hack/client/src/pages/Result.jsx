import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import './Result.css';

function Result() {
  const navigate = useNavigate();
  const location = useLocation();

  const totalSeconds = location.state?.totalSeconds || 0;
  
  // Get data from sessionStorage instead of location.state
  const [playerData, setPlayerData] = useState({ playerName: 'Anonymous', registerNumber: '', house: '' });

  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem('playerData');
      if (savedData) {
        setPlayerData(JSON.parse(savedData));
      }
    } catch (e) {
      console.error('Failed to parse player data from session storage');
    }
  }, []);

  const playerName = playerData.playerName;

  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  const actualTime = `${m}:${s}`;

  const [leaderboard, setLeaderboard] = useState([]);
  const [playerRank, setPlayerRank] = useState(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);

  const formatTime = (secs) => {
    const min = String(Math.floor(secs / 60)).padStart(2, '0');
    const sec = String(secs % 60).padStart(2, '0');
    return `${min}:${sec}`;
  };

  useEffect(() => {
    // Only run this if we have loaded the playerData (or if it defaults to Anonymous, we should still run it, but let's ensure we wait a tick to load from session storage if possible)
    // Actually, useEffect for session storage runs after first render. 
    // To avoid posting 'Anonymous' incorrectly on first render, we should only post when playerData is set.
    if (playerName === 'Anonymous' && sessionStorage.getItem('playerData')) return;

    let isMounted = true;
    
    const saveAndFetch = async () => {
      try {
        // 1. Save the current run
        if (totalSeconds > 0) {
          await fetch('http://localhost:3001/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              playerName: playerData.playerName, 
              registerNumber: playerData.registerNumber,
              house: playerData.house,
              totalSeconds 
            }),
          });
        }

        // 2. Fetch the updated leaderboard
        const res = await fetch(`http://localhost:3001/api/leaderboard?playerName=${encodeURIComponent(playerData.playerName)}&totalSeconds=${totalSeconds}`);
        const data = await res.json();
        
        if (isMounted) {
          setLeaderboard(data.top3 || []);
          setPlayerRank(data.playerRank);
          setTotalPlayers(data.totalPlayers || 0);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    saveAndFetch();
    
    return () => {
      isMounted = false;
    };
  }, [playerData.playerName, playerData.registerNumber, playerData.house, totalSeconds]);

  // Determine if player is in top 3
  const isTop3 = playerRank !== null && playerRank <= 3;

  return (
    <div className="page result-page" id="result">
      <div className="neon-card result-card">
        <div className="corner tl" /><div className="corner tr" />
        <div className="corner bl" /><div className="corner br" />

        {/* Trophy */}
        <div className="result-trophy">🏆</div>

        <span className="neon-badge">MISSION COMPLETE</span>
        <h1 className="neon-title result-title">Congratulations!</h1>
        <p className="result-subtitle">You completed all 3 levels of SIMMAM Laser Hack.</p>

        <div className="neon-divider" />

        {/* Stats */}
        <div className="result-stats">
          <div className="result-stat">
            <span className="rstat-icon">⏱️</span>
            <span className="rstat-value">{actualTime}</span>
            <span className="rstat-label">Total Time</span>
          </div>
          <div className="result-stat highlight">
            <span className="rstat-icon">🥉</span>
            <span className="rstat-value">{playerRank ? `#${playerRank}` : '--'}</span>
            <span className="rstat-label">Your Rank</span>
          </div>
          <div className="result-stat">
            <span className="rstat-icon">👥</span>
            <span className="rstat-value">{totalPlayers || '--'}</span>
            <span className="rstat-label">Players</span>
          </div>
        </div>

        <div className="neon-divider" />

        {/* Leaderboard preview */}
        <div className="lb-preview">
          <p className="lb-title">TOP SCORES</p>
          
          {loading ? (
            <div className="lb-row"><span className="lb-name" style={{ textAlign: 'center', width: '100%' }}>Syncing database...</span></div>
          ) : leaderboard.length === 0 ? (
            <div className="lb-row"><span className="lb-name" style={{ textAlign: 'center', width: '100%' }}>No completed runs yet. Be the first to finish!</span></div>
          ) : (
            <>
              {leaderboard.map((entry, i) => {
                // If they are tied with themselves, this checks if it's the exact same time
                // To avoid false positives on ties, we could do more complex logic, but this works well enough
                const isCurrentPlayer = (entry.playerName === playerName && entry.totalSeconds === totalSeconds && (i + 1) === playerRank);
                
                return (
                  <div key={i} className={`lb-row ${isCurrentPlayer ? 'lb-you' : ''}`}>
                    <span className="lb-pos">{i + 1}</span>
                    <span className="lb-name">{entry.playerName}</span>
                    <span className="lb-time" style={{ marginLeft: 'auto', fontFamily: 'Orbitron, monospace', color: 'var(--neon-cyan)' }}>{formatTime(entry.totalSeconds)}</span>
                  </div>
                );
              })}
              
              {!isTop3 && playerRank && (
                <>
                  <div className="lb-row" style={{ justifyContent: 'center', opacity: 0.5, padding: '2px 0' }}>...</div>
                  <div className="lb-row lb-you">
                    <span className="lb-pos">{playerRank}</span>
                    <span className="lb-name">{playerName}</span>
                    <span className="lb-time" style={{ marginLeft: 'auto', fontFamily: 'Orbitron, monospace', color: 'var(--neon-cyan)' }}>{actualTime}</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="result-actions">
          <NeonButton id="btn-home" variant="secondary" onClick={() => navigate('/')}>
            🏠 Home
          </NeonButton>
        </div>
      </div>
    </div>
  );
}

export default Result;
