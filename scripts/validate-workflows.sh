#!/usr/bin/env bash
# validate-workflows.sh — lint all workflow folders for required files and valid JSON
# Usage: bash scripts/validate-workflows.sh [workflows-dir]
set -euo pipefail

WORKFLOWS_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/workflows}"
REQUIRED_FILES=("workflow.json" "README.md" ".env.example" "deploy.sh")
SKIP=("_templates" "references" "scripts" "workflows")

errors=0
checked=0

for dir in "$WORKFLOWS_DIR"/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")

  # Skip non-workflow dirs
  for skip in "${SKIP[@]}"; do
    [ "$name" = "$skip" ] && continue 2
  done

  # Only validate dirs that are meant to be workflows (contain workflow.json or are clearly named)
  # We validate all non-skipped dirs — if they shouldn't be here, move them
  checked=$((checked + 1))
  dir_errors=0

  for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$dir/$file" ]; then
      echo "❌ $name: missing $file"
      dir_errors=$((dir_errors + 1))
      errors=$((errors + 1))
    fi
  done

  # Validate workflow.json is valid JSON
  if [ -f "$dir/workflow.json" ]; then
    if ! jq empty "$dir/workflow.json" 2>/dev/null; then
      echo "❌ $name: workflow.json is not valid JSON"
      dir_errors=$((dir_errors + 1))
      errors=$((errors + 1))
    fi
  fi

  # Validate README.md has minimum content (not just the scaffold stub)
  if [ -f "$dir/README.md" ]; then
    line_count=$(wc -l < "$dir/README.md")
    if [ "$line_count" -lt 5 ]; then
      echo "⚠️  $name: README.md looks empty ($line_count lines)"
    fi
  fi

  [ "$dir_errors" -eq 0 ] && echo "✅ $name"
done

echo ""
echo "Checked $checked workflow(s). Errors: $errors"

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "Fix all errors before committing."
  echo "To scaffold missing files: bash scripts/new-workflow.sh <name>"
  exit 1
fi
