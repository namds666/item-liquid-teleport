---
name: feel-direction
description: >-
  Item Liquid Teleport's brief for the game-feel-director: this Mindustry
  mod's pillars, lens checks, evidence, gates, crew, routing and limits.
  Loaded by the game-feel-director agent after game-feel-craft. Also load
  before any change to effects, timing, beams, sounds or shake in scripts/, or
  when the user says "feel review", "game feel", "it feels slow", "juice".
---

# Feel brief

## Project

- Game: Item Liquid Teleport, a Mindustry JS mod (Chrono blocks, Outpost family, Yuri units). Behavior and effects live in `scripts/*.js`.
- Engine: Mindustry v8 (build 159.7 harness target, `minGameVersion` 146), Rhino JS. 60 ticks per second; timings in code are ticks.
- Platform: desktop only, mouse and keys. No haptics.

## Pillars

- Chrono blocks are cheat-grade by design: fast and strong is intended. Never flag power level or balance. (owner, director-setup 2026-10-27)
- The Outpost family stays vanilla-balanced. Its feel must match vanilla drone bases. (owner, director-setup 2026-10-27)
- No new UI screens: UI motion only inside vanilla dialogs and tables. (owner, director-setup 2026-10-27)

## Lenses

- Instant: a player action (link tap, config, build order) must answer in the same or next tick. Batch and scan timers: `APPLY_RELOAD` (`chrono-boost-rules.js`), 5-tick link batches (unloader, pusher), `IDLE_SCAN_INTERVAL` (`chrono-build-tower.js`), `TILE_INTERVAL` (tilers).
- Layered: each block action shows a beam, effect or bar change. Effects: `lib.newEffect` (`scripts/lib.js:543`) and `Fx.*` uses in `scripts/chrono-*.js`, `hypno-yuri.js`, `outpost.js`.
- Proportional: effect size and intensity follow the action size (one link vs 2000 links, 1x1 vs merged 2x2 blocks).
- Readable: the player sees which target a beam or tether hits (Yuri tether, repair beam, build tower beams).
- Muted: many Chrono blocks run at once with global range; effects must not flood the screen.
- Screen size: effect sizes in world units; 8 world units = 1 tile.
- Data: timing and size values are constants at the top of each script.

## Evidence

- Code only. No in-game frames or video: read the constants and draw code, and give findings as `scripts/<file>.js CONSTANT = value`.
- Headless numbers: `tools/harness/run.sh` output (`tools/server/harness.log`) shows build, convert and delivery ticks per test; the main loop runs it, the director reads the latest log.
- When a judgment needs a real frame or clip, write a `LOOK` line for the owner with what to capture.

## Gates

- Read `tools/server/harness.log` lines with `[HARNESS] TEST` and `RESULT`.

## Crew

- `art-director` for effect color and look.
- No `audio-director` or `animator` in this repo.

## Routing

| Finding | Owner |
| --- | --- |
| Timing, interval, effect size constant | main loop: the block script in `scripts/` |
| Effect color or sprite look | `art-director` |
| Harness proof for a timing change | main loop: `tools/harness/mod/scripts/main.js` |

## Writes

`references/lessons.md`, `references/sources.md`. The ledger `.claude/feel-ledger.md` is the main loop's.

## Never

- Never edit `scripts/`, `sprites/`, `bundles/`, `mod.hjson` or `tools/`.
- Never run `git commit`, `git push` or `tools/harness/run.sh`.
