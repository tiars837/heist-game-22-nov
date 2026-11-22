// tools.js — the two tools and what they cost.
// EMP: kills every camera for a few seconds, but the pop raises the alarm
// a little — a loud tool for a quiet job. Smoke: a cloud the thief can
// hide in, but it only lasts a few seconds and there is just one bomb.
// Both are spent charges: the heist is planned with what you carry in.

window.Heist = window.Heist || {};

/**
 * Fire the EMP. Returns true when it went off. Costs one charge and a
 * little alarm noise; while it runs the cameras are dark.
 */
Heist.useEmp = function useEmp(player, cameras, alarm) {
  const C = Heist.Config;
  if (player.empCharges <= 0) return { fired: false, alarm: alarm };
  player.empCharges -= 1;
  Heist.disableAllCameras(cameras, C.EMP_DISABLE_SECONDS);
  return { fired: true, alarm: Math.min(C.ALARM_MAX, alarm + C.EMP_NOISE) };
};

/**
 * Drop a smoke bomb at the thief's feet. Returns true when it went off.
 */
Heist.useSmoke = function useSmoke(player) {
  const C = Heist.Config;
  if (player.smokeCharges <= 0) return false;
  player.smokeCharges -= 1;
  player.smokeClouds.push({
    x: player.x,
    y: player.y,
    radius: C.SMOKE_RADIUS,
    left: C.SMOKE_SECONDS,
  });
  return true;
};

/** Whether the EMP button can fire right now (a charge left). */
Heist.canUseEmp = function canUseEmp(player) {
  return player.empCharges > 0;
};

/** Whether the smoke button can fire right now (a charge left). */
Heist.canUseSmoke = function canUseSmoke(player) {
  return player.smokeCharges > 0;
};
