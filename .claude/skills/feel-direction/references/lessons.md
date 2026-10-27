# Feel lessons

- Check method (Instant): the harness `TEST booster` trace (`t60:...ts1.00,t120:...ts2.80`) is the measured first-apply time of Chrono booster/buffer/debuffer; read it before judging `APPLY_RELOAD`. (2026-10-27)
- Trap (Layered): an `Fx`/`lib.newEffect` spawn inside `drawConfigure` or `draw` runs per render frame and only while selected; its rate scales with FPS. Feel spawns belong in `updateTile`, gated on the real transfer flag. (chrono-pusher.js, 2026-10-27)
- Trap (Muted): a pulse effect whose lifetime is longer than the pulse interval never clears. Compare `Fx.*` lifetime (healBlockFull 20, spawn 30, placeBlock 16 ticks, Mindustry v146 Fx.java) with the block's reload before judging cadence. (chrono-mender.js RELOAD 10, 2026-10-27)
- Trap (Proportional): `Fx.spawn` and `Fx.placeBlock` are Pal.accent build cues shown on every placement; reusing them for a rare payoff (Yuri conversion) makes it read like placing a conveyor. (2026-10-27)
