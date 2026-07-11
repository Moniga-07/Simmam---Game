import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NeonButton from '../components/NeonButton';
import { api } from '../lib/api';
import './Home.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

function Home() {
  const navigate = useNavigate();
  const [topPlayers, setTopPlayers] = useState([]);

  useEffect(() => {
    const fetchLB = () => {
      api.getLeaderboard({ limit: 5 })
        .then(data => {
          if (data && data.leaderboard) {
            setTopPlayers(data.leaderboard);
          }
        })
        .catch(console.error);
    };
    
    fetchLB(); // Initial fetch
    const interval = setInterval(fetchLB, 5000); // Live poll every 5s
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="page home-page" id="home">
      {/* Laser beams decoration */}
      <div className="laser-beam beam-h" aria-hidden="true" />
      <div className="laser-beam beam-v" aria-hidden="true" />

      <motion.div
        className="home-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Title */}
        <motion.h1 className="neon-title home-title" variants={itemVariants}>
          <span className="title-line1">SIMMAM</span>
          <span className="title-line2">SPACE<span className="title-accent"> SURVIVOR</span></span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p className="home-description" variants={itemVariants}>
          Your ship is caught in an asteroid field.<br/>
          Survive. Destroy. Collect.
        </motion.p>

        <motion.div className="neon-divider" variants={itemVariants} />

        {/* Action buttons */}
        <motion.div className="home-actions" variants={itemVariants}>
          <NeonButton
            id="btn-start"
            variant="primary"
            onClick={() => navigate('/registration')}
          >
            ▶ &nbsp;Launch Game
          </NeonButton>
          <NeonButton
            id="btn-leaderboard"
            variant="secondary"
            onClick={() => navigate('/leaderboard')}
          >
            🏆 &nbsp;Full Leaderboard
          </NeonButton>
        </motion.div>

        {/* Live Mini Leaderboard */}
        <motion.div className="home-mini-lb" variants={itemVariants}>
          <h3 style={{ color: '#00f5ff', fontFamily: 'Orbitron', marginBottom: '1rem', textShadow: '0 0 10px #00f5ff', textAlign: 'center' }}>LIVE LEADERBOARD</h3>
          <div style={{ background: 'rgba(0,10,30,0.6)', border: '1px solid #00f5ff', borderRadius: '8px', padding: '1rem', minWidth: '300px' }}>
            {topPlayers.length === 0 ? (
              <div style={{ color: '#7ab8d4', textAlign: 'center', fontFamily: 'Orbitron' }}>Awaiting data...</div>
            ) : (
              <AnimatePresence>
                {topPlayers.map((p, i) => (
                  <motion.div 
                    key={p.registerNumber}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontFamily: 'Orbitron', fontSize: '0.9rem' }}
                  >
                    <span style={{ color: i === 0 ? '#ffd700' : i === 1 ? '#e6e8fa' : i === 2 ? '#cd7f32' : '#00f5ff', width: '30px' }}>#{p.rank}</span>
                    <span style={{ color: '#fff', flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.playerName}</span>
                    <span style={{ color: '#00ff88', marginLeft: '10px' }}>{formatTime(p.totalSeconds)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Corner accent lines */}
      <div className="home-corner top-left"   aria-hidden="true" />
      <div className="home-corner top-right"  aria-hidden="true" />
      <div className="home-corner bot-left"   aria-hidden="true" />
      <div className="home-corner bot-right"  aria-hidden="true" />
    </div>
  );
}

export default Home;
