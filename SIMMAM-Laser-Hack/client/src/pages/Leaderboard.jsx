import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NeonButton from '../components/NeonButton';
import { api } from '../lib/api';
import './Leaderboard.css';

const HOUSES = ['all', 'agniyas', 'dronas', 'marutas', 'rudras', 'suryas', 'vajras'];

const HOUSE_COLORS = {
  agniyas: '#ff6b35',
  dronas:  '#00f5ff',
  marutas: '#7b2fff',
  rudras:  '#ff003c',
  suryas:  '#ffd700',
  vajras:  '#00ff88',
  all:     '#00f5ff',
};

function Leaderboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHouse, setSelectedHouse] = useState('all');
  const [totalPlayers, setTotalPlayers] = useState(0);

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const rankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getLeaderboard({ house: selectedHouse === 'all' ? undefined : selectedHouse, limit: 50 })
      .then(data => {
        setEntries(data.leaderboard);
        setTotalPlayers(data.totalPlayers || data.leaderboard.length);
      })
      .catch(err => {
        setError(err.message || 'Failed to load leaderboard');
      })
      .finally(() => setLoading(false));
  }, [selectedHouse]);

  return (
    <div className="page lb-page" id="leaderboard">
      <div className="laser-beam beam-h" aria-hidden="true" />

      <motion.div
        className="lb-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {/* Header */}
        <div className="lb-header">
          <NeonButton id="btn-lb-back" size="sm" variant="secondary" onClick={() => navigate('/')}>
            ← Back
          </NeonButton>
          <div>
            <span className="neon-badge">HALL OF FAME</span>
            <h1 className="neon-title lb-title">Leaderboard</h1>
          </div>
          <div className="lb-total">
            <span className="hud-label">PLAYERS</span>
            <span className="hud-value">{totalPlayers}</span>
          </div>
        </div>

        {/* House filter pills */}
        <div className="lb-filters">
          {HOUSES.map(house => (
            <motion.button
              key={house}
              className={`house-pill ${selectedHouse === house ? 'active' : ''}`}
              style={{ '--pill-color': HOUSE_COLORS[house] }}
              onClick={() => setSelectedHouse(house)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {house === 'all' ? 'All' : house.charAt(0).toUpperCase() + house.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* Table */}
        <div className="lb-table-wrapper">
          <div className="lb-table-header">
            <span className="col-rank">Rank</span>
            <span className="col-name">Agent</span>
            <span className="col-house">House</span>
            <span className="col-time">Time</span>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                className="lb-status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="lb-spinner" />
                Loading leaderboard…
              </motion.div>
            ) : error ? (
              <motion.div key="error" className="lb-status lb-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                ⚠️ {error}
              </motion.div>
            ) : entries.length === 0 ? (
              <motion.div key="empty" className="lb-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                No completed runs yet for this house. Be the first!
              </motion.div>
            ) : (
              <motion.div key={selectedHouse} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {entries.map((entry, i) => (
                  <motion.div
                    key={`${entry.playerName}-${i}`}
                    className={`lb-table-row ${i < 3 ? 'top-row' : ''}`}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <span className="col-rank rank-badge">{rankIcon(entry.rank)}</span>
                    <span className="col-name">{entry.playerName}</span>
                    <span
                      className="col-house house-tag"
                      style={{ color: HOUSE_COLORS[entry.house] || '#00f5ff' }}
                    >
                      {entry.house}
                    </span>
                    <span className="col-time time-val">{formatTime(entry.totalSeconds)}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer CTAs */}
        <div className="lb-footer-actions">
          <NeonButton id="btn-play-from-lb" variant="primary" onClick={() => navigate('/')}>
            ▶ Play Now
          </NeonButton>
        </div>
      </motion.div>
    </div>
  );
}

export default Leaderboard;
