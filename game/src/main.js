// main.js — the game loop and the rules that hold it together.
// States: title, playing, won, caught. A fixed step of 1/60 s keeps the
// simulation deterministic; the loop only decides how many steps to run.
// Keyboard moves and acts, the mouse fires the HUD tool buttons and the
// panel buttons. A ?pose=... URL parameter stages a scene (cover, mid,
// alarm, escape, win, caught) for screenshots and playtests — it only
// sets starting positions, every win and loss still runs through the
// real rules. ?freeze=1 stops the clock after the first frame.

window.Heist = window.Heist || {};

/** A fresh game: the room, the thief at the door, the patrols on their marks. */
Heist.newGame = function newGame() {
  const level = Heist.buildLevel();
  const guards = level.guardRoutes.map((route, i) => Heist.makeGuard(route, i === 0 ? 0 : 1));
  const cameras = level.cameraMounts.map((mount) => Heist.makeCamera(mount));
  return {
    level: level,
    player: Heist.makePlayer(30, 219),
    guards: guards,
    cameras: cameras,
    alarm: 0,
    time: 0,
    timeText: '0:00',
    status: 'title',
    seenBy: null,
    wasSeen: false,
    score: 0,
    message: null,
    messageLeft: 0,
    hudButtons: [],
    screenButton: null,
    frozen: false,
  };
};

/** The thief's score: loot plus a bonus for a fast, quiet getaway. */
Heist.computeScore = function computeScore(state) {
  const C = Heist.Config;
  const bonus = Math.max(0, C.TIME_BONUS_CAP_SECONDS - Math.floor(state.time)) * C.TIME_BONUS_PER_SECOND;
  return state.player.lootValue + bonus;
};

/** Human time: m:ss. */
Heist.formatTime = function formatTime(seconds) {
  const total = Math.floor(seconds);
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
};

/** One fixed simulation step: patrols, cameras, sight, alarm, win and loss. */
Heist.stepGame = function stepGame(state, input, dt, audio) {
  if (state.status !== 'playing') return;
  state.time += dt;
  state.timeText = Heist.formatTime(state.time);

  // Movement from the held keys.
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  Heist.movePlayer(state.player, state.level, dx, dy, input.sneak, dt);
  Heist.updateSmoke(state.player, dt);

  for (const guard of state.guards) {
    Heist.updateGuard(guard, dt, state.player, state.alarm);
  }
  for (const camera of state.cameras) {
    Heist.updateCamera(camera, dt);
  }

  // Sight: hidden in smoke, nobody sees anything.
  const hidden = Heist.inSmoke(state.player, state.player.x, state.player.y);
  let rate = 0;
  state.seenBy = null;
  if (!hidden) {
    for (const guard of state.guards) {
      if (Heist.guardSees(guard, state.level, state.player)) {
        rate += Heist.guardSpotRate(guard, state.level, state.player);
        state.seenBy = 'guard';
      }
    }
    for (const camera of state.cameras) {
      if (Heist.cameraSees(camera, state.level, state.player)) {
        rate += Heist.cameraSpotRate(camera, state.level, state.player);
        state.seenBy = 'camera';
      }
    }
  }
  if (rate > 0) {
    state.alarm = Math.min(Heist.Config.ALARM_MAX, state.alarm + rate * dt);
    if (!state.wasSeen) {
      state.wasSeen = true;
      Heist.audioSpotted(audio);
    }
  } else {
    state.alarm = Math.max(0, state.alarm - Heist.Config.ALARM_DECAY * dt);
    if (state.alarm < 30) state.wasSeen = false;
  }
  if (state.alarm >= 70) Heist.audioAlarmTick(audio, state.time);

  // Caught: the alarm filled.
  if (state.alarm >= Heist.Config.ALARM_MAX) {
    state.status = 'caught';
    state.score = state.player.lootValue;
    Heist.audioCaught(audio);
    return;
  }

  // Won: sapphire in pocket, thief in the exit doorway.
  if (state.player.hasGem && Heist.atExit(state.level, state.player.x, state.player.y)) {
    state.status = 'won';
    state.score = Heist.computeScore(state);
    Heist.audioWin(audio);
  }
};

/** Stage a scene from a URL parameter: positions only, rules unchanged. */
Heist.applyPose = function applyPose(state, pose) {
  const C = Heist.Config;
  if (pose === 'cover') {
    // The cover frame: thief mid-room, a guard cone sweeping past, a
    // camera cone crossing, the sapphire glowing, alarm a third full.
    state.status = 'playing';
    state.player.x = 330;
    state.player.y = 250;
    state.player.angle = 0;
    state.guards[0].x = 560;
    state.guards[0].y = 210;
    state.guards[0].angle = Math.PI;
    state.guards[0].waypoint = 3;
    state.guards[1].x = 700;
    state.guards[1].y = 406;
    state.guards[1].angle = Math.PI;
    state.cameras[0].phase = 0.9;
    state.cameras[0].angle = state.cameras[0].baseAngle + Math.sin(0.9) * state.cameras[0].sweep;
    state.cameras[1].phase = -0.6;
    state.cameras[1].angle = state.cameras[1].baseAngle + Math.sin(-0.6) * state.cameras[1].sweep;
    state.alarm = 32;
  } else if (pose === 'mid') {
    // Sneaking behind a case, one grab from the sapphire.
    state.status = 'playing';
    state.player.x = 540;
    state.player.y = 260;
    state.player.sneaking = true;
    state.player.angle = Math.PI / 4;
    state.guards[0].x = 700;
    state.guards[0].y = 190;
    state.guards[0].angle = Math.PI / 2;
    state.guards[0].waypoint = 3;
    state.guards[1].x = 420;
    state.guards[1].y = 406;
    state.guards[1].angle = 0;
    state.cameras[0].phase = -0.4;
    state.cameras[0].angle = state.cameras[0].baseAngle + Math.sin(-0.4) * state.cameras[0].sweep;
    state.alarm = 12;
  } else if (pose === 'alarm') {
    // Caught in the open under a guard's cone, alarm nearly full.
    // The thief stands clear of the display case, so the sight line is open.
    state.status = 'playing';
    state.player.x = 560;
    state.player.y = 170;
    state.player.angle = Math.PI / 2;
    state.guards[0].x = 450;
    state.guards[0].y = 200;
    state.guards[0].angle = 0;
    state.guards[0].waypoint = 2;
    // The guard has stopped to stare: with the alarm already high it
    // keeps facing the thief, so the alarm fills and the loss is real.
    state.guards[0].pause = 6;
    state.guards[0].seeing = true;
    state.guards[1].x = 900;
    state.guards[1].y = 406;
    state.guards[1].angle = Math.PI;
    state.alarm = 78;
  } else if (pose === 'escape') {
    // Sapphire pocketed, one corridor from the green door.
    state.status = 'playing';
    const gem = state.level.loot[0];
    gem.taken = true;
    state.player.hasGem = true;
    state.player.lootValue = C.GEM_VALUE;
    state.player.lootCount = 1;
    state.player.x = 1080;
    state.player.y = 240;
    state.player.angle = 0;
    state.guards[0].x = 700;
    state.guards[0].y = 290;
    state.guards[0].angle = Math.PI;
    state.guards[1].x = 300;
    state.guards[1].y = 406;
    state.guards[1].angle = 0;
    state.alarm = 5;
  } else if (pose === 'win') {
    state.status = 'won';
    const gem = state.level.loot[0];
    gem.taken = true;
    state.player.hasGem = true;
    state.player.lootValue = C.GEM_VALUE + C.GOLD_VALUE;
    state.player.lootCount = 2;
    state.time = 96;
    state.timeText = Heist.formatTime(96);
    state.score = Heist.computeScore(state);
  } else if (pose === 'caught') {
    state.status = 'caught';
    state.player.x = 520;
    state.player.y = 200;
    state.alarm = 100;
    state.score = 0;
  }
};

/** A small snapshot for playtests: no functions, just numbers and words. */
Heist.snapshot = function snapshot(state) {
  return {
    status: state.status,
    x: Math.round(state.player.x),
    y: Math.round(state.player.y),
    alarm: Math.round(state.alarm * 10) / 10,
    lootValue: state.player.lootValue,
    lootCount: state.player.lootCount,
    hasGem: state.player.hasGem,
    time: Math.round(state.time * 10) / 10,
    score: state.score,
    empCharges: state.player.empCharges,
    smokeCharges: state.player.smokeCharges,
    seenBy: state.seenBy,
  };
};

/** Wire the canvas, the keys, the mouse, and the loop together. */
Heist.startGame = function startGame() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const audio = Heist.makeAudio();
  let state = Heist.newGame();

  const params = new URLSearchParams(window.location.search);
  const pose = params.get('pose');
  if (pose) Heist.applyPose(state, pose);
  if (params.get('freeze') === '1') state.frozen = true;

  const input = { up: false, down: false, left: false, right: false, sneak: false };

  function startPlaying() {
    if (state.status !== 'title') return;
    state.status = 'playing';
    Heist.audioUnlock(audio);
  }

  function restart() {
    state = Heist.newGame();
    state.status = 'playing';
    if (pose) Heist.applyPose(state, pose);
    if (params.get('freeze') === '1') state.frozen = true;
  }

  function grab() {
    if (state.status !== 'playing') return;
    const item = Heist.grabLoot(state.player, state.level);
    if (item !== null) Heist.audioPickup(audio);
  }

  function fireEmp() {
    if (state.status !== 'playing') return;
    const result = Heist.useEmp(state.player, state.cameras, state.alarm);
    if (result.fired) {
      state.alarm = result.alarm;
      Heist.audioEmp(audio);
    }
  }

  function fireSmoke() {
    if (state.status !== 'playing') return;
    if (Heist.useSmoke(state.player)) Heist.audioSmoke(audio);
  }

  window.addEventListener('keydown', (event) => {
    Heist.audioUnlock(audio);
    const key = event.key;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') input.up = true;
    else if (key === 'ArrowDown' || key === 's' || key === 'S') input.down = true;
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A') input.left = true;
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') input.right = true;
    else if (key === 'Shift') input.sneak = true;
    else if (key === 'e' || key === 'E') grab();
    else if (key === 'q' || key === 'Q') fireEmp();
    else if (key === 'f' || key === 'F') fireSmoke();
    else if (key === 'm' || key === 'M') audio.muted = !audio.muted;
    else if (key === 'Enter') startPlaying();
    else if (key === 'r' || key === 'R') {
      if (state.status === 'won' || state.status === 'caught') restart();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    const key = event.key;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') input.up = false;
    else if (key === 'ArrowDown' || key === 's' || key === 'S') input.down = false;
    else if (key === 'ArrowLeft' || key === 'a' || key === 'A') input.left = false;
    else if (key === 'ArrowRight' || key === 'd' || key === 'D') input.right = false;
    else if (key === 'Shift') input.sneak = false;
  });

  canvas.addEventListener('click', (event) => {
    Heist.audioUnlock(audio);
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    if (state.status === 'title' || state.status === 'won' || state.status === 'caught') {
      const button = state.screenButton;
      if (button && x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
        if (state.status === 'title') startPlaying();
        else restart();
      }
      return;
    }
    for (const tool of state.hudButtons) {
      if (x >= tool.x && x <= tool.x + tool.w && y >= tool.y && y <= tool.y + tool.h) {
        if (tool.id === 'emp') fireEmp();
        else if (tool.id === 'smoke') fireSmoke();
        return;
      }
    }
  });

  // The loop: fixed 1/60 s steps, however fast or slow the frame is.
  const STEP = 1 / 60;
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (!state.frozen) {
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= STEP && steps < 5) {
        Heist.stepGame(state, input, STEP, audio);
        accumulator -= STEP;
        steps++;
      }
      if (steps === 5) accumulator = 0;
    }
    Heist.drawFrame(ctx, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // A handle for playtests: read-only state, never a cheat.
  window.__heist = {
    snapshot: () => Heist.snapshot(state),
    status: () => state.status,
  };
};

document.addEventListener('DOMContentLoaded', Heist.startGame);
