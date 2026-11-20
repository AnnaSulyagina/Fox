// =========================================================
//  ИГРОК-ЛИС — прыжок + спящий спрайт
// =========================================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 18;

    this.vx = 0;
    this.vy = 0;

    this.ACCEL    = 2600;
    this.MAX_SPEED = 260;
    this.FRICTION = 2400;

    this.facing = 1;

    // спрайт +70%
    this.spriteW = 72 * 1.7;
    this.spriteH = 60 * 1.7;

    // ---- прыжок ----
    this.z = 0;
    this.vz = 0;
    this.gravityZ = 0;

    // ---- картинки ----
    this.imageGround = null;
    this.imageJump   = null;
    this.imageSleep  = null;
    this.groundLoaded = false;
    this.jumpLoaded   = false;
    this.sleepLoaded  = false;

    this.IMAGE_GROUND = 'img/fox.png';
    this.IMAGE_JUMP   = 'img/foxj.png';
    this.IMAGE_SLEEP  = 'img/foxsleep.png';

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

  /** Отрисовка. sleeping=true → картинка foxsleep.png, лис лежит на земле. */
  draw(ctx, sleeping) {
    // тень
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 0.9, this.r * 0.9, this.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const visualY = this.y - this.z;

    // выбор картинки
    let img = null;
    if (sleeping && this.sleepLoaded) img = this.imageSleep;
    else if (this.isJumping && this.jumpLoaded) img = this.imageJump;
    else if (this.groundLoaded) img = this.imageGround;

    // «Z-z-z» над спящим лисом
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
      this.gravityZ = g;
      this.vz = g * half;
      this.z = 0.01;
    }

    if (this.isJumping) {
      this.vz -= this.gravityZ * dt;
      this.z  += this.vz * dt;
      if (this.z <= 0) { this.z = 0; this.vz = 0; }
    }

    this.x += this.vx * dt;
    Collision.resolveCircleX(this, trees);
    this.y += this.vy * dt;
    Collision.resolveCircleY(this, trees);

    this.x = Math.max(this.r, Math.min(WORLD_W - this.r, this.x));
    this.y = Math.max(this.r, Math.min(WORLD_H - this.r, this.y));
  }
}
