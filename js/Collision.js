// =========================================================
//  КОЛЛИЗИИ: AABB и выталкивание круга из деревьев
// =========================================================
const Collision = {
  // Пересечение прямоугольников
  aabbOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  },

  // Выталкивание по оси X (когда лис не в прыжке)
  resolveCircleX(entity, trees) {
    if (entity.isJumping) return;
    for (const t of trees) {
      const minDist = entity.r + t.r;
      const dx = entity.x - t.x;
      const dy = entity.y - t.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist && dist > 0.0001) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        entity.x += nx * overlap * Math.abs(nx);
        if (Math.sign(entity.vx) === -Math.sign(nx)) entity.vx = 0;
      }
    }
  },

  // Выталкивание по оси Y (когда лис не в прыжке)
  resolveCircleY(entity, trees) {
    if (entity.isJumping) return;
    for (const t of trees) {
      const minDist = entity.r + t.r;
      const dx = entity.x - t.x;
      const dy = entity.y - t.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist && dist > 0.0001) {
        const overlap = minDist - dist;
        const ny = dy / dist;
        entity.y += ny * overlap * Math.abs(ny);
        if (Math.sign(entity.vy) === -Math.sign(ny)) entity.vy = 0;
      }
    }
  },
};
