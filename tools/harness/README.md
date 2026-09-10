# Headless test harness

Runs the mod inside the official Mindustry server with a tiny helper mod
(`mod/`) that builds one small scenario per chrono block on the hosted map,
lets the game run 300 ticks, and prints `TEST <name> PASS|FAIL <details>`
per block plus a final `RESULT`.

Covered: mender, unloader, pusher (container and crafter targets), liquid
unloader, liquid pusher, item converter, liquid tiler, item tiler, repair
point, build tower (rebuilds a destroyed wall), booster, buffer, debuffer,
core. `api-types` is informational: it prints how Rhino resolves
field-vs-method names on each Building subclass.

`outpost` and `outpost-small` are long tests: they are checked at tick 1500 (`RESULT-LONG`) because
drones spawn every 300 ticks and copper must reach the core. After that the
runner saves, stops, and reloads the save; tests with a `reload` callback run
again in the reloaded world (`RESULT-RELOAD`): the Outpost must keep its
levels and re-adopt its drones, and removing it must kill them.

Add a test with `test(name, w, h, setup, check, poll?, opts?)` in
`mod/scripts/main.js`; the harness claims a free `w`x`h` area near the core
and passes its origin to the callbacks. `poll` runs every 15 ticks for
values that do not survive until the final check. `opts.long` moves the check
to tick 1500; `opts.reload(state)` returns `[{name, pass, info}]` after the
save/load round trip.

```bash
tools/harness/run.sh          # ~2 min, prints [HARNESS] lines and RESULT / RESULT-LONG / RESULT-RELOAD
```

Setup (one time): download `server-release.jar` for the game build you target
into `tools/server/` (ignored by git):

```bash
gh release download v159.7 -R Anuken/Mindustry -p server-release.jar -D tools/server
```

`run.sh` uses the OpenJDK bundled with Unity's Android module, or `$JAVA`.
The Steam game's JRE lacks `java.logging` and cannot run the server.
Full server output is in `tools/server/harness.log`.

## v8 field-vs-method rule (measured)

When a class has a public field and a method with the same name
(Building/Unit `maxHealth`, `health`, `team`, `x`, `y`, `timer`, `dead`,
`type`, `rotation`, ... and `Block.requirements`, `UnitType.hittable`,
`Floor.edge`), Rhino resolves the name to the **field**, so `b.maxHealth()`
throws. Read the field, or guard with `typeof x.name === "function"`.
Protected fields (`Building.timeScale`) still resolve to the method.
