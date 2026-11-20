const VIEW_W = 800;
const VIEW_H = 480;
const WORLD_W = 1920;
const WORLD_H = 1920;

const TREE_COUNT = 40;
const TREE_MIN_R = 30;
const TREE_MAX_R = 70;

const MOUSE_MIN_DELAY = 3.0;
const MOUSE_MAX_DELAY = 5.0;
const MOUSE_SPEED_FACTOR = 1 / 1.5;
const MOUSE_MAX_COUNT = 10;

const HUNGER_MAX = 100;
const HUNGER_DECAY_PER_SEC = 10 / 4;
const HUNGER_PER_MOUSE = 10;

const JUMP_DURATION = 0.7;
const JUMP_HEIGHT = 90;

const COUNTDOWN_SECONDS = 3;

const BEST_KEY = 'fox_best_score';

class InputHandler {
  constructor() {
    this.keys = new Set();
    this.jumpPressed = false;
    this.pausePressed = false;

    this._bindings = {
      up:    ['ArrowUp', 'KeyW'],
      down:  ['ArrowDown', 'KeyS'],
      left:  ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
      jump:  ['Space'],
      pause: ['KeyP', 'Escape'],
      restart: ['KeyR'],
    };

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys.has(e.code)) {
        if (this._bindings.jump.includes(e.code))  this.jumpPressed = true;
        if (this._bindings.pause.includes(e.code)) this.pausePressed = true;
      }
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  isDown(action) {
    const codes = this._bindings[action];
    return codes ? codes.some((c) => this.keys.has(c)) : false;
  }

  consumeJump() {
    if (this.jumpPressed) { this.jumpPressed = false; return true; }
    return false;
  }

  consumePause() {
    if (this.pausePressed) { this.pausePressed = false; return true; }
    return false;
  }
}

class Tree {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
  }

  draw(ctx, image) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(this.x + 4, this.y + 6, this.r, 0, Math.PI * 2);
    ctx.fill();

    if (image && image.complete && image.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(image, this.x - this.r, this.y - this.r, this.r * 2, this.r * 2);
      ctx.restore();
    } else {
      ctx.fillStyle = '#3f7a3a';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

class Mouse {
  constructor(x, y, maxSpeed) {
    this.x = x;
    this.y = y;
    this.baseSize = 28;
    this.vx = 0;
    this.vy = 0;
    this.maxSpeed = maxSpeed;
    this.changeDirTimer = 0;
    this.facing = 1;
    this.image = null;
    this._pickNewDirection();
  }

  _pickNewDirection() {
    const angle = Math.random() * Math.PI * 2;
    const speed = this.maxSpeed * (0.5 + Math.random() * 0.5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.changeDirTimer = 0.6 + Math.random() * 1.2;
  }

  update(dt) {
    this.changeDirTimer -= dt;
    if (this.changeDirTimer <= 0) this._pickNewDirection();

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const half = this._halfSize();
    if (this.x - half.w < 0) { this.x = half.w; this.vx = Math.abs(this.vx); }
    if (this.x + half.w > WORLD_W) { this.x = WORLD_W - half.w; this.vx = -Math.abs(this.vx); }
    if (this.y - half.h < 0) { this.y = half.h; this.vy = Math.abs(this.vy); }
    if (this.y + half.h > WORLD_H) { this.y = WORLD_H - half.h; this.vy = -Math.abs(this.vy); }

    if (Math.abs(this.vx) > 1) this.facing = this.vx > 0 ? 1 : -1;
  }

  _drawDimensions() {
    if (this.image && this.image.naturalWidth > 0) {
      const ratio = this.image.naturalHeight / this.image.naturalWidth;
      return { w: this.baseSize, h: this.baseSize * ratio };
    }
    return { w: this.baseSize, h: this.baseSize };
  }

  _halfSize() {
    const d = this._drawDimensions();
    return { w: d.w / 2, h: d.h / 2 };
  }

  getRect() {
    const d = this._drawDimensions();
    return {
      x: this.x - d.w / 2,
      y: this.y - d.h / 2,
      w: d.w,
      h: d.h,
    };
  }

  draw(ctx) {
    const d = this._drawDimensions();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + d.h * 0.5, d.w * 0.45, d.h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.image && this.image.complete && this.image.naturalWidth > 0) {
      ctx.save();
      if (this.facing < 0) {
        ctx.translate(this.x, 0);
        ctx.scale(-1, 1);
        ctx.translate(-this.x, 0);
      }
      ctx.drawImage(this.image, this.x - d.w / 2, this.y - d.h / 2, d.w, d.h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#9aa0b4';
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.min(d.w, d.h) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 18;

    this.vx = 0;
    this.vy = 0;

    this.ACCEL = 2600;
    this.MAX_SPEED = 260;
    this.FRICTION = 2400;

    this.facing = 1;

    this.spriteW = 72 * 1.7;
    this.spriteH = 60 * 1.7;

    this.z = 0;
    this.vz = 0;
    this.gravityZ = 0;

    this.imageGround = null;
    this.imageJump = null;
    this.imageSleep = null;
    this.groundLoaded = false;
    this.jumpLoaded = false;
    this.sleepLoaded = false;

    this.IMAGE_GROUND = 'img/fox.png';
    this.IMAGE_JUMP = 'img/foxj.png';
    this.IMAGE_SLEEP = 'img/foxsleep.png';

    this._loadImages();
  }

  _loadImages() {
    const g = new Image();
    g.onload = () => {
      this.imageGround = g;
      this.groundLoaded = true;
      const scale = this.spriteW / g.width;
      this.spriteW = g.width * scale;
      this.spriteH = g.height * scale;
    };
    g.onerror = () => console.error('Не загрузился', this.IMAGE_GROUND);
    g.src = this.IMAGE_GROUND;

    const j = new Image();
    j.onload = () => { this.imageJump = j; this.jumpLoaded = true; };
    j.onerror = () => console.error('Не загрузился', this.IMAGE_JUMP);
    j.src = this.IMAGE_JUMP;

    const s = new Image();
    s.onload = () => { this.imageSleep = s; this.sleepLoaded = true; };
    s.onerror = () => console.error('Не загрузился', this.IMAGE_SLEEP);
    s.src = this.IMAGE_SLEEP;
  }

  get isJumping() { return this.z > 0.005; }

  getRect() {
    return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
  }

  draw(ctx, sleeping) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.9, this.r * 0.9, this.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const visualY = this.y - this.z;

    let img = null;
    if (sleeping && this.sleepLoaded) img = this.imageSleep;
    else if (this.isJumping && this.jumpLoaded) img = this.imageJump;
    else if (this.groundLoaded) img = this.imageGround;

    if (sleeping) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const zY = visualY - this.spriteH / 2 - 12;
      ctx.fillText('z', this.x + 18, zY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText('Z', this.x + 40, zY - 18);
      ctx.restore();
    }

    if (!img) {
      ctx.fillStyle = sleeping ? '#88a3c5' : (this.isJumping ? '#ffa94d' : '#ff6b6b');
      ctx.beginPath();
      ctx.arc(this.x, visualY, this.r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const drawW = this.spriteW;
    const drawH = this.spriteH;
    const drawX = this.x - drawW / 2;
    const drawY = visualY - drawH / 2;

    ctx.save();
    if (this.facing < 0) {
      ctx.translate(this.x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-this.x, 0);
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  update(dt, input, trees) {
    let ax = 0, ay = 0;
    if (input.isDown('left'))  ax -= 1;
    if (input.isDown('right')) ax += 1;
    if (input.isDown('up'))    ay -= 1;
    if (input.isDown('down'))  ay += 1;

    const len = Math.hypot(ax, ay);
    if (len > 0) {
      ax /= len;
      ay /= len;
      if (ax !== 0) this.facing = ax > 0 ? 1 : -1;
    }

    this.vx += ax * this.ACCEL * dt;
    this.vy += ay * this.ACCEL * dt;

    if (ax === 0) {
      if (Math.abs(this.vx) <= this.FRICTION * dt) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * this.FRICTION * dt;
    }
    if (ay === 0) {
      if (Math.abs(this.vy) <= this.FRICTION * dt) this.vy = 0;
      else this.vy -= Math.sign(this.vy) * this.FRICTION * dt;
    }

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > this.MAX_SPEED) {
      const k = this.MAX_SPEED / speed;
      this.vx *= k;
      this.vy *= k;
    }

    if (!this.isJumping && input.consumeJump()) {
      const half = JUMP_DURATION / 2;
      const g = (2 * JUMP_HEIGHT) / (half * half);
      this.vz = g * half;
      this.z = 0.01;
    }

    if (this.isJumping) {
      this.vz -= this.gravityZ * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) { this.z = 0; this.vz = 0; }
    }

    this.x += this.vx * dt;
    this._resolveTreesX(trees);
    this.y += this.vy * dt;
    this._resolveTreesY(trees);

    this.x = Math.max(this.r, Math.min(WORLD_W - this.r, this.x));
    this.y = Math.max(this.r, Math.min(WORLD_H - this.r, this.y));
  }

  _resolveTreesX(trees) {
    if (this.isJumping) return;
    for (const t of trees) {
      const minDist = this.r + t.r;
      const dx = this.x - t.x;
      const dy = this.y - t.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist && dist > 0.0001) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        this.x += nx * overlap * Math.abs(nx);
        if (Math.sign(this.vx) === -Math.sign(nx)) this.vx = 0;
      }
    }
  }

  _resolveTreesY(trees) {
    if (this.isJumping) return;
    for (const t of trees) {
      const minDist = this.r + t.r;
      const dx = this.x - t.x;
      const dy = this.y - t.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist && dist > 0.0001) {
        const overlap = minDist - dist;
        const ny = dy / dist;
        this.y += ny * overlap * Math.abs(ny);
        if (Math.sign(this.vy) === -Math.sign(ny)) this.vy = 0;
      }
    }
  }
}

function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

class Camera {
  constructor(viewW, viewH, worldW, worldH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = 0;
    this.y = 0;
  }

  follow(target, dt) {
    let tx = target.x - this.viewW / 2;
    let ty = target.y - this.viewH / 2;

    tx = Math.max(0, Math.min(this.worldW - this.viewW, tx));
    ty = Math.max(0, Math.min(this.worldH - this.viewH, ty));

    const k = 1 - Math.pow(0.001, dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;

    this.x = Math.max(0, Math.min(this.worldW - this.viewW, this.x));
    this.y = Math.max(0, Math.min(this.worldH - this.viewH, this.y));
  }
}

function generateForest(player) {
  const trees = [];
  const margin = 80;
  const startRadius = 140;

  let attempts = 0;
  const MAX_ATTEMPTS = TREE_COUNT * 60;

  while (trees.length < TREE_COUNT && attempts < MAX_ATTEMPTS) {
    attempts++;
    const r = TREE_MIN_R + Math.random() * (TREE_MAX_R - TREE_MIN_R);
    const x = margin + r + Math.random() * (WORLD_W - 2 * (margin + r));
    const y = margin + r + Math.random() * (WORLD_H - 2 * (margin + r));

    if (Math.hypot(x - player.x, y - player.y) < startRadius + r) continue;

    let ok = true;
    for (const t of trees) {
      const minDist = t.r + r + 60;
      if (Math.hypot(x - t.x, y - t.y) < minDist) { ok = false; break; }
    }
    if (!ok) continue;

    trees.push(new Tree(x, y, r));
  }
  return trees;
}

class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;

    this.hudScore  = document.getElementById('hud-score');
    this.hudBest   = document.getElementById('hud-best');
    this.hungerFill  = document.getElementById('hunger-fill');
    this.hungerLabel = document.getElementById('hunger-label');
    this.stateBanner = document.getElementById('state-banner');
    this.pauseBtn    = document.getElementById('pause-btn');

    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayText  = document.getElementById('overlay-text');
    this.newGameBtn   = document.getElementById('new-game-btn');
    this.newGameBtn.addEventListener('click', () => this.reset());

    this.pauseBtn.addEventListener('click', () => this.togglePause());

    this.bestScore = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;

    this.images = {
      tree:  this._load('img/tree.png'),
      mouse: this._load('img/mouse.png'),
    };

    this.reset();
  }

  startGame() {
    this.startScreen.classList.add('hidden');
    this.reset();
  }

  _load(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  reset() {
    this.player = new Player(WORLD_W / 2, WORLD_H / 2);
    this.camera = new Camera(VIEW_W, VIEW_H, WORLD_W, WORLD_H);

    this.camera.x = Math.max(0, Math.min(WORLD_W - VIEW_W, this.player.x - VIEW_W / 2));
    this.camera.y = Math.max(0, Math.min(WORLD_H - VIEW_H, this.player.y - VIEW_H / 2));

    this.trees = generateForest(this.player);

    this.mice = [];
    this.mouseTimer = 2 + Math.random() * 3;
    this.score = 0;
    this.hunger = HUNGER_MAX;

    this.state = 'playing';
    this.countdown = 0;
    this.countdownFinished = 0;

    this.overlay.classList.add('hidden');
    this.stateBanner.classList.remove('visible');
    this.stateBanner.textContent = '';
    this.pauseBtn.textContent = 'Пауза';
    this.pauseBtn.classList.remove('paused');

    this._restartLatch = false;
    this.input.jumpPressed = false;
    this.input.pausePressed = false;

    this._updateHUD();
  }

  _updateHUD() {
    this.hudScore.textContent = `🐭 Съедено: ${this.score}`;
    this.hudBest.textContent  = `🏆 Рекорд: ${this.bestScore}`;

    const pct = Math.max(0, Math.min(100, this.hunger));
    this.hungerLabel.textContent = `Сытость: ${Math.round(pct)}%`;
    this.hungerFill.style.width = pct + '%';
    this.hungerFill.classList.toggle('low', pct <= 30);
  }

  _endGame() {
    this.state = 'gameover';

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(BEST_KEY, String(this.bestScore));
    }
    this._updateHUD();

    this.overlayTitle.textContent = 'Лис проголодался!';
    this.overlayText.innerHTML =
      `Съедено мышей: <b>${this.score}</b><br>` +
      `Рекорд: <b>${this.bestScore}</b>`;

    this.overlay.classList.remove('hidden');
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.pauseBtn.textContent = 'Продолжить';
      this.pauseBtn.classList.add('paused');
      this.stateBanner.textContent = 'Пауза';
      this.stateBanner.classList.add('visible');
    } else if (this.state === 'paused') {
      this.startCountdown();
    }
  }

  startCountdown() {
    this.state = 'countdown';
    this.countdown = COUNTDOWN_SECONDS;
    this.countdownFinished = 0;
    this.pauseBtn.textContent = 'Продолжить';
    this.pauseBtn.classList.add('paused');
    this.stateBanner.classList.add('visible');
  }

  _updateStateBanner() {
    if (this.state === 'paused') {
      this.stateBanner.textContent = 'Пауза';
    } else if (this.state === 'countdown') {
      if (this.countdown > 0) {
        this.stateBanner.textContent = `${Math.ceil(this.countdown)}`;
      } else {
        this.stateBanner.textContent = 'Поехали!';
      }
    } else {
      this.stateBanner.classList.remove('visible');
    }
  }

  update(dt) {
    if (this.state === 'start') return;

    if (this.input.consumePause()) {
      if (this.state === 'playing' || this.state === 'paused') {
        this.togglePause();
      }
    }

    if (this.input.isDown('restart')) {
      if (!this._restartLatch) { this._restartLatch = true; this.reset(); }
      return;
    } else {
      this._restartLatch = false;
    }

    if (this.state === 'gameover') return;

    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        if (this.countdownFinished === 0) {
          this.countdownFinished = 0.5;
        } else {
          this.countdownFinished -= dt;
          if (this.countdownFinished <= 0) {
            this.state = 'playing';
            this.pauseBtn.textContent = 'Пауза';
            this.pauseBtn.classList.remove('paused');
            this.stateBanner.classList.remove('visible');
          }
        }
      }
      this._updateStateBanner();
      return;
    }

    if (this.state !== 'playing') return;

    this.hunger -= HUNGER_DECAY_PER_SEC * dt;
    if (this.hunger <= 0) {
      this.hunger = 0;
      this._updateHUD();
      this._endGame();
      return;
    }

    this.player.update(dt, this.input, this.trees);
    this.camera.follow(this.player, dt);

    this.mouseTimer -= dt;
    if (this.mouseTimer <= 0) {
      if (this.mice.length < MOUSE_MAX_COUNT) this._spawnMouseInView();
      this.mouseTimer = MOUSE_MIN_DELAY + Math.random() * (MOUSE_MAX_DELAY - MOUSE_MIN_DELAY);
    }

    for (const m of this.mice) m.update(dt);

    for (const m of this.mice) {
      if (!m.image && this.images.mouse && this.images.mouse.complete && this.images.mouse.naturalWidth > 0) {
        m.image = this.images.mouse;
      }
    }

    const playerRect = this.player.getRect();
    const before = this.mice.length;
    this.mice = this.mice.filter((m) => !aabbOverlap(playerRect, m.getRect()));
    const eaten = before - this.mice.length;
    if (eaten > 0) {
      this.score += eaten;
      this.hunger = Math.min(HUNGER_MAX, this.hunger + eaten * HUNGER_PER_MOUSE);
    }
    this._updateHUD();
  }

  _spawnMouseInView() {
    const speed = this.player.MAX_SPEED * MOUSE_SPEED_FACTOR;

    for (let i = 0; i < 40; i++) {
      const x = this.camera.x + 40 + Math.random() * (VIEW_W - 80);
      const y = this.camera.y + 40 + Math.random() * (VIEW_H - 80);

      let blocked = false;
      for (const t of this.trees) {
        if (Math.hypot(x - t.x, y - t.y) < t.r + 20) { blocked = true; break; }
      }
      if (blocked) continue;
      if (Math.hypot(x - this.player.x, y - this.player.y) < 120) continue;

      const m = new Mouse(x, y, speed);
      if (this.images.mouse && this.images.mouse.complete && this.images.mouse.naturalWidth > 0) {
        m.image = this.images.mouse;
      }
      this.mice.push(m);
      return;
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    ctx.fillStyle = '#2c4a2e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    this._drawGroundTexture(ctx);

    for (const t of this.trees) {
      if (this._isVisible(t.x, t.y, t.r)) t.draw(ctx, this.images.tree);
    }

    for (const m of this.mice) {
      if (this._isVisible(m.x, m.y, m.baseSize)) m.draw(ctx);
    }

    const sleeping = (this.state === 'paused');
    this.player.draw(ctx, sleeping);

    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-this.camera.x, -this.camera.y, WORLD_W, WORLD_H);

    this._drawMinimap(ctx);
  }

  _isVisible(x, y, r) {
    return (
      x + r >= this.camera.x &&
      x - r <= this.camera.x + VIEW_W &&
      y + r >= this.camera.y &&
      y - r <= this.camera.y + VIEW_H
    );
  }

  _drawGroundTexture(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    const step = 80;
    const startX = Math.floor(this.camera.x / step) * step;
    const startY = Math.floor(this.camera.y / step) * step;
    for (let x = startX; x < this.camera.x + VIEW_W + step; x += step) {
      for (let y = startY; y < this.camera.y + VIEW_H + step; y += step) {
        const seed = (x * 73856093) ^ (y * 19349663);
        if ((seed & 7) === 0) ctx.fillRect(x + 20, y + 20, 4, 4);
      }
    }
  }

  _drawMinimap(ctx) {
    const mmW = 110;
    const mmH = 110;
    const pad = 10;
    const x0 = VIEW_W - mmW - pad;
    const y0 = VIEW_H - mmH - pad;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x0, y0, mmW, mmH);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0, y0, mmW, mmH);

    const sx = mmW / WORLD_W;
    const sy = mmH / WORLD_H;

    ctx.fillStyle = 'rgba(120, 200, 120, 0.7)';
    for (const t of this.trees) {
      ctx.beginPath();
      ctx.arc(x0 + t.x * sx, y0 + t.y * sy, Math.max(1, t.r * sx), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(200, 200, 220, 0.9)';
    for (const m of this.mice) {
      ctx.beginPath();
      ctx.arc(x0 + m.x * sx, y0 + m.y * sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.arc(x0 + this.player.x * sx, y0 + this.player.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeRect(
      x0 + this.camera.x * sx,
      y0 + this.camera.y * sy,
      VIEW_W * sx,
      VIEW_H * sy
    );
  }
}

const canvas = document.getElementById('game-canvas');
const input = new InputHandler();
const game = new Game(canvas, input);

let lastTime = performance.now();

function update(dt) {
  game.update(dt);
}

function render() {
  game.render();
}

function gameLoop(now) {
  let dt = (now - lastTime) / 1000;
  dt = Math.min(dt, 1 / 30);
  lastTime = now;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

lastTime = performance.now();
requestAnimationFrame(gameLoop);
