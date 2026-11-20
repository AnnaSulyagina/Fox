// =========================================================
//  ВВОД: клавиатура
// =========================================================
class InputHandler {
  constructor() {
    this.keys = new Set();
    this.jumpPressed = false;
    this.pausePressed = false;  // разовый флаг паузы
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
