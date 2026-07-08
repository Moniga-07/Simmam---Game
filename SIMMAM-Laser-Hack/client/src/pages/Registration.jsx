import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NeonButton from '../components/NeonButton';
import './Registration.css';

function Registration() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    registerNumber: '',
    house: 'agniyas'
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.registerNumber.trim()) return;

    // Save to session storage
    sessionStorage.setItem('playerData', JSON.stringify({
      playerName: formData.name.trim(),
      registerNumber: formData.registerNumber.trim(),
      house: formData.house
    }));

    // Navigate to landing page
    navigate('/home');
  };

  return (
    <div className="page reg-page" id="registration">
      <div className="laser-beam beam-h" aria-hidden="true" />
      <div className="laser-beam beam-v" aria-hidden="true" />

      <div className="neon-card reg-card">
        <div className="corner tl" /><div className="corner tr" />
        <div className="corner bl" /><div className="corner br" />

        <h1 className="neon-title reg-title">SIMMAM 2026</h1>
        <p className="reg-subtitle">Enter your credentials to access the terminal.</p>

        <div className="neon-divider" />

        <form onSubmit={handleSubmit} className="reg-form">
          <div className="form-group">
            <label htmlFor="name">Agent Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              placeholder="e.g. CyberX" 
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="registerNumber">Register Number</label>
            <input 
              type="text" 
              id="registerNumber" 
              name="registerNumber" 
              placeholder="e.g. 7120251234" 
              value={formData.registerNumber}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="house">House</label>
            <div className="select-wrapper">
              <select 
                id="house" 
                name="house" 
                value={formData.house}
                onChange={handleChange}
              >
                <option value="agniyas">Agniyas</option>
                <option value="dronas">Dronas</option>
                <option value="marutas">Marutas</option>
                <option value="rudras">Rudras</option>
                <option value="suryas">Suryas</option>
                <option value="vajras">Vajras</option>
              </select>
            </div>
          </div>

          <div className="reg-actions">
            <NeonButton id="btn-submit-reg" variant="primary" type="submit">
              Initialize Run ▶
            </NeonButton>
          </div>
        </form>
      </div>

      <div className="home-corner top-left"   aria-hidden="true" />
      <div className="home-corner top-right"  aria-hidden="true" />
      <div className="home-corner bot-left"   aria-hidden="true" />
      <div className="home-corner bot-right"  aria-hidden="true" />
    </div>
  );
}

export default Registration;
