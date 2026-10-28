# Feel lessons

- Check method (Instant): the harness `TEST booster` trace (`t60:...ts1.00,t120:...ts2.80`) is the measured first-apply time of Chrono booster/buffer/debuffer; read it before judging `APPLY_RELOAD`. (2026-10-27)
- Trap (Layered): an `Fx`/`lib.newEffect` spawn inside `drawConfigure` or `draw` runs per render frame and only while selected; its rate scales with FPS. Feel spawns belong in `updateTile`, gated on the real transfer flag. (chrono-pusher.js, 2026-10-27)
- Trap (Muted): a pulse effect whose lifetime is longer than the pulse interval never clears. Compare `Fx.*` lifetime (healBlockFull 20, spawn 30, placeBlock 16 ticks, Mindustry v146 Fx.java) with the block's reload before judging cadence. (chrono-mender.js RELOAD 10, 2026-10-27)
- Trap (Proportional): `Fx.spawn` and `Fx.placeBlock` are Pal.accent build cues shown on every placement; reusing them for a rare payoff (Yuri conversion) makes it read like placing a conveyor. (2026-10-27)
- Trap (Settle): a `moveToSpeed(target, c, smooth, speed)` approach whose `c` equals the hysteresis exit radius only decays toward it (speed scales with `d - c`), so the `approaching` flag may never clear and the drone creeps. Aim at least 1 tile inside the exit radius, clamped at 0. (outpost.js spot hold, 2026-10-28)
- Trap (Instant): a "spot too small, repick" check that compares group size to beam count loops every tick when the fallback group is smaller by design; key the repick on a stored `want` changing instead. (outpost.js pickSpot, 2026-10-28)
