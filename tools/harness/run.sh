#!/bin/bash
# Headless smoke test: syncs the mod + harness into the local server, hosts a map,
# and prints the harness verdict. Usage: tools/harness/run.sh [wait-seconds]
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
SRV="$ROOT/tools/server"
MODS="$SRV/config/mods"
if [ -z "${JAVA:-}" ]; then
  JAVA=$(ls -d /Applications/Unity/Hub/Editor/*/PlaybackEngines/AndroidPlayer/OpenJDK/bin/java 2>/dev/null | sort -V | tail -1)
  [ -n "$JAVA" ] || JAVA=$(command -v java || true)
fi
[ -x "${JAVA:-}" ] || { echo "no full JDK found; set JAVA=/path/to/java (the Steam JRE lacks java.logging)"; exit 1; }
WAIT="${1:-75}"
[ -f "$SRV/server-release.jar" ] || { echo "missing $SRV/server-release.jar (gh release download vX -R Anuken/Mindustry -p server-release.jar -D tools/server)"; exit 1; }
mkdir -p "$MODS"
rsync -a --delete --exclude tools --exclude .git --exclude .codegraph --exclude .claude --exclude docs "$ROOT/" "$MODS/item-liquid-teleport/"
rsync -a --delete "$ROOT/tools/harness/mod/" "$MODS/ilt-debug-harness/"
cd "$SRV"
( sleep 3; echo "host Glacier survival"; sleep "$WAIT"; echo "save 9"; sleep 3; echo "stop"; sleep 3; echo "load 9"; sleep 15; echo "exit" ) | "$JAVA" -jar server-release.jar > harness.log 2>&1 || true
sed "s/\x1b\[[0-9;]*m//g" harness.log | grep -E "HARNESS|item-liquid-teleport|outpost|Exception|\[E\]" || { echo "no harness output; tail of log:"; tail -40 harness.log; }
