import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

import Registration  from './pages/Registration';
import Home          from './pages/Home';
import Leaderboard   from './pages/Leaderboard';
import SpaceSurvivor from './pages/SpaceSurvivor';

function App() {
  return (
    <BrowserRouter>
      <div className="scanline" aria-hidden="true" />
      <Routes>
        <Route path="/"             element={<Home />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/game"         element={<SpaceSurvivor />} />
        <Route path="/leaderboard"  element={<Leaderboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;