// =========================================================
//  МИР: константы, камера, деревья, мыши и генерация леса
// =========================================================

// ---------- константы ----------
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

// ---------- голод: 10% за 4 секунды ----------
const HUNGER_MAX = 100;
const HUNGER_DECAY_PER_SEC = 10 / 4;
const HUNGER_PER_MOUSE = 10;

// ---------- прыжок ----------
const JUMP_DURATION = 0.7;
const JUMP_HEIGHT   = 90;

// ---------- пауза / отсчёт ----------
const COUNTDOWN_SECONDS = 3;

// ---------- рекорд ----------
const BEST_KEY = 'fox_best_score';

// =========================================================
//  ДЕРЕВО
// =========================================================
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

// =========================================================
//  МЫШЬ
// =========================================================
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

// =========================================================
//  КАМЕРА
// =========================================================
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

// =========================================================
//  ГЕНЕРАЦИЯ ЛЕСА
// =========================================================
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
