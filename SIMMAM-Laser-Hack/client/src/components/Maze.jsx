import { useState, useEffect, useRef, useCallback } from 'react';
import './Maze.css';

// 0=wall 1=path 2=start 3=finish 4=door


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

function drawBackground(ctx, W, H) {
  ctx.fillStyle = '#071810';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,255,100,0.06)';
  for (let x = CELL; x < W; x += CELL)
    for (let y = CELL; y < H; y += CELL) {
      ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
    }
}

function drawCell(ctx, r, c, val, grid, doorOpen) {
  const x = c * CELL, y = r * CELL;
  const isDoor = val === 4;
  const open   = isDoor && doorOpen;
  const closed  = isDoor && !doorOpen;

  if (val === 0) {
    ctx.fillStyle = '#061510'; ctx.fillRect(x, y, CELL, CELL);
    if ((r + c * 3) % 7 === 0) {
      ctx.strokeStyle = 'rgba(0,160,70,0.15)'; ctx.lineWidth = 1;
      ctx.strokeRect(x + 8, y + 8, CELL - 16, CELL - 16);
    }
    return;
  }

  // Background for path / door
  ctx.fillStyle = closed ? '#1a0505' : '#0d2a1a';
  ctx.fillRect(x, y, CELL, CELL);

  if (closed) {
    // Closed door — red barrier
    ctx.fillStyle = 'rgba(255,30,30,0.18)';
    ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10;
    ctx.strokeRect(x + 4, y + 4, CELL - 8, CELL - 8);
    // Bar lines
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 10 + i * 10);
      ctx.lineTo(x + CELL - 8, y + 10 + i * 10);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    return;
  }

  // Trace lines to neighbours
  const traceColor = open ? '#00e5ff' : '#00c853';
  ctx.strokeStyle = traceColor;
  ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.shadowColor = open ? '#00f5ff' : '#00ff6a'; ctx.shadowBlur = 6;
  [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc]) => {
    const nr = r+dr, nc = c+dc;
    if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&grid[nr][nc]!==0) {
      ctx.beginPath();
      ctx.moveTo(x+CELL/2, y+CELL/2);
      ctx.lineTo(x+CELL/2+dc*CELL/2, y+CELL/2+dr*CELL/2);
      ctx.stroke();
    }
  });
  ctx.shadowBlur = 0;

  // Junction dot
  ctx.fillStyle = open ? '#00e5ff' : '#00e676';
  ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(x+CELL/2, y+CELL/2, open ? 5 : 3.5, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  // Open door indicator
  if (open) {
    ctx.strokeStyle = 'rgba(0,230,255,0.4)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x+6, y+6, CELL-12, CELL-12);
  }

  if (val === 2) {
    ctx.fillStyle = 'rgba(0,255,100,0.15)'; ctx.fillRect(x+4,y+4,CELL-8,CELL-8);
    ctx.strokeStyle='#00ff6a'; ctx.lineWidth=1.5; ctx.strokeRect(x+6,y+6,CELL-12,CELL-12);
    ctx.fillStyle='#00ff6a'; ctx.font=`bold ${CELL*.3}px Orbitron,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='#00ff6a'; ctx.shadowBlur=8;
    ctx.fillText('S', x+CELL/2, y+CELL/2); ctx.shadowBlur=0;
  }
  if (val === 3) {
    ctx.fillStyle='rgba(0,200,255,0.15)'; ctx.fillRect(x+4,y+4,CELL-8,CELL-8);
    ctx.strokeStyle='#00f5ff'; ctx.lineWidth=1.5; ctx.strokeRect(x+6,y+6,CELL-12,CELL-12);
    ctx.fillStyle='#00f5ff'; ctx.font=`bold ${CELL*.3}px Orbitron,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='#00f5ff'; ctx.shadowBlur=10;
    ctx.fillText('F', x+CELL/2, y+CELL/2); ctx.shadowBlur=0;
  }
}

function drawPlayer(ctx, r, c) {
  const x = c*CELL+CELL/2, y = r*CELL+CELL/2;
  const g = ctx.createRadialGradient(x,y,2,x,y,18);
  g.addColorStop(0,'rgba(0,245,255,0.6)'); g.addColorStop(1,'rgba(0,245,255,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.shadowColor='#00f5ff'; ctx.shadowBlur=16;
  ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(0,245,255,0.5)'; ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(x-14,y); ctx.lineTo(x-8,y);
  ctx.moveTo(x+8,y);  ctx.lineTo(x+14,y);
  ctx.moveTo(x,y-14); ctx.lineTo(x,y-8);
  ctx.moveTo(x,y+8);  ctx.lineTo(x,y+14);
  ctx.stroke();
}

function Maze({ levelData, onLevelComplete, onReset }) {
  const canvasRef = useRef(null);
  
  // Guard against null/undefined levelData during mounting
  const grid = levelData?.grid || Array(ROWS).fill(Array(COLS).fill(0));
  const doors = levelData?.doors || [];
  const startPos = levelData ? findCell(grid, 2) : { r: 1, c: 1 };

  const [pos,   setPos]   = useState(startPos);
  const [flash, setFlash] = useState(false);
  const [tick,  setTick]  = useState(Date.now());
  const [finished, setFinished] = useState(false); // Lock movement

  const W = COLS*CELL, H = ROWS*CELL;

  // Animate doors
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 150);
    return () => clearInterval(id);
  }, []);

  // Get open/closed state for each door position
  const doorStates = {};
  doors.forEach(d => { doorStates[`${d.r},${d.c}`] = isDoorOpen(d, tick); });

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, W, H);
    for (let r=0; r<ROWS; r++)
      for (let c=0; c<COLS; c++) {
        const key = `${r},${c}`;
        drawCell(ctx, r, c, grid[r][c], grid, doorStates[key] ?? false);
      }
    drawPlayer(ctx, pos.r, pos.c);
  }, [pos, tick, grid, W, H]);

  // Move — wall hit resets to start
  const move = useCallback((dr, dc) => {
    if (finished || !levelData) return;
    
    setPos(prev => {
      const nr = prev.r+dr, nc = prev.c+dc;
      if (nr<0||nr>=ROWS||nc<0||nc>=COLS) return prev;
      const cell = grid[nr][nc];

      if (cell === 0) {
        // Hit wall → reset to start
        setFlash(true);
        setTimeout(() => setFlash(false), 400);
        return startPos;
      }
      if (cell === 4) {
        const key = `${nr},${nc}`;
        if (!doorStates[key]) {
          // Closed door → reset to start
          setFlash(true);
          setTimeout(() => setFlash(false), 400);
          return startPos;
        }
      }
      if (cell === 3) { 
        setFinished(true); // Lock further movement
        setTimeout(() => onLevelComplete?.(), 300); 
      }
      return { r: nr, c: nc };
    });
  }, [grid, startPos, doorStates, onLevelComplete, finished, levelData]);

  // Keyboard
  useEffect(() => {
    const h = e => {
      const m = {ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
      if (m[e.key]) { e.preventDefault(); move(...m[e.key]); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [move]);

  // Touch swipe
  const ts = useRef(null);
  const onTouchStart = e => { ts.current={x:e.touches[0].clientX,y:e.touches[0].clientY}; };
  const onTouchEnd   = e => {
    if (!ts.current) return;
    const dx=e.changedTouches[0].clientX-ts.current.x;
    const dy=e.changedTouches[0].clientY-ts.current.y;
    if (Math.abs(dx)<20&&Math.abs(dy)<20) return;
    Math.abs(dx)>Math.abs(dy) ? move(0,dx>0?1:-1) : move(dy>0?1:-1,0);
    ts.current=null;
  };

  // Reset on level change
  useEffect(() => { 
    if (levelData) {
      setPos(findCell(levelData.grid, 2));
      setFinished(false);
    }
  }, [levelData]);
  
  useEffect(() => { 
    if (onReset && levelData) {
      onReset.current = () => {
        setPos(findCell(levelData.grid, 2));
        setFinished(false);
      }
    } 
  }, [onReset, levelData]);

  return (
    <div className={`maze-wrapper ${flash?'flash':''}`}>
      <canvas ref={canvasRef} width={W} height={H} className="maze-canvas"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} />
      <div className="dpad" aria-label="D-Pad Controls">
        <button className="dpad-btn dpad-up"    onClick={()=>move(-1,0)}>▲</button>
        <button className="dpad-btn dpad-left"  onClick={()=>move(0,-1)}>◀</button>
        <button className="dpad-btn dpad-center" aria-hidden="true" />
        <button className="dpad-btn dpad-right" onClick={()=>move(0,1)}>▶</button>
        <button className="dpad-btn dpad-down"  onClick={()=>move(1,0)}>▼</button>
      </div>
    </div>
  );
}

export default Maze;
