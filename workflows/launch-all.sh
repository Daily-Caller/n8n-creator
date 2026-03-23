#!/usr/bin/env bash
# launch-all.sh — deploy and activate all workflows in all project folders
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$DIR/../.env" ] && { set -a; source "$DIR/../.env"; set +a; }

PASS=0; FAIL=0

for deploy_script in "$DIR"/*/deploy.sh; do
  [ -f "$deploy_script" ] || continue
  PROJECT=$(basename "$(dirname "$deploy_script")")
  echo "==> Deploying: $PROJECT"
  if bash "$deploy_script"; then
    echo "    ✅ $PROJECT deployed"
    ((PASS++))
  else
    echo "    ❌ $PROJECT failed"
    ((FAIL++))
  fi
done

echo ""
echo "Results: $PASS deployed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
