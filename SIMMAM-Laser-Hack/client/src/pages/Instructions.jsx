import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import './Instructions.css';

const steps = [
  { icon: '⌨️', label: 'Laptop — Arrow Keys', text: 'Use the ↑ ↓ ← → arrow keys on your keyboard to move the laser.' },
  { icon: '📱', label: 'Phone — Touch',        text: 'Swipe in any direction OR tap the on-screen D-pad to navigate.' },
  { icon: '⚠️', label: 'No Wall Contact', text: 'If the laser touches any wall, your run resets immediately.' },
  { icon: '🎯', label: 'Reach the Goal',  text: 'Navigate to the finish point at the end of each maze.' },
  { icon: '🔢', label: '3 Levels',        text: 'Complete all three randomized levels in one continuous session.' },
  { icon: '⏱️', label: 'Time Matters',    text: 'Fastest verified total time across all levels wins the game.' },
  { icon: '🚀', label: 'Countdown Start', text: 'Click Start — a 3-second countdown begins before Level 1.' },
];

function Instructions() {
  const navigate = useNavigate();

  return (
    <div className="page instr-page" id="instructions">
      <div className="neon-card instr-card">
        <div className="corner tl" /><div className="corner tr" />
        <div className="corner bl" /><div className="corner br" />

        <span className="neon-badge">HOW TO PLAY</span>
        <h1 className="neon-title instr-title">Instructions</h1>
        <div className="neon-divider" />

        <ol className="instr-list">
          {steps.map((step, i) => (
            <li key={i} className="instr-item" style={{ animationDelay: `${i * 0.08}s` }}>
              <span className="instr-icon">{step.icon}</span>
              <div className="instr-text">
                <strong className="instr-label">{step.label}</strong>
                <span className="instr-desc">{step.text}</span>
              </div>
            </li>
          ))}
        </ol>

        <div className="neon-divider" />

        <div className="instr-warning">
          <span className="warn-icon">⚡</span>
          Touching a wall resets your current level run — be precise!
        </div>

        <div className="instr-actions">
          <NeonButton id="btn-back-home" variant="secondary" size="sm" onClick={() => navigate('/home')}>
            ← Back
          </NeonButton>
          <NeonButton id="btn-ready" variant="primary" onClick={() => navigate('/countdown')}>
            I'm Ready — Start ▶
          </NeonButton>
        </div>
      </div>
    </div>
  );
}

export default Instructions;
