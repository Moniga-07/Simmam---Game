import { useState, useEffect, useRef, useCallback } from 'react';
import './Maze.css';

const CELL = 48;
const ROWS = 10;
const COLS = 15;

function findCell(grid, val) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] === val) return { r, c };
  return null;
}

function isDoorOpen(def, now) {
  return Math.floor((now - def.offset) / def.period) % 2 === 0;
}

function drawDecorations(ctx, r, c, val) {
  if (val !== 0) return;
  const x = c * CELL, y = r * CELL;
  
  const hash = (r * 13 + c * 31) % 100;
  
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(51, 255, 136, 0.4)';
  ctx.fillStyle = 'rgba(51, 255, 136, 0.4)';
  ctx.font = '9px monospace';

  if (hash < 3) {
    // Schematic Chip
    ctx.strokeRect(x + 12, y + 12, CELL - 24, CELL - 24);
    for(let i=0; i<3; i++) {
      ctx.beginPath(); ctx.moveTo(x + 8, y + 16 + i*6); ctx.lineTo(x + 12, y + 16 + i*6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + CELL - 12, y + 16 + i*6); ctx.lineTo(x + CELL - 8, y + 16 + i*6); ctx.stroke();
    }
    ctx.fillText('CX78', x + 14, y + 26);
  } else if (hash === 25) {
    // Schematic Resistor (zig zag)
    ctx.beginPath();
    ctx.moveTo(x + 10, y + CELL/2);
    ctx.lineTo(x + 14, y + CELL/2 - 5);
    ctx.lineTo(x + 18, y + CELL/2 + 5);
    ctx.lineTo(x + 22, y + CELL/2 - 5);
    ctx.lineTo(x + 26, y + CELL/2 + 5);
    ctx.lineTo(x + 30, y + CELL/2);
    ctx.lineTo(x + 38, y + CELL/2);
    ctx.stroke();
    ctx.fillText('8X11', x + 12, y + CELL/2 - 10);
  } else if (hash === 42) {
    // Capacitor symbol
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 15); ctx.lineTo(x + 15, y + 33);
    ctx.moveTo(x + 20, y + 15); ctx.lineTo(x + 20, y + 33);
    ctx.moveTo(x + 5, y + 24); ctx.lineTo(x + 15, y + 24);
    ctx.moveTo(x + 20, y + 24); ctx.lineTo(x + 35, y + 24);
    ctx.stroke();
    ctx.fillText('5442', x + 24, y + 18);
  }
}

function drawBackground(ctx, W, H, grid) {
  // Solid, flat, very dark green
  ctx.fillStyle = '#041006';
  ctx.fillRect(0, 0, W, H);
    
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawDecorations(ctx, r, c, grid[r][c]);
    }
  }

  // Draw title at the top
  ctx.fillStyle = 'rgba(51, 255, 136, 0.6)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('- WE DGAF ABOUT YOUR PCB -', W / 2, 20);
}

function drawHollowPaths(ctx, grid) {
  // First pass: Thick outer lines
  ctx.strokeStyle = 'rgba(51, 255, 136, 0.5)'; // Pale green
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const drawPass = () => {
    ctx.beginPath();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 0) continue;
        
        const x = c * CELL + CELL / 2;
        const y = r * CELL + CELL / 2;
        
        // Ensure isolated cells/dead ends get a circular cap drawn
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        
        if (c + 1 < COLS && grid[r][c+1] !== 0) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + CELL, y);
        }
        if (r + 1 < ROWS && grid[r+1][c] !== 0) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + CELL);
        }
      }
    }
    ctx.stroke();
  };

  drawPass(); // Draw outer bounds

  // Second pass: Inner mask to make it hollow
  ctx.strokeStyle = '#041006'; // Same as background
  ctx.lineWidth = 8; // Leave 1px border on each side
  drawPass(); 
}

function drawSignalTrace(ctx, visitedNodes) {
  if (visitedNodes.length < 1) return;
  
  const glowColor = '#00ff00';
  
  // The snake body fills the hollow track perfectly (lineWidth 6 fits inside the 8px hollow gap)
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  const start = visitedNodes[0];
  ctx.moveTo(start.c * CELL + CELL / 2, start.r * CELL + CELL / 2);
  
  for (let i = 1; i < visitedNodes.length; i++) {
    const node = visitedNodes[i];
    ctx.lineTo(node.c * CELL + CELL / 2, node.r * CELL + CELL / 2);
  }
  ctx.stroke();
  
  // Solid neon-green circle at the very head
  const head = visitedNodes[visitedNodes.length - 1];
  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(head.c * CELL + CELL / 2, head.r * CELL + CELL / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawSpecialTiles(ctx, grid, doorStates) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const val = grid[r][c];
      if (val === 0 || val === 1) continue;

      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      const boxSize = 24;
      const boxX = x - boxSize / 2;
      const boxY = y - boxSize / 2;

      if (val === 2 || val === 3) {
        // Metallic grey connector ports
        ctx.fillStyle = '#445544';
        ctx.fillRect(boxX - 4, boxY, boxSize + 8, boxSize);
        ctx.strokeStyle = '#667766';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX - 4, boxY, boxSize + 8, boxSize);
        
        // Dark inner slot
        ctx.fillStyle = '#111';
        ctx.fillRect(boxX + 2, boxY + 6, boxSize - 4, boxSize - 12);
        
        // Indicator dots
        ctx.fillStyle = val === 2 ? '#00ff00' : '#ff0000'; // Green for start, Red for finish
        ctx.beginPath(); ctx.arc(boxX + 4, boxY + 3, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = val === 2 ? '#ff0000' : '#00ff00';
        ctx.beginPath(); ctx.arc(boxX + boxSize - 4, boxY + boxSize - 3, 1.5, 0, Math.PI*2); ctx.fill();
      } 
      else if (val === 4) {
        const key = `${r},${c}`;
        const isOpen = doorStates[key];

        if (isOpen) {
          ctx.strokeStyle = '#00f5ff';
          ctx.lineWidth = 1;
          ctx.shadowColor = '#00f5ff'; ctx.shadowBlur = 8;
          ctx.strokeRect(boxX, boxY, boxSize, boxSize);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(boxX, y);
          ctx.lineTo(boxX + boxSize, y);
          ctx.stroke();
          ctx.fillStyle = '#00f5ff';
          ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = '#ff0033';
          ctx.lineWidth = 1;
          ctx.shadowColor = '#ff0033'; ctx.shadowBlur = 10;
          ctx.strokeRect(boxX, boxY, boxSize, boxSize);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(boxX + 2, y - 5); ctx.lineTo(boxX + boxSize - 2, y - 5);
          ctx.moveTo(boxX + 2, y);     ctx.lineTo(boxX + boxSize - 2, y);
          ctx.moveTo(boxX + 2, y + 5); ctx.lineTo(boxX + boxSize - 2, y + 5);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    }
  }
}

export default function Maze({ levelData, onLevelComplete, onReset }) {
  const canvasRef = useRef(null);
  
  const grid = levelData?.grid || Array(ROWS).fill(Array(COLS).fill(0));
  const doors = levelData?.doors || [];
  const startPos = levelData ? findCell(grid, 2) : { r: 1, c: 1 };

  const [pos,   setPos]   = useState(startPos);
  const [visited, setVisited] = useState(startPos ? [startPos] : []);
  const [direction, setDirection] = useState({ dr: 0, dc: 0 }); // Snake direction
  const [flash, setFlash] = useState(false);
  const [tick,  setTick]  = useState(Date.now());
  const [finished, setFinished] = useState(false);

  const W = COLS*CELL, H = ROWS*CELL;

  // Global time tick for doors and snake movement
  useEffect(() => {
    // 250ms per step feels good for a snake game
    const id = setInterval(() => setTick(Date.now()), 220);
    return () => clearInterval(id);
  }, []);

  const doorStates = {};
  doors.forEach(d => { doorStates[`${d.r},${d.c}`] = isDoorOpen(d, tick); });

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx, W, H, grid);
    drawHollowPaths(ctx, grid);
    drawSpecialTiles(ctx, grid, doorStates);
    drawSignalTrace(ctx, visited); // Draw trace on top of everything
  }, [pos, tick, grid, W, H, visited]);

  // Handle Snake Auto-Movement
  useEffect(() => {
    if (finished || !levelData || (direction.dr === 0 && direction.dc === 0)) return;

    const nr = pos.r + direction.dr;
    const nc = pos.c + direction.dc;
    
    // Bounds check
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
      setPos(startPos);
      setVisited([startPos]);
      setDirection({ dr: 0, dc: 0 });
      return;
    }

    const cell = grid[nr][nc];

    // Wall collision
    if (cell === 0) {
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
      setPos(startPos);
      setVisited([startPos]);
      setDirection({ dr: 0, dc: 0 });
      return;
    }

    // Door collision
    if (cell === 4) {
      const key = `${nr},${nc}`;
      if (!doorStates[key]) {
        setFlash(true);
        setTimeout(() => setFlash(false), 400);
        setPos(startPos);
        setVisited([startPos]);
        setDirection({ dr: 0, dc: 0 });
        return;
      }
    }
    
    const newPos = { r: nr, c: nc };
    setPos(newPos);
    setVisited(prev => {
      // Prevent backtracking visually
      if (prev.length > 1) {
        const last = prev[prev.length - 2];
        if (last.r === newPos.r && last.c === newPos.c) {
          return prev.slice(0, -1);
        }
      }
      return [...prev, newPos];
    });

    if (cell === 3) { 
      setFinished(true); 
      setDirection({ dr: 0, dc: 0 });
      setTimeout(() => onLevelComplete?.(), 300); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]); 

  // Keyboard Steering
  useEffect(() => {
    const h = e => {
      const m = {ArrowUp: {dr:-1,dc:0}, ArrowDown: {dr:1,dc:0}, ArrowLeft: {dr:0,dc:-1}, ArrowRight: {dr:0,dc:1}};
      if (m[e.key]) { 
        e.preventDefault(); 
        setDirection(m[e.key]); 
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Touch Steering
  const ts = useRef(null);
  const onTouchStart = e => { ts.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; };
  const onTouchEnd   = e => {
    if (!ts.current) return;
    const dx=e.changedTouches[0].clientX-ts.current.x;
    const dy=e.changedTouches[0].clientY-ts.current.y;
    if (Math.abs(dx)<20&&Math.abs(dy)<20) return;
    const dir = Math.abs(dx)>Math.abs(dy) ? {dr:0,dc:dx>0?1:-1} : {dr:dy>0?1:-1,dc:0};
    setDirection(dir);
    ts.current=null;
  };

  // Reset on level change
  useEffect(() => { 
    if (levelData) {
      const sp = findCell(levelData.grid, 2);
      setPos(sp);
      setVisited([sp]);
      setDirection({ dr: 0, dc: 0 });
      setFinished(false);
    }
  }, [levelData]);
  
  useEffect(() => { 
    if (onReset && levelData) {
      onReset.current = () => {
        const sp = findCell(levelData.grid, 2);
        setPos(sp);
        setVisited([sp]);
        setDirection({ dr: 0, dc: 0 });
        setFinished(false);
      }
    } 
  }, [onReset, levelData]);

  return (
    <div className={`maze-wrapper ${flash?'flash':''}`}>
      <canvas ref={canvasRef} width={W} height={H} className="maze-canvas"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} />
      <div className="dpad" aria-label="D-Pad Controls">
        <button className="dpad-btn dpad-up"    onClick={()=>setDirection({dr:-1,dc:0})}>▲</button>
        <button className="dpad-btn dpad-left"  onClick={()=>setDirection({dr:0,dc:-1})}>◀</button>
        <button className="dpad-btn dpad-center" aria-hidden="true" />
        <button className="dpad-btn dpad-right" onClick={()=>setDirection({dr:0,dc:1})}>▶</button>
        <button className="dpad-btn dpad-down"  onClick={()=>setDirection({dr:1,dc:0})}>▼</button>
      </div>
    </div>
  );
}
