#!/bin/bash
# Blocks `git commit` when bundle_zh_CN subtitle does not carry the mod.hjson version.
cmd=$(python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)
case "$cmd" in *"git commit"*) ;; *) exit 0;; esac
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
version=$(sed -nE 's/^ *version: *"([^"]+)".*/\1/p' "$root/mod.hjson")
zh=$(sed -nE 's/^item-liquid-teleport\.subtitle *= *//p' "$root/bundles/bundle_zh_CN.properties")
if [ -n "$version" ] && [[ "$zh" != v"$version"* ]]; then
  echo "bundles/bundle_zh_CN.properties: item-liquid-teleport.subtitle is '$zh' but mod.hjson version is $version. Translate the new subtitle/description from mod.hjson (start with v$version:) before committing." >&2
  exit 2
fi
