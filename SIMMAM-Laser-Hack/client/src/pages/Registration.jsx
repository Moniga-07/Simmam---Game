import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NeonButton from '../components/NeonButton';
import { api } from '../lib/api';
import './Registration.css';

const HOUSES = [
  { value: 'agniyas',  label: 'Agniyas',  color: '#ff6b35' },
  { value: 'dronas',   label: 'Dronas',   color: '#00f5ff' },
  { value: 'marutas',  label: 'Marutas',  color: '#7b2fff' },
  { value: 'rudras',   label: 'Rudras',   color: '#ff003c' },
  { value: 'suryas',   label: 'Suryas',   color: '#ffd700' },
  { value: 'vajras',   label: 'Vajras',   color: '#00ff88' },
];

function Registration() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    registerNumber: '',
    email: '',
    house: 'agniyas',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formData.name.trim() || !formData.registerNumber.trim() || !formData.email.trim()) {
      setErrorMsg('All fields are mandatory.');
      return;
    }

    if (!formData.email.trim().toLowerCase().endsWith('@saveetha.com')) {
      setErrorMsg('Only @saveetha.com email addresses are allowed.');
      return;
    }

    setIsLoading(true);
    try {
      await api.checkEligibility({
        registerNumber: formData.registerNumber.trim(),
        email: formData.email.trim(),
      });

      sessionStorage.setItem('playerData', JSON.stringify({
        playerName: formData.name.trim(),
        registerNumber: formData.registerNumber.trim(),
        email: formData.email.trim(),
        house: formData.house,
      }));

      navigate('/game');
    } catch (err) {
      setErrorMsg(err.message || 'Error connecting to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const fieldVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1, x: 0,
      transition: { delay: 0.2 + i * 0.1, duration: 0.4 },
    }),
  };

  return (
    <div className="page reg-page" id="registration">
      <div className="laser-beam beam-h" aria-hidden="true" />
      <div className="laser-beam beam-v" aria-hidden="true" />

      <motion.div
        className="neon-card reg-card"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="corner tl" /><div className="corner tr" />
        <div className="corner bl" /><div className="corner br" />

        <motion.h1
          className="neon-title reg-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          SIMMAM 2026
        </motion.h1>
        <motion.p
          className="reg-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Enter your credentials to access the terminal.
        </motion.p>

        <div className="neon-divider" />

        <form onSubmit={handleSubmit} className="reg-form">
          {[
            { label: 'Agent Name', id: 'name', placeholder: 'Moniga', type: 'text' },
            { label: 'Register Number', id: 'registerNumber', placeholder: '192521***', type: 'text' },
            { label: 'Saveetha Mail-ID', id: 'email', placeholder: '192521184.simats@saveetha.com', type: 'email' },
          ].map((field, i) => (
            <motion.div
              key={field.id}
              className="form-group"
              variants={fieldVariants}
              initial="hidden"
              animate="visible"
              custom={i}
            >
              <label htmlFor={field.id}>{field.label}</label>
              <input
                type={field.type}
                id={field.id}
                name={field.id}
                placeholder={field.placeholder}
                value={formData[field.id]}
                onChange={handleChange}
                required
                pattern={field.id === 'email' ? '.*@saveetha\\.com$' : undefined}
                title={field.id === 'email' ? 'Must be a @saveetha.com email address' : undefined}
                autoComplete="off"
              />
            </motion.div>
          ))}

          <motion.div
            className="form-group"
            variants={fieldVariants}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            <label>House</label>
            <div className="house-grid">
              {HOUSES.map((h) => (
                <label
                  key={h.value}
                  className={`house-option ${formData.house === h.value ? 'selected' : ''}`}
                  style={{ '--house-color': h.color }}
                >
                  <input
                    type="radio"
                    name="house"
                    value={h.value}
                    checked={formData.house === h.value}
                    onChange={handleChange}
                  />
                  {h.label}
                </label>
              ))}
            </div>
          </motion.div>

          {errorMsg && (
            <motion.div
              style={{ color: '#ff003c', textAlign: 'center', marginTop: '10px', textShadow: '0 0 5px #ff003c' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {errorMsg}
            </motion.div>
          )}

          <motion.div
            className="reg-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <NeonButton id="btn-submit-reg" variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? 'INITIALIZING...' : 'Initialize Run ▶'}
            </NeonButton>
          </motion.div>
        </form>
      </motion.div>

      <div className="home-corner top-left" aria-hidden="true" />
      <div className="home-corner top-right" aria-hidden="true" />
      <div className="home-corner bot-left" aria-hidden="true" />
      <div className="home-corner bot-right" aria-hidden="true" />
    </div>
  );
}

export default Registration;
