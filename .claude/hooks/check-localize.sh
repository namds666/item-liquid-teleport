#!/bin/bash
# PostToolUse (Edit|Write on scripts/, bundles/, mod.hjson) and Stop hook: refuse to finish while
# any user-facing string lacks a translation in one of the 35 Mindustry languages.
input=$(cat)
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "$root" ] || exit 0
event=$(printf '%s' "$input" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("hook_event_name",""))' 2>/dev/null)
if [ "$event" = "PostToolUse" ]; then
  file=$(printf '%s' "$input" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path","") or d.get("tool_response",{}).get("filePath",""))' 2>/dev/null)
  case "$file" in */scripts/*.js|*/bundles/*.properties|*/mod.hjson) ;; *) exit 0;; esac
fi
if [ "$event" = "Stop" ]; then
  active=$(printf '%s' "$input" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("stop_hook_active",False))' 2>/dev/null)
  [ "$active" = "True" ] && exit 0
fi
out=$(node "$root/tools/check-localize.js" "$root" --quiet 2>&1) && exit 0
echo "$out" >&2
echo "Fix these before finishing: use the localization skill. Every key in bundles/bundle.properties needs a translated value in all 34 bundle_<locale>.properties files, plus item-liquid-teleport.displayName/subtitle/description with the current version prefix. Then rerun: node tools/check-localize.js" >&2
exit 2
