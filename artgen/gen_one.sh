#!/usr/bin/env bash
# Usage: artgen/gen_one.sh <char> <pose> [ref1] [ref2...]
set -euo pipefail
cd /workspace/fiiight
char="$1"; pose="$2"; shift 2 || true
name="${char}_${pose}"
prompt="artgen/prompts/${name}.txt"
log="artgen/logs/${name}.log"
mkdir -p artgen/logs
args=(exec --skip-git-repo-check -s danger-full-access -C /workspace/fiiight)
for r in "$@"; do
  [ -f "$r" ] && args+=(-i "$r")
done
echo "[$name] start $(date -Iseconds)" | tee -a artgen/logs/_done.log
set +e
cat "$prompt" | codex "${args[@]}" - >"$log" 2>&1
ec=$?
set -e
echo "[$name] exit $ec $(date -Iseconds)" | tee -a artgen/logs/_done.log
# verify
if [ -f "content/chars/$char/art/${pose}.png" ]; then
  echo "[$name] OK art exists"
else
  echo "[$name] MISSING art — check $log" >&2
fi
exit $ec
