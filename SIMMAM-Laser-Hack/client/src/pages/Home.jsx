import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NeonButton from '../components/NeonButton';
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
            🏆 &nbsp;Leaderboard
          </NeonButton>
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
