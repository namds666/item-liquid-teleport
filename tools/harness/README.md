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
