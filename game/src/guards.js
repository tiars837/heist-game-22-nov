// guards.js — the patrolling guards and their vision cones.
// A guard walks a fixed loop, pauses at each waypoint to look around, and
// turns toward the thief when the alarm climbs. Being inside a guard's
// cone with a clear line of sight raises the alarm; the closer the thief,
// the faster it rises.

window.Heist = window.Heist || {};

/** One guard on a fixed patrol loop. */
Heist.makeGuard = function makeGuard(route, startIndex) {
  const first = route[startIndex % route.length];
  return {
    route: route,
    waypoint: (startIndex + 1) % route.length,
    x: first.x,
    y: first.y,
    angle: 0,
    pause: 0,
    speed: Heist.Config.GUARD_PATROL_SPEED,
    seeing: false,
    // How far along the current leg the guard is, for the render's stride.
    stride: 0,
  };
};

/** The guard's current waypoint target. */
Heist.guardTarget = function guardTarget(guard) {
  return guard.route[guard.waypoint];
};

/** Walk the patrol loop; pause briefly at each waypoint to look around. */
Heist.updateGuard = function updateGuard(guard, dt, player, alarm) {
  const C = Heist.Config;
  // A rising alarm makes the guard hurry and glance at the thief.
  const alerted = alarm > 55;
  guard.speed = alerted ? C.GUARD_ALERT_SPEED : C.GUARD_PATROL_SPEED;

  if (guard.pause > 0) {
    guard.pause -= dt;
    if (alerted && player) {
      guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
    }
    return;
  }

  const target = Heist.guardTarget(guard);
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    guard.waypoint = (guard.waypoint + 1) % guard.route.length;
    guard.pause = 1.2;
    // Face the next leg while pausing.
    const next = Heist.guardTarget(guard);
    guard.angle = Math.atan2(next.y - guard.y, next.x - guard.x);
    return;
  }
  const step = Math.min(dist, guard.speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
  guard.stride += step;
};

/**
 * Whether the guard can see the thief: inside the cone, within range,
 * with no wall or case between them. Sets guard.seeing for the render.
 */
Heist.guardSees = function guardSees(guard, level, player) {
  const C = Heist.Config;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  guard.seeing = false;
  if (dist > C.GUARD_RANGE || dist < 1) return dist < 1;
  const toPlayer = Math.atan2(dy, dx);
  let diff = toPlayer - guard.angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > C.GUARD_HALF_ANGLE) return false;
  if (Heist.sightBlocked(level, guard.x, guard.y, player.x, player.y)) return false;
  guard.seeing = true;
  return true;
};

/**
 * How fast the alarm rises per second while this guard sees the thief:
 * full rate up close, fading with distance, slower if the thief sneaks
 * or stands in shadow.
 */
Heist.guardSpotRate = function guardSpotRate(guard, level, player) {
  const C = Heist.Config;
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const closeness = 1 - (0.65 * dist) / C.GUARD_RANGE;
  let rate = C.GUARD_SPOT_RATE * Math.max(0.35, closeness);
  if (player.sneaking) rate *= C.SNEAK_FACTOR;
  if (Heist.inShadow(level, player.x, player.y)) rate *= C.SHADOW_FACTOR;
  return rate;
};
