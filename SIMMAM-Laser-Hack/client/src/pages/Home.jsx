import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="page home-page" id="home">
      {/* Laser beams decoration */}
      <div className="laser-beam beam-h" aria-hidden="true" />
      <div className="laser-beam beam-v" aria-hidden="true" />

      <div className="home-content">
        {/* Title */}
        <h1 className="neon-title home-title">
          <span className="title-line1">SIMMAM</span>
          <span className="title-line2">LASER<span className="title-accent"> HACK</span></span>
        </h1>

        {/* Subtitle */}
        <p className="home-description">
          Guide the laser safely through <span className="hl">three increasingly difficult</span> randomized maze levels
          without touching the walls. Only the fastest survive.
        </p>

        <div className="neon-divider" />

        {/* Stats row */}
        <div className="home-stats">
          <div className="stat-item">
            <span className="stat-value">3</span>
            <span className="stat-label">Levels</span>
          </div>
          <div className="stat-sep" />
          <div className="stat-item">
            <span className="stat-value">1</span>
            <span className="stat-label">Winner</span>
          </div>
        </div>

        <div className="neon-divider" />

        {/* Action buttons */}
        <div className="home-actions">
          <NeonButton
            id="btn-start"
            variant="primary"
            onClick={() => navigate('/instructions')}
          >
            ▶ &nbsp;Start Game
          </NeonButton>
          <NeonButton
            id="btn-leaderboard"
            variant="secondary"
            onClick={() => navigate('/result')}
          >
            🏆 &nbsp;Leaderboard
          </NeonButton>
        </div>
      </div>

      {/* Corner accent lines */}
      <div className="home-corner top-left"   aria-hidden="true" />
      <div className="home-corner top-right"  aria-hidden="true" />
      <div className="home-corner bot-left"   aria-hidden="true" />
      <div className="home-corner bot-right"  aria-hidden="true" />
    </div>
  );
}

export default Home;
