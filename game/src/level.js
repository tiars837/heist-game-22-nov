// level.js — the one room of the museum and everything solid inside it.
// The room is a night museum with three ways across: the bright top
// corridor, the open middle hall past the display cases, and the dark
// service corridor along the bottom. Walls block movement and sight;
// shadow zones slow the alarm; display cases block both.

window.Heist = window.Heist || {};

/** An axis-aligned rectangle: { x, y, w, h }. */
Heist.rect = function rect(x, y, w, h) {
  return { x: x, y: y, w: w, h: h };
};

/** Whether two rectangles overlap. */
Heist.rectsOverlap = function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
};

/** Whether a circle (cx, cy, r) touches a rectangle. */
Heist.circleHitsRect = function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
};

/** Whether point (x, y) sits inside a rectangle. */
Heist.pointInRect = function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
};

/**
 * The museum floor plan. Coordinates are canvas pixels; the HUD occupies
 * y 0..HUD_H and the play area runs HUD_H..CANVAS_H.
 */
Heist.buildLevel = function buildLevel() {
  const C = Heist.Config;
  const W = C.CANVAS_W;
  const H = C.CANVAS_H;
  const T = C.HUD_H;
  const t = C.WALL;

  // Solid walls. The left wall leaves the entry gap, the right wall the
  // exit gap; the two inner walls leave doorways between the three routes.
  const walls = [
    Heist.rect(0, T, W, t), // top wall, under the HUD
    Heist.rect(0, H - t, W, t), // bottom wall
    Heist.rect(0, T, t, 164 - T), // left wall, upper part
    Heist.rect(0, 274, t, H - 274 - t), // left wall, lower part (entry gap 164..274)
    Heist.rect(W - t, T, t, 164 - T), // right wall, upper part
    Heist.rect(W - t, 274, t, H - 274 - t), // right wall, lower part (exit gap 164..274)
    Heist.rect(t, 150, 746, t), // hall ceiling, left stretch (doorway 760..1000)
    Heist.rect(1000, 150, W - t - 1000, t), // hall ceiling, right stretch
    Heist.rect(420, 330, 580, t), // service corridor ceiling (doorways 14..420 and 1000..1266)
    Heist.rect(880, 164, 16, 120), // pillar wall splitting the hall's right side
  ];

  // Display cases: solid glass boxes that block movement and sight.
  const cases = [
    Heist.rect(470, 196, 84, 46),
    Heist.rect(700, 252, 84, 46),
    Heist.rect(940, 188, 84, 46),
    Heist.rect(300, 250, 70, 40),
  ];

  // Shadow: the service corridor and two unlit patches of the hall.
  // Standing in shadow halves how fast the alarm rises.
  const shadows = [
    Heist.rect(t, 344, W - 2 * t, H - t - 344),
    Heist.rect(430, 176, 130, 96),
    Heist.rect(1010, 196, 150, 96),
  ];

  // Loot. The Star Sapphire is the job: the exit stays shut without it.
  const loot = [
    { id: 'gem', name: 'Star Sapphire', x: 512, y: 219, value: C.GEM_VALUE, required: true, taken: false, color: C.COLORS.gem },
    { id: 'gold', name: 'Gold bars', x: 620, y: 430, value: C.GOLD_VALUE, required: false, taken: false, color: C.COLORS.gold },
    { id: 'vase', name: 'Jade vase', x: 180, y: 110, value: C.VASE_VALUE, required: false, taken: false, color: C.COLORS.vase },
  ];

  const entry = { x: 7, y: 219, w: 14, h: 55 };
  const exit = { x: W - 14, y: 219, w: 14, h: 55 };

  // Guard patrols: fixed loops, so a route can be planned and rehearsed.
  const guardRoutes = [
    // Hall guard: a rectangle loop around the gem case, clear of the cases.
    [
      { x: 450, y: 290 },
      { x: 450, y: 182 },
      { x: 850, y: 182 },
      { x: 850, y: 310 },
    ],
    // Corridor guard: back and forth along the dark service corridor's
    // west half, leaving the east stretch — and the right doorway — to
    // a thief who timed the patrol right.
    [
      { x: 180, y: 406 },
      { x: 700, y: 406 },
    ],
  ];

  // Cameras on the walls, sweeping fixed arcs.
  const cameraMounts = [
    { x: 880, y: T + t, baseAngle: Math.PI / 2, sweep: 0.85, range: C.CAMERA_RANGE },
    { x: W - t, y: 150, baseAngle: Math.PI, sweep: 0.7, range: C.CAMERA_RANGE },
  ];

  return {
    walls: walls,
    cases: cases,
    shadows: shadows,
    loot: loot,
    entry: entry,
    exit: exit,
    guardRoutes: guardRoutes,
    cameraMounts: cameraMounts,
    solids: walls.concat(cases),
  };
};

/** Whether a circle at (x, y) with radius r fits without hitting a solid. */
Heist.fitsAt = function fitsAt(level, x, y, r) {
  for (const solid of level.solids) {
    if (Heist.circleHitsRect(x, y, r, solid)) return false;
  }
  return true;
};

/** Whether point (x, y) is inside a shadow zone. */
Heist.inShadow = function inShadow(level, x, y) {
  for (const zone of level.shadows) {
    if (Heist.pointInRect(x, y, zone)) return true;
  }
  return false;
};

/**
 * Whether the segment from (x1, y1) to (x2, y2) is blocked by a solid.
 * Sampled along its length: walls and cases are rectangles, so a short
 * step never jumps over one.
 */
Heist.sightBlocked = function sightBlocked(level, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const px = x1 + (dx * i) / steps;
    const py = y1 + (dy * i) / steps;
    for (const solid of level.solids) {
      if (Heist.pointInRect(px, py, solid)) return true;
    }
  }
  return false;
};

/** The nearest loot within reach of (x, y), or null. */
Heist.lootInReach = function lootInReach(level, x, y) {
  const C = Heist.Config;
  for (const item of level.loot) {
    if (item.taken) continue;
    if (Math.hypot(item.x - x, item.y - y) <= C.INTERACT_RANGE + 8) return item;
  }
  return null;
};

/** Whether the thief stands in the exit doorway. */
Heist.atExit = function atExit(level, x, y) {
  return Heist.pointInRect(x, y, level.exit);
};
