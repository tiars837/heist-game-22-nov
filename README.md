# Midnight Vault — a one-room heist

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/tiars837/heist-game-22-nov/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/tiars837/heist-game-22-nov/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

One room. One sapphire. Two guards, two cameras, one alarm.

**Midnight Vault** is a complete top-down 2D heist game that runs offline in a
desktop browser from static files — no network, no build step, no assets to
download. You slip into a night museum through the west door, steal the Star
Sapphire from its display case, and get out the east door before the alarm
fills. Three routes cross the room: the bright top corridor, the open middle
hall past the cases, and the dark service corridor along the bottom, where the
alarm climbs half as fast.

## How to play

Open `game/index.html` in a desktop browser (or serve `game/` with any static
server). Keyboard and mouse:

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Shift (hold) | Sneak — slower, harder to spot |
| E | Grab loot in reach |
| Q (or click EMP) | EMP — kills both cameras for 6 s, but the pop raises the alarm |
| F (or click SMOKE) | Smoke bomb — a cloud no eye can see through (one only) |
| M | Mute |
| Enter / R | Start, play again |

Guards patrol fixed loops with amber vision cones; wall cameras sweep red
cones. Being seen raises the alarm meter — faster up close, slower while you
sneak or stand in shadow. At 100% you are caught. The exit stays locked until
the sapphire is yours; gold bars and a jade vase are optional extra loot, and
a fast getaway earns a time bonus.

## Files

- `game/index.html` — the page; `game/src/` holds one job per file:
  `config.js` (tunables), `rng.js` (seeded random), `level.js` (the room),
  `guards.js` (patrols and vision), `cameras.js` (sweeping cones),
  `player.js` (the thief), `tools.js` (EMP and smoke), `audio.js`
  (WebAudio beeps), `render.js` (all drawing), `main.js` (loop and rules).
- `main.ts` — copies `game/` and `screenshots/` to the output directory and
  writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.
- `screenshots/` — real renders of the game's own code.

Entry for the [make.fun best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559).
