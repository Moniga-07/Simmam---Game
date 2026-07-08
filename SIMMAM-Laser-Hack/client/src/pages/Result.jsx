import { useLocation, useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import './Result.css';

// Demo values for rank and total players (would come from DB)
const DEMO_RANK  = 3;
const DEMO_TOTAL = 48;

function Result() {
  const navigate = useNavigate();
  const location = useLocation();

  const totalSeconds = location.state?.totalSeconds || 0;
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  const actualTime = `${m}:${s}`;

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
            <span className="rstat-value">#{DEMO_RANK}</span>
            <span className="rstat-label">Your Rank</span>
          </div>
          <div className="result-stat">
            <span className="rstat-icon">👥</span>
            <span className="rstat-value">{DEMO_TOTAL}</span>
            <span className="rstat-label">Players</span>
          </div>
        </div>

        <div className="neon-divider" />

        {/* Leaderboard preview */}
        <div className="lb-preview">
          <p className="lb-title">TOP SCORES</p>
          {['CyberX — 01:58', 'Nova_7 — 02:11', 'You — 02:34'].map((entry, i) => (
            <div key={i} className={`lb-row ${i === 2 ? 'lb-you' : ''}`}>
              <span className="lb-pos">{i + 1}</span>
              <span className="lb-name">{entry}</span>
            </div>
          ))}
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
