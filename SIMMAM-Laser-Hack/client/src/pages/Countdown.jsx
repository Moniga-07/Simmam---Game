import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Countdown.css';

const SEQUENCE = [3, 2, 1, 'GO!'];

function Countdown() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < SEQUENCE.length - 1) {
      const timer = setTimeout(() => setStep(s => s + 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // "GO!" shown — navigate after brief pause
      const timer = setTimeout(() => navigate('/game'), 800);
      return () => clearTimeout(timer);
    }
  }, [step, navigate]);

  const current = SEQUENCE[step];
  const isGo = current === 'GO!';

  return (
    <div className="page countdown-page" id="countdown">
      <div className={`countdown-ring ${isGo ? 'go' : ''}`}>
        <div className="countdown-inner">
          <span
            key={step}
            className={`countdown-number ${isGo ? 'go-text' : ''}`}
          >
            {current}
          </span>
        </div>
      </div>
      <p className="countdown-sub">
        {isGo ? 'Navigate the laser!' : 'Get ready…'}
      </p>

      {/* Pips */}
      <div className="countdown-pips">
        {SEQUENCE.slice(0, 3).map((_, i) => (
          <div key={i} className={`pip ${i <= step ? 'active' : ''}`} />
        ))}
      </div>
    </div>
  );
}

export default Countdown;
