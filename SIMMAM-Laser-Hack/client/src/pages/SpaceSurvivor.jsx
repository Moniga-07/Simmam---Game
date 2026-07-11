import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameSession } from '../hooks/useGameSession';
import './SpaceSurvivor.css';

// ─── Math Utils ───────────────────────────────────────────────────────────────
const V = {
  add:       (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub:       (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  scale:     (v, s) => ({ x: v.x * s, y: v.y * s }),
  len:       (v)    => Math.hypot(v.x, v.y),
  norm:      (v)    => { const l = Math.hypot(v.x, v.y) || 1; return { x: v.x / l, y: v.y / l }; },
  dist:      (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  fromAngle: (a)    => ({ x: Math.cos(a), y: Math.sin(a) }),
  angle:     (v)    => Math.atan2(v.y, v.x),
  dot:       (a, b) => a.x * b.x + a.y * b.y,
  clamp:     (v, mn, mx) => Math.min(Math.max(v, mn), mx),
  rand:      (mn, mx) => mn + Math.random() * (mx - mn),
  randInt:   (mn, mx) => Math.floor(mn + Math.random() * (mx - mn + 1)),
  lerp:      (a, b, t) => a + (b - a) * t,
};

// ─── Constants ────────────────────────────────────────────────────────────────
const PLAYER = { radius: 15, speed: 230, maxHP: 3, invincibleTime: 1.5, fireRate: 0.15 };
const BULLET  = { radius: 4, speed: 540, lifetime: 1.7 };
const ENEMY_BULLET = { radius: 3.5, speed: 240, lifetime: 2.2 };

const ASTEROID_TYPES = {
  large:  { radius: 42, speed: 62,  hp: 3, points: 30, children: ['small','small'],  color: '#c0784a' },
  medium: { radius: 26, speed: 90,  hp: 2, points: 15, children: ['small'],          color: '#d08858' },
  small:  { radius: 14, speed: 145, hp: 1, points: 10, children: [],                 color: '#e0a060' },
};

const DRONE = { radius: 13, speed: 85, hp: 2, points: 50, color: '#a040ff', fireRate: 2.8 };

const CRYSTALS = {
  energy: { radius: 9,  points: 20,  color: '#00ff88', glowColor: 'rgba(0,255,136,0.4)', lifetime: 9 },
  golden: { radius: 11, points: 100, color: '#ffd700', glowColor: 'rgba(255,215,0,0.5)',  lifetime: 7 },
};

const SCORE_BONUS_INTERVAL = 10;
const SCORE_BONUS           = 25;

// ─── ID generator ────────────────────────────────────────────────────────────
let _id = 0;
const uid = () => ++_id;

// ─── Entity factories ─────────────────────────────────────────────────────────
function makePlayer(cx, cy) {
  return { id: uid(), x: cx, y: cy, vx: 0, vy: 0, angle: -Math.PI / 2,
           hp: PLAYER.maxHP, maxHp: PLAYER.maxHP, invTimer: 0, fireCooldown: 0 };
}

function spawnAsteroid(W, H, type = null) {
  if (!type) {
    const r = Math.random();
    type = r < 0.45 ? 'large' : r < 0.75 ? 'medium' : 'small';
  }
  const data = ASTEROID_TYPES[type];
  const edge = V.randInt(0, 3);
  let x, y;
  if      (edge === 0) { x = V.rand(0, W); y = -data.radius - 5; }
  else if (edge === 1) { x = W + data.radius + 5; y = V.rand(0, H); }
  else if (edge === 2) { x = V.rand(0, W); y = H + data.radius + 5; }
  else                 { x = -data.radius - 5; y = V.rand(0, H); }

  const angleToCenter = Math.atan2(H / 2 - y, W / 2 - x) + V.rand(-0.6, 0.6);
  const spd = data.speed + V.rand(-20, 20);
  const rotSpeed = V.rand(0.3, 1.8) * (Math.random() < 0.5 ? 1 : -1);

  return { id: uid(), type, x, y, vx: Math.cos(angleToCenter) * spd,
           vy: Math.sin(angleToCenter) * spd, angle: 0, rotSpeed,
           hp: data.hp, maxHp: data.hp, radius: data.radius, points: data.points,
           color: data.color, flashTimer: 0,
           // Polygon shape for rendering
           vertices: Array.from({ length: V.randInt(6, 9) }, (_, i) => {
             const a = (i / 9) * Math.PI * 2;
             const r2 = data.radius * V.rand(0.72, 1.0);
             return { x: Math.cos(a) * r2, y: Math.sin(a) * r2 };
           }) };
}

function spawnCrystal(W, H, forceType) {
  const type = forceType || (Math.random() < 0.12 ? 'golden' : 'energy');
  const d = CRYSTALS[type];
  return { id: uid(), type, x: V.rand(60, W - 60), y: V.rand(60, H - 60),
           radius: d.radius, points: d.points, color: d.color, glowColor: d.glowColor,
           lifetime: d.lifetime, age: 0, pulse: 0 };
}

function spawnDrone(W, H, px, py) {
  const edge = V.randInt(0, 3);
  let x, y;
  if      (edge === 0) { x = V.rand(0, W); y = -DRONE.radius - 5; }
  else if (edge === 1) { x = W + DRONE.radius + 5; y = V.rand(0, H); }
  else if (edge === 2) { x = V.rand(0, W); y = H + DRONE.radius + 5; }
  else                 { x = -DRONE.radius - 5; y = V.rand(0, H); }
  return { id: uid(), x, y, vx: 0, vy: 0, angle: 0, hp: DRONE.hp, maxHp: DRONE.hp,
           radius: DRONE.radius, points: DRONE.points, color: DRONE.color,
           fireCooldown: 1 + Math.random(), flashTimer: 0 };
}

function makeParticle(x, y, color, count = 12) {
  return Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2;
    const spd = V.rand(60, 280);
    return { x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
             life: V.rand(0.3, 0.9), maxLife: V.rand(0.3, 0.9), size: V.rand(2, 6), color };
  });
}

function makeScoreFloatie(x, y, text, color = '#ffffff') {
  return { id: uid(), x, y: y - 10, text, color, life: 1.2, maxLife: 1.2, vy: -55 };
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function makeStars(W, H) {
  return [
    Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: V.rand(0.4, 0.9), speed: 10, alpha: V.rand(0.3, 0.7) })),
    Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: V.rand(0.9, 1.6), speed: 25, alpha: V.rand(0.5, 0.9) })),
    Array.from({ length: 25 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: V.rand(1.5, 2.4), speed: 45, alpha: 1 })),
  ];
}

// ─── Render helpers ───────────────────────────────────────────────────────────
function drawGlow(ctx, x, y, radius, color, alpha = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
  g.addColorStop(0, color.replace(')', `,${alpha})`).replace('rgb', 'rgba'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawShip(ctx, p, shake) {
  ctx.save();
  ctx.translate(p.x + shake.x, p.y + shake.y);
  ctx.rotate(p.angle + Math.PI / 2);

  const R = PLAYER.radius;
  const inv = p.invTimer > 0;

  if (inv && Math.floor(p.invTimer * 10) % 2 === 0) { ctx.restore(); return; }

  // Engine glow
  const eg = ctx.createRadialGradient(0, R, 0, 0, R, R * 2);
  eg.addColorStop(0, 'rgba(0,200,255,0.9)');
  eg.addColorStop(1, 'rgba(0,80,255,0)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(0, R, R * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Ship body
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(0, 30, 60, 0.9)';
  ctx.beginPath();
  ctx.moveTo(0, -R);
  ctx.lineTo(-R * 0.7, R * 0.8);
  ctx.lineTo(-R * 0.3, R * 0.4);
  ctx.lineTo(0, R * 0.6);
  ctx.lineTo(R * 0.3, R * 0.4);
  ctx.lineTo(R * 0.7, R * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cockpit glow
  ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(0, 245, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.3, R * 0.25, R * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawAsteroid(ctx, a, shake) {
  ctx.save();
  ctx.translate(a.x + shake.x, a.y + shake.y);
  ctx.rotate(a.angle);

  ctx.shadowColor = a.flashTimer > 0 ? '#ffffff' : a.color;
  ctx.shadowBlur = a.flashTimer > 0 ? 20 : 8;
  ctx.strokeStyle = a.flashTimer > 0 ? '#ffffff' : a.color;
  ctx.lineWidth = 2;
  ctx.fillStyle = a.flashTimer > 0
    ? 'rgba(255,200,150,0.6)'
    : `rgba(${parseInt(a.color.slice(1, 3), 16)},${parseInt(a.color.slice(3, 5), 16)},${parseInt(a.color.slice(5, 7), 16)},0.35)`;

  ctx.beginPath();
  const verts = a.vertices;
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // HP pip display (small dots)
  if (a.hp > 1) {
    ctx.shadowBlur = 0;
    for (let i = 0; i < a.hp; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-4 + i * 5, -a.radius + 6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawDrone(ctx, d, shake) {
  ctx.save();
  ctx.translate(d.x + shake.x, d.y + shake.y);
  ctx.rotate(d.angle);

  ctx.shadowColor = d.flashTimer > 0 ? '#ffffff' : '#a040ff';
  ctx.shadowBlur = 16;

  // Hexagonal body
  ctx.strokeStyle = d.flashTimer > 0 ? '#ffffff' : '#c060ff';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(80,0,160,0.7)';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const r = DRONE.radius;
    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center core
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
  cg.addColorStop(0, '#ff40ff');
  cg.addColorStop(1, 'rgba(160,0,255,0)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawCrystal(ctx, c, shake) {
  ctx.save();
  ctx.translate(c.x + shake.x, c.y + shake.y);
  const scale = 1 + 0.15 * Math.sin(c.pulse);
  ctx.scale(scale, scale);

  // Glow
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c.radius * 3);
  g.addColorStop(0, c.glowColor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, c.radius * 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = c.color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = c.color;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = `${c.color}55`;

  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(0, -c.radius * 1.3);
  ctx.lineTo(c.radius * 0.8, -c.radius * 0.3);
  ctx.lineTo(c.radius * 0.6, c.radius * 1.0);
  ctx.lineTo(0, c.radius * 0.4);
  ctx.lineTo(-c.radius * 0.6, c.radius * 1.0);
  ctx.lineTo(-c.radius * 0.8, -c.radius * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner shine
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.moveTo(0, -c.radius * 0.9);
  ctx.lineTo(c.radius * 0.3, -c.radius * 0.1);
  ctx.lineTo(0, 0);
  ctx.lineTo(-c.radius * 0.3, -c.radius * 0.1);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBullet(ctx, b, shake, isEnemy) {
  ctx.save();
  ctx.translate(b.x + shake.x, b.y + shake.y);
  const color = isEnemy ? '#ff4060' : '#00f5ff';
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
  ctx.fill();

  // Trail
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(-b.vx * 0.04, -b.vy * 0.04, b.radius * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawParticles(ctx, particles, shake) {
  for (const p of particles) {
    const t = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x + shake.x, p.y + shake.y, p.size * t, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFloaties(ctx, floaties, shake) {
  for (const f of floaties) {
    const t = f.life / f.maxLife;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.font = `bold ${14 + (1 - t) * 4}px 'Orbitron', monospace`;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x + shake.x, f.y + shake.y);
    ctx.restore();
  }
}

function drawStars(ctx, stars, W, H) {
  for (const layer of stars) {
    for (const s of layer) {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawHUDCanvas(ctx, W, H, score, hp, maxHp, survivalTime, shake) {
  // Top bar background
  ctx.save();
  ctx.fillStyle = 'rgba(0,10,30,0.7)';
  ctx.fillRect(0, 0, W, 56);

  // Score
  ctx.font = "bold 14px 'Orbitron', monospace";
  ctx.fillStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 8;
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 16, 20);
  ctx.font = "bold 22px 'Orbitron', monospace";
  ctx.fillText(score.toLocaleString(), 16, 44);

  // Timer
  ctx.textAlign = 'center';
  ctx.font = "bold 12px 'Orbitron', monospace";
  ctx.fillStyle = '#7ab8d4';
  ctx.shadowBlur = 0;
  ctx.fillText('SURVIVAL', W / 2, 20);
  ctx.font = "bold 20px 'Orbitron', monospace";
  ctx.fillStyle = '#ffffff';
  ctx.fillText(formatTime(survivalTime), W / 2, 43);

  // HP bar
  ctx.textAlign = 'right';
  ctx.font = "bold 12px 'Orbitron', monospace";
  ctx.fillStyle = '#7ab8d4';
  ctx.shadowBlur = 0;
  ctx.fillText('HULL', W - 16, 20);
  const barW = 100, barH = 10, barX = W - 16 - barW, barY = 30;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(barX, barY, barW, barH);
  const hpRatio = hp / maxHp;
  const hpColor = hpRatio > 0.6 ? '#00ff88' : hpRatio > 0.3 ? '#ffcc00' : '#ff003c';
  ctx.shadowColor = hpColor;
  ctx.shadowBlur = 8;
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpRatio, barH);
  // HP pips
  for (let i = 0; i < maxHp; i++) {
    ctx.fillStyle = i < hp ? hpColor : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(barX + (i + 0.5) * (barW / maxHp), barY + barH + 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SpaceSurvivor() {
  const navigate = useNavigate();
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);  // mutable game state
  const animRef    = useRef(null);
  const lastTimeRef = useRef(null);

  const { startSession, endSession, error: sessionError, starting } = useGameSession();

  // React state for overlay UI only
  const [phase, setPhase]         = useState('menu'); // menu | playing | dead | paused
  const [uiScore, setUiScore]     = useState(0);
  const [uiHp, setUiHp]           = useState(PLAYER.maxHP);
  const [uiTime, setUiTime]       = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('ss_hs') || '0'));
  const [isMobile, setIsMobile]   = useState(false);

  // Mobile joystick refs
  const leftJoyRef  = useRef({ active: false, id: null, sx: 0, sy: 0, dx: 0, dy: 0 });
  const rightJoyRef = useRef({ active: false, id: null, sx: 0, sy: 0, dx: 0, dy: 0 });

  // ─── Init / reset game state ───────────────────────────────────────────────
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;

    stateRef.current = {
      W, H,
      player: makePlayer(W / 2, H / 2),
      asteroids: [],
      bullets: [],
      enemyBullets: [],
      crystals: [],
      drones: [],
      particles: [],
      floaties: [],
      stars: makeStars(W, H),
      score: 0,
      survivalTime: 0,
      bonusTimer: 0,
      asteroidTimer: 0,
      asteroidInterval: 1.2,
      crystalTimer: 0,
      crystalInterval: 5.5,
      droneTimer: 0,
      droneInterval: 35,
      droneSpawned: false,
      wave: 1,
      shake: { x: 0, y: 0, intensity: 0, duration: 0 },
      keys: {},
      mouseX: W / 2,
      mouseY: H / 2,
      mouseDown: false,
      alive: true,
    };

    // Spawn initial asteroids
    for (let i = 0; i < 8; i++) {
      stateRef.current.asteroids.push(spawnAsteroid(W, H, i < 3 ? 'large' : 'medium'));
    }
  }, []);

  // ─── Resize canvas ────────────────────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    setIsMobile('ontouchstart' in window || window.innerWidth < 768);
  }, []);

  // ─── Update ───────────────────────────────────────────────────────────────
  const update = useCallback((dt) => {
    const gs = stateRef.current;
    if (!gs || !gs.alive) return;

    const { W, H, player, keys } = gs;

    // ── Survival time & bonus ──────────────────────────────────────────────
    gs.survivalTime += dt;
    gs.bonusTimer   += dt;
    if (gs.bonusTimer >= SCORE_BONUS_INTERVAL) {
      gs.bonusTimer -= SCORE_BONUS_INTERVAL;
      gs.score += SCORE_BONUS;
      gs.floaties.push(makeScoreFloatie(player.x, player.y - 30, `+${SCORE_BONUS} SURVIVAL`, '#ffd700'));
    }

    // ── Wave escalation ────────────────────────────────────────────────────
    gs.wave = 1 + Math.floor(gs.survivalTime / 40);
    gs.asteroidInterval = Math.max(0.4, 1.2 - gs.wave * 0.15);

    // ── Player input (keyboard) ────────────────────────────────────────────
    let mvx = 0, mvy = 0;

    if (keys['ArrowUp']    || keys['KeyW']) mvy -= 1;
    if (keys['ArrowDown']  || keys['KeyS']) mvy += 1;
    if (keys['ArrowLeft']  || keys['KeyA']) mvx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) mvx += 1;

    // Mobile left joystick override
    const lj = leftJoyRef.current;
    if (lj.active && V.len({ x: lj.dx, y: lj.dy }) > 8) {
      const d = V.norm({ x: lj.dx, y: lj.dy });
      mvx = d.x;
      mvy = d.y;
    }

    const moveLen = Math.hypot(mvx, mvy) || 1;
    player.vx = (mvx / moveLen) * PLAYER.speed * (Math.hypot(mvx, mvy) > 0 ? 1 : 0);
    player.vy = (mvy / moveLen) * PLAYER.speed * (Math.hypot(mvx, mvy) > 0 ? 1 : 0);

    player.x = V.clamp(player.x + player.vx * dt, PLAYER.radius, W - PLAYER.radius);
    player.y = V.clamp(player.y + player.vy * dt, 60 + PLAYER.radius, H - PLAYER.radius);

    // ── Aim ───────────────────────────────────────────────────────────────
    const rj = rightJoyRef.current;
    if (rj.active && V.len({ x: rj.dx, y: rj.dy }) > 12) {
      player.angle = V.angle({ x: rj.dx, y: rj.dy }) - Math.PI / 2;
    } else {
      player.angle = Math.atan2(gs.mouseY - player.y, gs.mouseX - player.x) - Math.PI / 2;
    }

    // ── Shoot ─────────────────────────────────────────────────────────────
    player.fireCooldown -= dt;
    const shootKeyDown = keys['Space'] || keys['Enter'];
    const rightJoyFiring = rj.active && V.len({ x: rj.dx, y: rj.dy }) > 20;

    if ((gs.mouseDown || shootKeyDown || rightJoyFiring) && player.fireCooldown <= 0) {
      player.fireCooldown = PLAYER.fireRate;
      const dir = V.fromAngle(player.angle + Math.PI / 2);
      const spawnX = player.x + dir.x * PLAYER.radius;
      const spawnY = player.y + dir.y * PLAYER.radius;
      gs.bullets.push({ id: uid(), x: spawnX, y: spawnY,
        vx: dir.x * BULLET.speed, vy: dir.y * BULLET.speed,
        radius: BULLET.radius, life: BULLET.lifetime });
    }

    // ── Invincibility ─────────────────────────────────────────────────────
    if (player.invTimer > 0) player.invTimer -= dt;

    // ── Bullets update ────────────────────────────────────────────────────
    gs.bullets = gs.bullets.filter(b => {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      return b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20;
    });

    gs.enemyBullets = gs.enemyBullets.filter(b => {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      return b.life > 0 && b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20;
    });

    // ── Asteroids update ──────────────────────────────────────────────────
    gs.asteroidTimer += dt;
    if (gs.asteroidTimer >= gs.asteroidInterval) {
      gs.asteroidTimer = 0;
      const count = 1 + Math.min(Math.floor(gs.wave / 2), 3);
      for (let i = 0; i < count; i++) gs.asteroids.push(spawnAsteroid(W, H));
    }

    for (const a of gs.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.angle += a.rotSpeed * dt;
      if (a.flashTimer > 0) a.flashTimer -= dt;

      // Wrap around screen edges
      if (a.x < -a.radius * 3) a.x = W + a.radius;
      if (a.x > W + a.radius * 3) a.x = -a.radius;
      if (a.y < -a.radius * 3) a.y = H + a.radius;
      if (a.y > H + a.radius * 3) a.y = -a.radius;
    }

    // ── Drones update ─────────────────────────────────────────────────────
    gs.droneTimer += dt;
    if (gs.droneTimer >= gs.droneInterval) {
      gs.droneTimer = 0;
      gs.droneInterval = Math.max(12, 35 - gs.wave * 2);
      const count = Math.min(Math.floor(gs.wave / 2) + 1, 4);
      for (let i = 0; i < count; i++) {
        gs.drones.push(spawnDrone(W, H, player.x, player.y));
      }
    }

    for (const d of gs.drones) {
      const dir = V.norm({ x: player.x - d.x, y: player.y - d.y });
      const spd = DRONE.speed + gs.wave * 4;
      d.vx = V.lerp(d.vx, dir.x * spd, 2 * dt);
      d.vy = V.lerp(d.vy, dir.y * spd, 2 * dt);
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.angle += 2 * dt;
      if (d.flashTimer > 0) d.flashTimer -= dt;

      // Drone shoots
      d.fireCooldown -= dt;
      if (d.fireCooldown <= 0) {
        d.fireCooldown = DRONE.fireRate;
        const bd = V.norm({ x: player.x - d.x, y: player.y - d.y });
        gs.enemyBullets.push({ id: uid(), x: d.x, y: d.y,
          vx: bd.x * ENEMY_BULLET.speed, vy: bd.y * ENEMY_BULLET.speed,
          radius: ENEMY_BULLET.radius, life: ENEMY_BULLET.lifetime });
      }
    }

    // ── Crystals update ───────────────────────────────────────────────────
    gs.crystalTimer += dt;
    if (gs.crystalTimer >= gs.crystalInterval) {
      gs.crystalTimer = 0;
      gs.crystals.push(spawnCrystal(W, H));
    }

    gs.crystals = gs.crystals.filter(c => {
      c.age += dt;
      c.pulse += dt * 3;
      return c.age < c.lifetime;
    });

    // ── Particles update ──────────────────────────────────────────────────
    gs.particles = gs.particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
      p.life -= dt;
      return p.life > 0;
    });

    gs.floaties = gs.floaties.filter(f => {
      f.y += f.vy * dt;
      f.life -= dt;
      return f.life > 0;
    });

    // ── Screen shake ──────────────────────────────────────────────────────
    if (gs.shake.duration > 0) {
      gs.shake.duration -= dt;
      const i = gs.shake.intensity * (gs.shake.duration / gs.shake.maxDuration || 1);
      gs.shake.x = (Math.random() - 0.5) * i;
      gs.shake.y = (Math.random() - 0.5) * i;
    } else {
      gs.shake.x = 0; gs.shake.y = 0;
    }

    // ── Collisions ────────────────────────────────────────────────────────
    const deadAsteroidIds = new Set();
    const deadDroneIds    = new Set();
    const deadBulletIds   = new Set();
    const deadCrystalIds  = new Set();
    const deadEBulletIds  = new Set();

    // Bullets vs Asteroids
    for (const b of gs.bullets) {
      for (const a of gs.asteroids) {
        if (deadAsteroidIds.has(a.id) || deadBulletIds.has(b.id)) continue;
        if (V.dist(b, a) < b.radius + a.radius) {
          deadBulletIds.add(b.id);
          a.hp--;
          a.flashTimer = 0.08;
          if (a.hp <= 0) {
            deadAsteroidIds.add(a.id);
            gs.score += a.points;
            gs.floaties.push(makeScoreFloatie(a.x, a.y, `+${a.points}`, '#ffaa00'));
            gs.particles.push(...makeParticle(a.x, a.y, a.color, 16));
            // Spawn children
            const childTypes = ASTEROID_TYPES[a.type].children;
            for (const ct of childTypes) {
              const cd = ASTEROID_TYPES[ct];
              const ang = Math.random() * Math.PI * 2;
              const childAst = spawnAsteroid(W, H, ct);
              childAst.x = a.x + Math.cos(ang) * a.radius;
              childAst.y = a.y + Math.sin(ang) * a.radius;
              gs.asteroids.push(childAst);
            }
          }
        }
      }
    }

    // Bullets vs Drones
    for (const b of gs.bullets) {
      for (const d of gs.drones) {
        if (deadDroneIds.has(d.id) || deadBulletIds.has(b.id)) continue;
        if (V.dist(b, d) < b.radius + d.radius) {
          deadBulletIds.add(b.id);
          d.hp--;
          d.flashTimer = 0.1;
          if (d.hp <= 0) {
            deadDroneIds.add(d.id);
            gs.score += d.points;
            gs.floaties.push(makeScoreFloatie(d.x, d.y, `+${d.points}`, '#c060ff'));
            gs.particles.push(...makeParticle(d.x, d.y, '#a040ff', 20));
            // Bonus crystal drop
            if (Math.random() < 0.5) {
              gs.crystals.push(spawnCrystal(W, H, Math.random() < 0.15 ? 'golden' : 'energy'));
              gs.crystals[gs.crystals.length - 1].x = d.x;
              gs.crystals[gs.crystals.length - 1].y = d.y;
            }
          }
        }
      }
    }

    // Player vs Asteroids
    if (player.invTimer <= 0) {
      for (const a of gs.asteroids) {
        if (deadAsteroidIds.has(a.id)) continue;
        if (V.dist(player, a) < PLAYER.radius + a.radius * 0.8) {
          damagePlayer(gs, 1);
          deadAsteroidIds.add(a.id);
          gs.particles.push(...makeParticle(a.x, a.y, a.color, 10));
        }
      }
    }

    // Player vs Enemy bullets
    if (player.invTimer <= 0) {
      for (const b of gs.enemyBullets) {
        if (deadEBulletIds.has(b.id)) continue;
        if (V.dist(player, b) < PLAYER.radius + b.radius) {
          deadEBulletIds.add(b.id);
          damagePlayer(gs, 1);
        }
      }
    }

    // Player vs Crystals
    for (const c of gs.crystals) {
      if (deadCrystalIds.has(c.id)) continue;
      if (V.dist(player, c) < PLAYER.radius + c.radius * 1.5) {
        deadCrystalIds.add(c.id);
        gs.score += c.points;
        const isGolden = c.type === 'golden';
        gs.floaties.push(makeScoreFloatie(c.x, c.y,
          `+${c.points}${isGolden ? ' ✦' : ''}`, c.color));
        gs.particles.push(...makeParticle(c.x, c.y, c.color, 12));
      }
    }

    // Remove dead entities
    gs.bullets       = gs.bullets.filter(b => !deadBulletIds.has(b.id));
    gs.asteroids     = gs.asteroids.filter(a => !deadAsteroidIds.has(a.id));
    gs.drones        = gs.drones.filter(d => !deadDroneIds.has(d.id));
    gs.crystals      = gs.crystals.filter(c => !deadCrystalIds.has(c.id));
    gs.enemyBullets  = gs.enemyBullets.filter(b => !deadEBulletIds.has(b.id));

  }, []);

  function V_lerp(a, b, t) { return a + (b - a) * t; }

  function damagePlayer(gs, amount) {
    gs.player.hp -= amount;
    gs.player.invTimer = PLAYER.invincibleTime;
    gs.shake.intensity = 22;
    gs.shake.duration  = 0.35;
    gs.shake.maxDuration = 0.35;
    gs.particles.push(...makeParticle(gs.player.x, gs.player.y, '#ff4444', 14));
    if (gs.player.hp <= 0) {
      gs.player.hp = 0;
      gs.alive = false;
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const gs = stateRef.current;
    if (!canvas || !gs) return;

    const ctx = canvas.getContext('2d');
    const { W, H, shake } = gs;

    // Background
    ctx.fillStyle = '#020510';
    ctx.fillRect(0, 0, W, H);

    // Stars
    drawStars(ctx, gs.stars, W, H);

    // Entities
    for (const c of gs.crystals) drawCrystal(ctx, c, shake);
    for (const a of gs.asteroids) drawAsteroid(ctx, a, shake);
    for (const d of gs.drones) drawDrone(ctx, d, shake);
    for (const b of gs.bullets) drawBullet(ctx, b, shake, false);
    for (const b of gs.enemyBullets) drawBullet(ctx, b, shake, true);
    drawParticles(ctx, gs.particles, shake);
    if (gs.alive) drawShip(ctx, gs.player, shake);
    drawFloaties(ctx, gs.floaties, shake);

    // HUD
    drawHUDCanvas(ctx, W, H, gs.score, gs.player.hp, gs.player.maxHp, gs.survivalTime, shake);
  }, []);

  // ─── Game loop ────────────────────────────────────────────────────────────
  const loop = useCallback((timestamp) => {
    const gs = stateRef.current;
    if (!gs) return;

    if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    if (gs.alive) {
      update(dt);
      render();

      // Sync React UI every frame
      setUiScore(gs.score);
      setUiHp(gs.player.hp);
      setUiTime(gs.survivalTime);

      animRef.current = requestAnimationFrame(loop);
    } else {
      render();
      // Trigger game-over UI
      const finalScore = gs.score;
      if (finalScore > parseInt(localStorage.getItem('ss_hs') || '0')) {
        localStorage.setItem('ss_hs', String(finalScore));
        setHighScore(finalScore);
      }
      setUiScore(finalScore);
      setUiTime(gs.survivalTime);
      setPhase('dead');

      // Save to backend
      endSession(true, finalScore);
    }
  }, [update, render, endSession]);

  // ─── Start game ───────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    const rawData = sessionStorage.getItem('playerData');
    if (!rawData) {
      alert('Missing player data. Please register first.');
      navigate('/');
      return;
    }
    const playerData = JSON.parse(rawData);

    const res = await startSession(playerData);
    if (!res) return; // Error handled by sessionError

    lastTimeRef.current = null;
    initGame();
    setPhase('playing');
    setUiScore(0);
    setUiHp(PLAYER.maxHP);
    setUiTime(0);
    animRef.current = requestAnimationFrame(loop);
  }, [initGame, loop, navigate, startSession]);

  const stopGame = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
  }, []);

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    return () => stopGame();
  }, [stopGame]);

  // ─── Input handlers ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (stateRef.current) stateRef.current.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => {
      if (stateRef.current) stateRef.current.keys[e.code] = false;
    };
    const onMouseMove = (e) => {
      if (stateRef.current) {
        stateRef.current.mouseX = e.clientX;
        stateRef.current.mouseY = e.clientY;
      }
    };
    const onMouseDown = (e) => {
      if (stateRef.current && e.button === 0) stateRef.current.mouseDown = true;
    };
    const onMouseUp = (e) => {
      if (stateRef.current && e.button === 0) stateRef.current.mouseDown = false;
    };
    const onContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // ─── Touch / Joystick handlers ────────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;

    for (const t of e.changedTouches) {
      const isLeft = t.clientX < W / 2;
      const joy = isLeft ? leftJoyRef.current : rightJoyRef.current;
      if (!joy.active) {
        joy.active = true;
        joy.id = t.identifier;
        joy.sx = t.clientX;
        joy.sy = t.clientY;
        joy.dx = 0;
        joy.dy = 0;
      }
    }
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback((e) => {
    for (const t of e.changedTouches) {
      const joy = leftJoyRef.current.id === t.identifier ? leftJoyRef.current
        : rightJoyRef.current.id === t.identifier ? rightJoyRef.current : null;
      if (joy) {
        joy.dx = t.clientX - joy.sx;
        joy.dy = t.clientY - joy.sy;
        // Cap joystick at 50px radius
        const d = Math.hypot(joy.dx, joy.dy);
        if (d > 50) {
          joy.dx = (joy.dx / d) * 50;
          joy.dy = (joy.dy / d) * 50;
        }
      }
    }
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback((e) => {
    for (const t of e.changedTouches) {
      if (leftJoyRef.current.id === t.identifier) {
        leftJoyRef.current = { active: false, id: null, sx: 0, sy: 0, dx: 0, dy: 0 };
      }
      if (rightJoyRef.current.id === t.identifier) {
        rightJoyRef.current = { active: false, id: null, sx: 0, sy: 0, dx: 0, dy: 0 };
      }
    }
    e.preventDefault();
  }, []);

  // ─── Joystick visual (reactive re-render for joystick positions) ──────────
  const [ljVis, setLjVis] = useState({ active: false, sx: 0, sy: 0, dx: 0, dy: 0 });
  const [rjVis, setRjVis] = useState({ active: false, sx: 0, sy: 0, dx: 0, dy: 0 });

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      setLjVis({ ...leftJoyRef.current });
      setRjVis({ ...rightJoyRef.current });
    }, 16);
    return () => clearInterval(id);
  }, [phase]);

  // ─── Scoring table ────────────────────────────────────────────────────────
  const scoringRows = [
    { action: 'Small asteroid',   pts: '+10',  color: '#e0a060' },
    { action: 'Medium asteroid',  pts: '+15',  color: '#d08858' },
    { action: 'Large asteroid',   pts: '+30',  color: '#c0784a' },
    { action: 'Enemy drone',      pts: '+50',  color: '#c060ff' },
    { action: 'Energy crystal',   pts: '+20',  color: '#00ff88' },
    { action: 'Golden crystal',   pts: '+100', color: '#ffd700' },
    { action: 'Survive 10 sec',   pts: '+25',  color: '#00f5ff' },
  ];

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className="ss-root">
      <canvas
        ref={canvasRef}
        className="ss-canvas"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

      {/* ── MENU ── */}
      {phase === 'menu' && (
        <div className="ss-overlay ss-menu">
          <div className="ss-panel">
            <div className="ss-star-badge">⭐ HIGH SCORE: {highScore.toLocaleString()}</div>
            <h1 className="ss-title">
              <span className="ss-title-line1">SPACE</span>
              <span className="ss-title-line2">SURVIVOR</span>
            </h1>
            <p className="ss-subtitle">Your ship is caught in an asteroid field.<br/>Survive. Destroy. Collect.</p>

            <div className="ss-divider" />

            {/* Scoring table */}
            <div className="ss-scoring">
              <p className="ss-scoring-title">SCORING</p>
              {scoringRows.map(r => (
                <div key={r.action} className="ss-scoring-row">
                  <span className="ss-scoring-action">{r.action}</span>
                  <span className="ss-scoring-pts" style={{ color: r.color }}>{r.pts}</span>
                </div>
              ))}
            </div>

            <div className="ss-divider" />

            {/* Controls */}
            <div className="ss-controls-hint">
              <div className="ss-ctrl-group">
                <span className="ss-ctrl-icon">⌨️</span>
                <span>WASD / Arrows — Move &nbsp;|&nbsp; Mouse — Aim &nbsp;|&nbsp; Click / Space — Shoot</span>
              </div>
              <div className="ss-ctrl-group">
                <span className="ss-ctrl-icon">📱</span>
                <span>Left joystick — Move &nbsp;|&nbsp; Right joystick — Aim & Shoot</span>
              </div>
            </div>

            {sessionError && (
              <div style={{ color: '#ff4060', fontSize: '0.9rem', fontFamily: 'Orbitron', textAlign: 'center' }}>
                ⚠️ {sessionError}
              </div>
            )}

            <button className="ss-btn ss-btn-primary" onClick={startGame} disabled={starting}>
              {starting ? '🚀 INITIALIZING...' : '🚀 LAUNCH MISSION'}
            </button>
            <button className="ss-btn ss-btn-secondary" onClick={() => navigate('/')}>
              ← Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ── DEAD ── */}
      {phase === 'dead' && (
        <div className="ss-overlay ss-dead">
          <div className="ss-panel">
            <div className="ss-skull">💥</div>
            <h2 className="ss-gameover-title">SHIP DESTROYED</h2>
            <div className="ss-divider" />

            <div className="ss-final-stats">
              <div className="ss-final-stat">
                <span className="ss-stat-label">FINAL SCORE</span>
                <span className="ss-stat-value" style={{ color: '#00f5ff' }}>{uiScore.toLocaleString()}</span>
              </div>
              <div className="ss-final-stat">
                <span className="ss-stat-label">SURVIVED</span>
                <span className="ss-stat-value" style={{ color: '#ffd700' }}>{formatTime(uiTime)}</span>
              </div>
              <div className="ss-final-stat">
                <span className="ss-stat-label">HIGH SCORE</span>
                <span className="ss-stat-value" style={{ color: '#00ff88' }}>{highScore.toLocaleString()}</span>
              </div>
            </div>

            {uiScore >= highScore && uiScore > 0 && (
              <div className="ss-new-record">🏆 NEW RECORD!</div>
            )}

            <div className="ss-divider" />

            <button className="ss-btn ss-btn-secondary" onClick={() => navigate('/')}>
              ← Back to Home
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE JOYSTICKS ── */}
      {phase === 'playing' && isMobile && (
        <div className="ss-joysticks" aria-hidden="true">
          {/* Left joystick */}
          <div className="ss-joy-zone ss-joy-left">
            {ljVis.active && (
              <>
                <div className="ss-joy-base"
                  style={{ left: ljVis.sx - 50, top: ljVis.sy - 50 }} />
                <div className="ss-joy-knob"
                  style={{ left: ljVis.sx + ljVis.dx - 22, top: ljVis.sy + ljVis.dy - 22 }} />
              </>
            )}
            {!ljVis.active && (
              <div className="ss-joy-hint">
                <span>MOVE</span>
                <div className="ss-joy-arrows">
                  <span>↑</span>
                  <div><span>←</span><span>→</span></div>
                  <span>↓</span>
                </div>
              </div>
            )}
          </div>

          {/* Right joystick */}
          <div className="ss-joy-zone ss-joy-right">
            {rjVis.active && (
              <>
                <div className="ss-joy-base"
                  style={{ left: rjVis.sx - 50, top: rjVis.sy - 50 }} />
                <div className="ss-joy-knob ss-joy-knob-fire"
                  style={{ left: rjVis.sx + rjVis.dx - 22, top: rjVis.sy + rjVis.dy - 22 }} />
              </>
            )}
            {!rjVis.active && (
              <div className="ss-joy-hint ss-joy-hint-right">
                <span>AIM & FIRE</span>
                <span className="ss-fire-icon">🔫</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
