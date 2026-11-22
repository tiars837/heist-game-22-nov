// player.js — the thief: movement, sneaking, picking up loot, and the
// two tools. Movement collides against walls and cases axis by axis, so
// the thief slides along a wall instead of sticking to it.

window.Heist = window.Heist || {};

/** A fresh thief at the entry door, tools in pocket, nothing stolen yet. */
Heist.makePlayer = function makePlayer(x, y) {
  const C = Heist.Config;
  return {
    x: x,
    y: y,
    angle: 0,
    sneaking: false,
    moving: false,
    lootValue: 0,
    lootCount: 0,
    hasGem: false,
    empCharges: C.EMP_CHARGES,
    smokeCharges: C.SMOKE_CHARGES,
    empCooldown: 0,
    smokeClouds: [],
  };
};

/**
 * Move the thief by the held keys. dx, dy are -1..1; sneaking halves the
 * pace. Returns whether the thief actually moved.
 */
Heist.movePlayer = function movePlayer(player, level, dx, dy, sneaking, dt) {
  const C = Heist.Config;
  player.sneaking = sneaking;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) {
    player.moving = false;
    return false;
  }
  const speed = sneaking ? C.SNEAK_SPEED : C.WALK_SPEED;
  const stepX = (dx / len) * speed * dt;
  const stepY = (dy / len) * speed * dt;
  let moved = false;
  if (Heist.fitsAt(level, player.x + stepX, player.y, C.PLAYER_RADIUS)) {
    player.x += stepX;
    moved = true;
  }
  if (Heist.fitsAt(level, player.x, player.y + stepY, C.PLAYER_RADIUS)) {
    player.y += stepY;
    moved = true;
  }
  if (moved) {
    player.angle = Math.atan2(dy, dx);
    player.moving = true;
  }
  return moved;
};

/** Pick up the loot in reach, if any. Returns the item taken, or null. */
Heist.grabLoot = function grabLoot(player, level) {
  const item = Heist.lootInReach(level, player.x, player.y);
  if (item === null) return null;
  item.taken = true;
  player.lootValue += item.value;
  player.lootCount += 1;
  if (item.required) player.hasGem = true;
  return item;
};

/** Whether the thief is inside any smoke cloud (unseen by every eye). */
Heist.inSmoke = function inSmoke(player, x, y) {
  for (const cloud of player.smokeClouds) {
    if (Math.hypot(x - cloud.x, y - cloud.y) <= cloud.radius) return true;
  }
  return false;
};

/** Age the smoke clouds; a spent cloud is gone. */
Heist.updateSmoke = function updateSmoke(player, dt) {
  for (const cloud of player.smokeClouds) cloud.left -= dt;
  player.smokeClouds = player.smokeClouds.filter((cloud) => cloud.left > 0);
};
