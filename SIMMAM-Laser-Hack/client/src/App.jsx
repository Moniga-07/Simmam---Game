import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';

import Registration from './pages/Registration';
import Home        from './pages/Home';
import Instructions from './pages/Instructions';
import Countdown   from './pages/Countdown';
import Game        from './pages/Game';
import Result      from './pages/Result';

function App() {
  return (
    <BrowserRouter>
      <div className="scanline" aria-hidden="true" />
      <Routes>
        <Route path="/"            element={<Registration />} />
        <Route path="/home"        element={<Home />} />
        <Route path="/instructions" element={<Instructions />} />
        <Route path="/countdown"   element={<Countdown />} />
        <Route path="/game"        element={<Game />} />
        <Route path="/result"      element={<Result />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;