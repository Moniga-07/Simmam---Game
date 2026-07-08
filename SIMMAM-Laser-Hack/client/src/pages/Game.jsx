import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Maze from '../components/Maze';
import NeonButton from '../components/NeonButton';
import { LEVEL_1_VARIANTS, LEVEL_2_VARIANTS, LEVEL_3_VARIANTS } from '../data/levels';
import './Game.css';

const TOTAL_LEVELS = 3;

// Helper to get random items
function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function Game() {
  const navigate    = useNavigate();
  const [level, setLevel]     = useState(1);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [showBeat, setShowBeat] = useState(false);
  const intervalRef  = useRef(null);
  const resetMazeRef = useRef(null);            // callback set by Maze component
  const isTransitioning = useRef(false);

  // Pick 5 random levels on mount: 2 Easy, 2 Medium, 1 Hard
  const gameLevels = useMemo(() => {
    return [
      ...getRandomItems(LEVEL_1_VARIANTS, 1),
      ...getRandomItems(LEVEL_2_VARIANTS, 1),
      ...getRandomItems(LEVEL_3_VARIANTS, 1)
    ];
  }, []);

  const currentLevelData = gameLevels[level - 1];

  // Timer
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setTotalSeconds(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const formatTime = (s) => {
    const m   = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  // Called when the player reaches the finish cell
  const handleLevelComplete = useCallback(() => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    setRunning(false);
    setShowBeat(true);

    setTimeout(() => {
      setShowBeat(false);

      if (level < TOTAL_LEVELS) {
        setLevel(l => l + 1);
        setRunning(true);
        isTransitioning.current = false;
      } else {
        // All levels done → Result page
        navigate('/result', { state: { totalSeconds } });
      }
    }, 1200);
  }, [level, totalSeconds, navigate]);

  const handleRestart = () => {
    // Reset player position to start, but keep timer running for penalty
    setRunning(true);
    resetMazeRef.current?.();
  };

  const handleExit = () => {
    setRunning(false);
    navigate('/');
  };

  return (
    <div className="game-page" id="game">
      {/* Level beat overlay */}
      {showBeat && (
        <div className="level-beat-overlay">
          <span className="beat-text">
            {level < TOTAL_LEVELS ? `LEVEL ${level} CLEAR!` : 'MISSION COMPLETE!'}
          </span>
        </div>
      )}

      {/* HUD */}
      <header className="game-hud" style={{ flexDirection: 'column', alignItems: 'center', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="hud-item">
            <span className="hud-label">LEVEL</span>
            <span className="hud-value level-badge">{level} / {TOTAL_LEVELS}</span>
          </div>

        <div className="hud-center">
          <span className="hud-label">TIME</span>
          <span className="hud-value timer-display">{formatTime(totalSeconds)}</span>
        </div>

        <div className="hud-item hud-right">
          <NeonButton id="btn-restart" size="sm" variant="secondary" onClick={handleRestart}>
            ↺ Restart
          </NeonButton>
          <NeonButton id="btn-exit" size="sm" variant="danger" onClick={handleExit}>
            ✕ Exit
          </NeonButton>
        </div>
        </div>
      </header>

      {/* Level progress track */}
      <div className="level-track">
        {[1, 2, 3].map(lvl => (
          <div key={lvl} className={`level-node ${lvl < level ? 'done' : lvl === level ? 'active' : ''}`}>
            <span>{lvl < level ? '✓' : lvl}</span>
          </div>
        ))}
        <div className="level-track-line" />
      </div>

      {/* Maze */}
      <main className="game-main">
        <Maze
          levelData={currentLevelData}
          onLevelComplete={handleLevelComplete}
          onReset={resetMazeRef}
        />
      </main>

      {/* Footer */}
      <footer className="game-footer">
        <span className="footer-hint">
          <span className="key-badge">↑</span>
          <span className="key-badge">↓</span>
          <span className="key-badge">←</span>
          <span className="key-badge">→</span>
          Arrow keys &nbsp;·&nbsp; Touch: swipe or D-pad
        </span>
        <span className="footer-status">
          <span className="status-dot" /> {running ? 'ACTIVE' : 'PAUSED'}
        </span>
      </footer>
    </div>
  );
}

export default Game;
