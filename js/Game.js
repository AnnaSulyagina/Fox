// =========================================================
//  ИГРА: состояния, HUD, голод, спавн мышей, старт
// =========================================================
class Game {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.input = input;
    this.renderer = new Renderer(canvas);

    // HUD
    this.hudScore    = document.getElementById('hud-score');
    this.hudBest     = document.getElementById('hud-best');
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

    // стартовый экран: игра ждёт нажатия кнопки
    this.state = 'start';
  }

  startGame() {
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

    // 'start' | 'playing' | 'paused' | 'countdown' | 'gameover'
    this.state = 'playing';
    this.countdown = 0;
    this.countdownFinished = 0; // показываем «Поехали!» ещё 0.5 сек

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

  // ---------- пауза ----------
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
    // ---- стартовый экран: мир ждёт ----
    if (this.state === 'start') return;

    // ---- пауза по клавише P/Esc ----
    if (this.input.consumePause()) {
      if (this.state === 'playing' || this.state === 'paused') {
        this.togglePause();
      }
    }

    // ---- рестарт ----
    if (this.input.isDown('restart')) {
      if (!this._restartLatch) { this._restartLatch = true; this.reset(); }
      return;
    } else {
      this._restartLatch = false;
    }

    if (this.state === 'gameover') return;

    // ---- обратный отсчёт ----
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        if (this.countdownFinished === 0) {
          // «Поехали!» на полсекунды
          this.countdownFinished = 0.5;
        } else {
          this.countdownFinished -= dt;
          if (this.countdownFinished <= 0) {
            // реально возобновляем игру
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

    // ---------- голод ----------
    this.hunger -= HUNGER_DECAY_PER_SEC * dt;
    if (this.hunger <= 0) {
      this.hunger = 0;
      this._updateHUD();
      this._endGame();
      return;
    }

    this.player.update(dt, this.input, this.trees);
    this.camera.follow(this.player, dt);

    // спавн мышей
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

    // съедание
    const playerRect = this.player.getRect();
    const before = this.mice.length;
    this.mice = this.mice.filter((m) => !Collision.aabbOverlap(playerRect, m.getRect()));
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
    this.renderer.render(this);
  }
}
