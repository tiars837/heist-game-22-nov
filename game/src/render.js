// render.js — everything the eye sees: the night museum, the cones, the
// thief, and the HUD. One draw call per frame, in layers: floor, shadow,
// walls and cases, loot and doors, cones, people and cameras, smoke,
// then the HUD and any screen (title, win, caught) on top.

window.Heist = window.Heist || {};

/** A vision cone wedge from (x, y) along `angle`, out to `range`. */
Heist.drawCone = function drawCone(ctx, x, y, angle, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

/** The museum floor: dark tiles with a faint grid, like marble at night. */
Heist.drawFloor = function drawFloor(ctx) {
  const C = Heist.Config.COLORS;
  const W = Heist.Config.CANVAS_W;
  const H = Heist.Config.CANVAS_H;
  const T = Heist.Config.HUD_H;
  const tile = 40;
  for (let ty = T; ty < H; ty += tile) {
    for (let tx = 0; tx < W; tx += tile) {
      const even = ((tx / tile) | 0) % 2 === ((ty / tile) | 0) % 2;
      ctx.fillStyle = even ? C.floorA : C.floorB;
      ctx.fillRect(tx, ty, tile, tile);
    }
  }
  ctx.strokeStyle = C.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let tx = 0; tx <= W; tx += tile) {
    ctx.moveTo(tx + 0.5, T);
    ctx.lineTo(tx + 0.5, H);
  }
  for (let ty = T; ty <= H; ty += tile) {
    ctx.moveTo(0, ty + 0.5);
    ctx.lineTo(W, ty + 0.5);
  }
  ctx.stroke();
};

/** Shadow zones: darker floor where the alarm climbs half as fast. */
Heist.drawShadows = function drawShadows(ctx, level) {
  const C = Heist.Config.COLORS;
  for (const zone of level.shadows) {
    ctx.fillStyle = C.shadow;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeStyle = C.shadowEdge;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1;
    ctx.strokeRect(zone.x + 0.5, zone.y + 0.5, zone.w - 1, zone.h - 1);
    ctx.setLineDash([]);
  }
};

/** Walls with a gold inner edge, like a museum's wainscot. */
Heist.drawWalls = function drawWalls(ctx, level) {
  const C = Heist.Config.COLORS;
  for (const wall of level.walls) {
    ctx.fillStyle = C.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = C.wallEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.w - 1, wall.h - 1);
  }
};

/** Display cases: glass boxes on brass frames. */
Heist.drawCases = function drawCases(ctx, level) {
  const C = Heist.Config.COLORS;
  for (const box of level.cases) {
    ctx.fillStyle = C.caseGlass;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = C.caseFrame;
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x + 1.5, box.y + 1.5, box.w - 3, box.h - 3);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(box.x + 6, box.y + box.h - 6);
    ctx.lineTo(box.x + box.w - 14, box.y + 6);
    ctx.stroke();
  }
};

/** One loot item, glowing so it reads at a glance. */
Heist.drawLoot = function drawLoot(ctx, item, time) {
  if (item.taken) return;
  const pulse = 0.75 + 0.25 * Math.sin(time * 3 + item.x);
  ctx.save();
  ctx.shadowColor = item.color;
  ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = item.color;
  if (item.id === 'gem') {
    // A cut diamond, slowly turning in its case light.
    const r = 11 + 2 * pulse;
    const cx = item.x;
    const cy = item.y;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.8, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.8, cy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.4, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.4, cy + r * 0.4);
    ctx.stroke();
  } else if (item.id === 'gold') {
    ctx.fillRect(item.x - 10, item.y - 5, 20, 10);
    ctx.fillRect(item.x - 7, item.y - 11, 14, 7);
  } else {
    ctx.beginPath();
    ctx.ellipse(item.x, item.y, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(item.name.toUpperCase(), item.x, item.y - 20);
};

/** The entry door (left) and the exit door (right, shut until the gem). */
Heist.drawDoors = function drawDoors(ctx, level, hasGem) {
  const C = Heist.Config.COLORS;
  // The doors are only 14 px wide, so their labels run vertically.
  const verticalLabel = (door, text, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.save();
    ctx.translate(door.x + door.w / 2, door.y + door.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#0b1526';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
  verticalLabel(level.entry, 'IN', C.entry);
  verticalLabel(level.exit, hasGem ? 'OUT' : 'LOCK', hasGem ? C.exit : '#5a6274');
  if (!hasGem) {
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('EXIT LOCKED — TAKE THE STAR SAPPHIRE', 1120, 200);
  }
};

/** A guard: navy uniform, cap, facing tick, and a "!" when it sees you. */
Heist.drawGuard = function drawGuard(ctx, guard) {
  const C = Heist.Config.COLORS;
  const bob = Math.sin(guard.stride * 0.09) * 1.5;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob * 0.3);
  ctx.fillStyle = C.guard;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.guardCap;
  ctx.beginPath();
  ctx.arc(0, -3, 8, Math.PI, Math.PI * 2);
  ctx.fill();
  // Facing tick.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(guard.angle) * 18, Math.sin(guard.angle) * 18);
  ctx.stroke();
  ctx.restore();
  if (guard.seeing) {
    ctx.fillStyle = '#ff5b4d';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - 22);
  }
};

/** A wall camera: a grey box with a red lens; grey and crossed when EMP'd. */
Heist.drawCamera = function drawCamera(ctx, camera) {
  const C = Heist.Config.COLORS;
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.rotate(camera.angle);
  ctx.fillStyle = camera.disabled > 0 ? '#3a3f4a' : C.cameraBody;
  ctx.fillRect(-4, -6, 14, 12);
  ctx.fillStyle = camera.disabled > 0 ? '#888888' : '#ff4040';
  ctx.beginPath();
  ctx.arc(11, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (camera.disabled > 0) {
    ctx.strokeStyle = '#ffdd55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(camera.x - 8, camera.y - 8);
    ctx.lineTo(camera.x + 8, camera.y + 8);
    ctx.moveTo(camera.x + 8, camera.y - 8);
    ctx.lineTo(camera.x - 8, camera.y + 8);
    ctx.stroke();
  }
};

/** The thief: a hooded figure, low and quick, with a dashed ring while sneaking. */
Heist.drawPlayer = function drawPlayer(ctx, player, time) {
  const C = Heist.Config.COLORS;
  const crouch = player.sneaking ? 0.8 : 1;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = C.playerHood;
  ctx.beginPath();
  ctx.arc(0, 0, 12 * crouch + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.player;
  ctx.beginPath();
  ctx.arc(Math.cos(player.angle) * 3, Math.sin(player.angle) * 3, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** Smoke clouds: soft grey puffs that hide the thief inside them. */
Heist.drawSmoke = function drawSmoke(ctx, player, time) {
  for (const cloud of player.smokeClouds) {
    const alpha = Math.min(0.75, cloud.left);
    ctx.fillStyle = 'rgba(180, 190, 205, ' + alpha.toFixed(2) + ')';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + time * 0.4;
      const r = cloud.radius * 0.55;
      ctx.beginPath();
      ctx.arc(cloud.x + Math.cos(a) * r * 0.6, cloud.y + Math.sin(a) * r * 0.6, cloud.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

/** The HUD bar: objective, alarm meter, loot, time, and the tool buttons. */
Heist.drawHud = function drawHud(ctx, state) {
  const C = Heist.Config.COLORS;
  const W = Heist.Config.CANVAS_W;
  const H = Heist.Config.HUD_H;
  ctx.fillStyle = C.hudBg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#2a3247';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 0.5);
  ctx.lineTo(W, H - 0.5);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = C.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MIDNIGHT VAULT', 12, H / 2 - 8);
  ctx.fillStyle = C.hudDim;
  ctx.font = '11px sans-serif';
  const objective = state.player.hasGem
    ? 'GET OUT — reach the green door'
    : 'STEAL the Star Sapphire (E to grab)';
  ctx.fillText(objective, 12, H / 2 + 10);

  // Alarm meter in the middle.
  const alarm = state.alarm;
  const meterX = 470;
  const meterW = 300;
  const meterY = 12;
  ctx.fillStyle = C.hudText;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', meterX, meterY + 6);
  ctx.fillStyle = '#232c42';
  ctx.fillRect(meterX + 58, meterY, meterW, 16);
  const alarmColor = alarm < 40 ? C.alarmLow : alarm < 70 ? C.alarmMid : C.alarmHigh;
  ctx.fillStyle = alarmColor;
  ctx.fillRect(meterX + 58, meterY, (meterW * alarm) / 100, 16);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(meterX + 57.5, meterY + 0.5, meterW + 1, 15);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(alarm) + '%', meterX + 58 + meterW / 2, meterY + 8);
  if (alarm >= 70) {
    ctx.fillStyle = C.alarmHigh;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.seenBy ? 'SPOTTED!' : 'THEY ARE COMING', meterX + 58, meterY + 28);
  }

  // Loot and time on the right of the meter.
  ctx.textAlign = 'left';
  ctx.fillStyle = C.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('LOOT $' + state.player.lootValue.toLocaleString('en-US'), 850, H / 2 - 8);
  ctx.fillStyle = C.hudDim;
  ctx.font = '11px sans-serif';
  const seconds = Math.floor(state.time);
  const clock = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  ctx.fillText('TIME ' + clock, 850, H / 2 + 10);

  // Tool buttons: clickable with the mouse, Q and F on the keyboard.
  const buttons = [];
  const buttonDefs = [
    { id: 'emp', label: 'EMP  [Q]', count: state.player.empCharges, x: 1000, enabled: state.player.empCharges > 0 },
    { id: 'smoke', label: 'SMOKE  [F]', count: state.player.smokeCharges, x: 1120, enabled: state.player.smokeCharges > 0 },
  ];
  for (const def of buttonDefs) {
    const rect = { x: def.x, y: 7, w: 108, h: 32 };
    ctx.fillStyle = def.enabled ? '#2c3a5e' : '#1a2030';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = def.enabled ? '#7fa0ff' : '#3a4358';
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
    ctx.fillStyle = def.enabled ? '#e8e4d8' : '#6a7488';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.label + ' x' + def.count, rect.x + rect.w / 2, rect.y + rect.h / 2);
    buttons.push({ id: def.id, x: rect.x, y: rect.y, w: rect.w, h: rect.h });
  }
  state.hudButtons = buttons;
};

/** A dark overlay panel with a title, lines of text, and one button. */
Heist.drawPanel = function drawPanel(ctx, title, lines, buttonLabel, state) {
  const C = Heist.Config.COLORS;
  const W = Heist.Config.CANVAS_W;
  const H = Heist.Config.CANVAS_H;
  ctx.fillStyle = 'rgba(8, 11, 20, 0.82)';
  ctx.fillRect(0, 0, W, H);
  const panelW = 640;
  const panelH = 300;
  const px = (W - panelW) / 2;
  const py = (H - panelH) / 2;
  ctx.fillStyle = '#141a2a';
  ctx.fillRect(px, py, panelW, panelH);
  ctx.strokeStyle = C.wallEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, panelW - 2, panelH - 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.hudText;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(title, W / 2, py + 52);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = C.hudDim;
  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, py + 96 + i * 24);
  });
  const button = { x: W / 2 - 90, y: py + panelH - 62, w: 180, h: 40 };
  ctx.fillStyle = '#2c3a5e';
  ctx.fillRect(button.x, button.y, button.w, button.h);
  ctx.strokeStyle = '#7fa0ff';
  ctx.lineWidth = 1;
  ctx.strokeRect(button.x + 0.5, button.y + 0.5, button.w - 1, button.h - 1);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(buttonLabel, W / 2, button.y + 21);
  state.screenButton = button;
};

/** One whole frame: the room, everyone in it, the HUD, and any screen. */
Heist.drawFrame = function drawFrame(ctx, state) {
  const C = Heist.Config.COLORS;
  const CFG = Heist.Config;
  ctx.clearRect(0, 0, Heist.Config.CANVAS_W, Heist.Config.CANVAS_H);
  Heist.drawFloor(ctx);
  Heist.drawShadows(ctx, state.level);
  Heist.drawWalls(ctx, state.level);
  Heist.drawCases(ctx, state.level);
  for (const item of state.level.loot) Heist.drawLoot(ctx, item, state.time);
  Heist.drawDoors(ctx, state.level, state.player.hasGem);

  // Cones first, so people draw on top of them.
  for (const guard of state.guards) {
    Heist.drawCone(ctx, guard.x, guard.y, guard.angle, CFG.GUARD_RANGE, CFG.GUARD_HALF_ANGLE, C.coneGuard, C.coneGuardEdge);
  }
  for (const camera of state.cameras) {
    if (camera.disabled <= 0) {
      Heist.drawCone(ctx, camera.x, camera.y, camera.angle, camera.range, CFG.CAMERA_HALF_ANGLE, C.coneCamera, C.coneCameraEdge);
    }
  }
  for (const guard of state.guards) Heist.drawGuard(ctx, guard);
  for (const camera of state.cameras) Heist.drawCamera(ctx, camera);
  Heist.drawSmoke(ctx, state.player, state.time);
  if (state.status === 'playing' || state.status === 'caught' || state.status === 'won') {
    Heist.drawPlayer(ctx, state.player, state.time);
  }
  Heist.drawHud(ctx, state);

  if (state.status === 'title') {
    Heist.drawPanel(
      ctx,
      'MIDNIGHT VAULT',
      [
        'One room. One sapphire. Two guards, two cameras, one alarm.',
        'WASD / arrows to move — hold SHIFT to sneak.',
        'E grabs loot. Q fires the EMP (cameras go dark, but loud).',
        'F drops smoke. Click the HUD buttons too. M mutes.',
        'Dark floor hides you. The exit opens only with the sapphire.',
      ],
      'START THE HEIST  [Enter]',
      state,
    );
  } else if (state.status === 'won') {
    Heist.drawPanel(
      ctx,
      'CLEAN GETAWAY',
      [
        'Loot: $' + state.player.lootValue.toLocaleString('en-US') + '  —  Time: ' + state.timeText,
        'Score: ' + state.score.toLocaleString('en-US'),
        'The sapphire is yours. The museum never saw you leave.',
      ],
      'PLAY AGAIN  [R]',
      state,
    );
  } else if (state.status === 'caught') {
    Heist.drawPanel(
      ctx,
      'CAUGHT',
      [
        'The alarm hit 100%. The guards found you by the cases.',
        'Loot kept: $' + state.player.lootValue.toLocaleString('en-US'),
        'Read the cones before you move — the dark corridor is safest.',
      ],
      'TRY AGAIN  [R]',
      state,
    );
  }

  // A red pulse at the screen's edge while the alarm is high.
  if (state.status === 'playing' && state.alarm >= 70) {
    const pulse = 0.12 + 0.08 * Math.sin(state.time * 6);
    ctx.strokeStyle = 'rgba(231, 76, 60, ' + pulse.toFixed(2) + ')';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, Heist.Config.CANVAS_W - 10, Heist.Config.CANVAS_H - 10);
  }
};
