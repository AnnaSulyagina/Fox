// =========================================================
//  ЗАПУСК: инициализация и игровой цикл
// =========================================================
const canvas = document.getElementById('game-canvas');
const input = new InputHandler();
const game = new Game(canvas, input);

// Кнопка «Начать игру» под окном с игрой
document.getElementById('start-btn').addEventListener('click', () => game.startGame());

let lastTime = performance.now();

// Обновление состояния игры
function update(dt) {
  game.update(dt);
}

// Отрисовка кадра
function render() {
  game.render();
}

function gameLoop(now) {
  let dt = (now - lastTime) / 1000;
  dt = Math.min(dt, 1 / 30); // защита от скачка времени (свернули вкладку)
  lastTime = now;

  update(dt);  // Обновление состояния игры
  render();    // Отрисовка кадра
  requestAnimationFrame(gameLoop);
}
lastTime = performance.now();
requestAnimationFrame(gameLoop);
