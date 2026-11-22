// config.js — every tunable number of Midnight Vault in one place.
// Nothing here reads the wall clock or Math.random: the game is seeded and
// deterministic, so the same inputs always play the same way.

window.Heist = window.Heist || {};

Heist.Config = {
  // Canvas and layout.
  CANVAS_W: 1280,
  CANVAS_H: 480,
  HUD_H: 46,
  WALL: 14,

  // The one fixed seed: every shuffle, wobble and patrol jitter draws from it.
  SEED: 20261122,

  // Player.
  PLAYER_RADIUS: 12,
  WALK_SPEED: 150,
  SNEAK_SPEED: 82,
  INTERACT_RANGE: 36,

  // Vision. Guard cones are amber, camera cones are red; both are drawn.
  GUARD_RANGE: 195,
  GUARD_HALF_ANGLE: 0.62,
  CAMERA_RANGE: 235,
  CAMERA_HALF_ANGLE: 0.5,
  GUARD_PATROL_SPEED: 62,
  GUARD_ALERT_SPEED: 96,

  // Alarm: 0 is calm, 100 is caught. Rates are per second.
  ALARM_MAX: 100,
  ALARM_DECAY: 12,
  GUARD_SPOT_RATE: 58,
  CAMERA_SPOT_RATE: 42,
  SNEAK_FACTOR: 0.45,
  SHADOW_FACTOR: 0.5,
  EMP_NOISE: 8,

  // Tools. Charges are the cost: there is no way to buy more mid-heist.
  EMP_CHARGES: 2,
  EMP_DISABLE_SECONDS: 6,
  SMOKE_CHARGES: 1,
  SMOKE_SECONDS: 5,
  SMOKE_RADIUS: 72,

  // Scoring.
  GEM_VALUE: 50000,
  GOLD_VALUE: 15000,
  VASE_VALUE: 10000,
  TIME_BONUS_PER_SECOND: 100,
  TIME_BONUS_CAP_SECONDS: 300,

  // Colours of the night museum.
  COLORS: {
    floorA: '#1b2233',
    floorB: '#171d2b',
    floorLine: '#232c42',
    wall: '#3a4358',
    wallEdge: '#c9a227',
    shadow: 'rgba(6, 10, 22, 0.55)',
    shadowEdge: 'rgba(120, 150, 220, 0.35)',
    caseGlass: 'rgba(140, 200, 255, 0.16)',
    caseFrame: '#8a6d2f',
    gem: '#5ef2e2',
    gold: '#ffd34d',
    vase: '#7ddc8a',
    player: '#e8e4d8',
    playerHood: '#2f3a55',
    guard: '#31456e',
    guardCap: '#1c2740',
    cameraBody: '#4a4f5e',
    coneGuard: 'rgba(255, 176, 32, 0.20)',
    coneGuardEdge: 'rgba(255, 176, 32, 0.55)',
    coneCamera: 'rgba(255, 64, 64, 0.18)',
    coneCameraEdge: 'rgba(255, 64, 64, 0.5)',
    alarmLow: '#58d68d',
    alarmMid: '#f5b041',
    alarmHigh: '#e74c3c',
    hudBg: '#10141f',
    hudText: '#e8e4d8',
    hudDim: '#9aa5bd',
    exit: '#58d68d',
    entry: '#5dade2',
  },
};
