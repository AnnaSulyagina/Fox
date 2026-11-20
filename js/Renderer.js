// =========================================================
//  РЕНДЕР: отрисовка кадра — фон, лес, мыши, лис, миникарта
// =========================================================
class Renderer {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
  }

  render(game) {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    ctx.fillStyle = '#2c4a2e';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(-Math.round(game.camera.x), -Math.round(game.camera.y));

    this._drawGroundTexture(game, ctx);

    for (const t of game.trees) {
      if (this._isVisible(game, t.x, t.y, t.r)) t.draw(ctx, game.images.tree);
    }

    for (const m of game.mice) {
      if (this._isVisible(game, m.x, m.y, m.baseSize)) m.draw(ctx);
    }

    // лис: в паузе — спящий, в игре — по состоянию прыжка
    const sleeping = (game.state === 'paused');
    game.player.draw(ctx, sleeping);

    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-game.camera.x, -game.camera.y, WORLD_W, WORLD_H);

    this._drawMinimap(game, ctx);
  }

  _isVisible(game, x, y, r) {
    return (
      x + r >= game.camera.x &&
      x - r <= game.camera.x + VIEW_W &&
      y + r >= game.camera.y &&
      y - r <= game.camera.y + VIEW_H
    );
  }

  _drawGroundTexture(game, ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    const step = 80;
    const startX = Math.floor(game.camera.x / step) * step;
    const startY = Math.floor(game.camera.y / step) * step;
    for (let x = startX; x < game.camera.x + VIEW_W + step; x += step) {
      for (let y = startY; y < game.camera.y + VIEW_H + step; y += step) {
        const seed = (x * 73856093) ^ (y * 19349663);
        if ((seed & 7) === 0) ctx.fillRect(x + 20, y + 20, 4, 4);
      }
    }
  }

  _drawMinimap(game, ctx) {
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
    for (const t of game.trees) {
      ctx.beginPath();
      ctx.arc(x0 + t.x * sx, y0 + t.y * sy, Math.max(1, t.r * sx), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(200, 200, 220, 0.9)';
    for (const m of game.mice) {
      ctx.beginPath();
      ctx.arc(x0 + m.x * sx, y0 + m.y * sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.arc(x0 + game.player.x * sx, y0 + game.player.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeRect(
      x0 + game.camera.x * sx,
      y0 + game.camera.y * sy,
      VIEW_W * sx,
      VIEW_H * sy
    );
  }
}
