#!/bin/bash
# PostToolUse (Edit|Write on scripts/*.js) and Stop hook: refuse to finish while any
# block or unit is not available in campaign. Exit 2 feeds the violations back to Claude.
input=$(cat)
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "$root" ] || exit 0
event=$(printf '%s' "$input" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("hook_event_name",""))' 2>/dev/null)
if [ "$event" = "PostToolUse" ]; then
  file=$(printf '%s' "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path","") or d.get("tool_response",{}).get("filePath",""))' 2>/dev/null)
  case "$file" in */scripts/*.js) ;; *) exit 0;; esac
fi
if [ "$event" = "Stop" ]; then
  active=$(printf '%s' "$input" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("stop_hook_active",False))' 2>/dev/null)
  [ "$active" = "True" ] && exit 0
fi
out=$(node "$root/tools/check-campaign.js" "$root" --quiet 2>&1) && exit 0
echo "$out" >&2
echo "Fix these before finishing: every block needs alwaysUnlocked = true, buildVisibility = BuildVisibility.shown, lib.enableAllEnvironments(); every unit needs alwaysUnlocked = true; every script must be in scripts/main.js. Then rerun: node tools/check-campaign.js" >&2
exit 2
