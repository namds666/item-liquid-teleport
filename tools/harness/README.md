# Headless test harness

Runs the mod inside the official Mindustry server with a tiny helper mod
(`mod/`) that places a Chrono Mender next to damaged blocks and reports
whether they heal.

```bash
tools/harness/run.sh          # ~30 s, prints [HARNESS] lines and RESULT PASS/FAIL
```

Setup (one time): download `server-release.jar` for the game build you target
into `tools/server/` (ignored by git):

```bash
gh release download v159.7 -R Anuken/Mindustry -p server-release.jar -D tools/server
```

`run.sh` uses the OpenJDK bundled with Unity's Android module, or `$JAVA`.
The Steam game's JRE lacks `java.logging` and cannot run the server.
Full server output is in `tools/server/harness.log`.

## API probe

After setup the harness also calls a list of `PROBE` expressions on live
objects and logs `ok`/`FAIL`. On v8, a public field and a method with the same
name (Building/Unit `maxHealth`, `health`, `team`, `timer`, `dead`, `type`,
`rotation`, ... and `Block.requirements`, `UnitType.hittable`, `Floor.edge`)
resolve to the **field** in Rhino, so `b.maxHealth()` throws. Read the field or
guard with `typeof x.name === "function"`.
