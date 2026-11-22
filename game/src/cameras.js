// cameras.js — the wall cameras and their sweeping cones.
// A camera sits on a wall and sweeps a fixed arc back and forth, on a
// clock that starts at the same angle every game. An EMP shuts every
// camera down for a few seconds — at the price of a little alarm noise.

window.Heist = window.Heist || {};

/** One camera, bolted to a wall, sweeping its arc on a fixed clock. */
Heist.makeCamera = function makeCamera(mount) {
  return {
    x: mount.x,
    y: mount.y,
    baseAngle: mount.baseAngle,
    sweep: mount.sweep,
    range: mount.range,
    phase: 0,
    angle: mount.baseAngle,
    disabled: 0,
    seeing: false,
  };
};

/** Sweep the cone; a disabled camera stays dark and still. */
Heist.updateCamera = function updateCamera(camera, dt) {
  if (camera.disabled > 0) {
    camera.disabled -= dt;
    camera.seeing = false;
    return;
  }
  camera.phase += dt * 0.55;
  camera.angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
};

/** Whether the camera can see the thief right now. */
Heist.cameraSees = function cameraSees(camera, level, player) {
  const C = Heist.Config;
  camera.seeing = false;
  if (camera.disabled > 0) return false;
  const dx = player.x - camera.x;
  const dy = player.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > camera.range || dist < 1) return false;
  const toPlayer = Math.atan2(dy, dx);
  let diff = toPlayer - camera.angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > C.CAMERA_HALF_ANGLE) return false;
  if (Heist.sightBlocked(level, camera.x, camera.y, player.x, player.y)) return false;
  camera.seeing = true;
  return true;
};

/** How fast the alarm rises per second while this camera sees the thief. */
Heist.cameraSpotRate = function cameraSpotRate(camera, level, player) {
  const C = Heist.Config;
  const dist = Math.hypot(player.x - camera.x, player.y - camera.y);
  const closeness = 1 - (0.6 * dist) / camera.range;
  let rate = C.CAMERA_SPOT_RATE * Math.max(0.35, closeness);
  if (player.sneaking) rate *= C.SNEAK_FACTOR;
  if (Heist.inShadow(level, player.x, player.y)) rate *= C.SHADOW_FACTOR;
  return rate;
};

/** Shut every camera down for the EMP's duration. */
Heist.disableAllCameras = function disableAllCameras(cameras, seconds) {
  for (const camera of cameras) camera.disabled = seconds;
};
