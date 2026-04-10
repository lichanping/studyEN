#!/usr/bin/env bash
set -euo pipefail

# One-click rollback for schedule sync feature files.
#
# Default target is HEAD~1 (typically the last commit before sync rollout).
# Example:
#   bash ./scripts/rollback_sync.sh --target HEAD~1 --yes --push

TARGET="HEAD~1"
DRY_RUN="false"
AUTO_YES="false"
PUSH_AFTER="false"

SYNC_FILES=(
  "schedule.html"
  "netlify.toml"
  "netlify/functions/schedule-sync.mjs"
  "package.json"
  "package-lock.json"
  ".gitignore"
  "docs/PRD-schedule-sync.md"
)

usage() {
  cat <<'EOF'
Usage: rollback_sync.sh [options]

Options:
  --target <commit-ish>  Roll back files to this commit (default: HEAD~1)
  --dry-run              Show what would change, do not modify files
  --yes                  Skip confirmation prompt
  --push                 Push rollback commit after commit succeeds
  --help                 Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --yes)
      AUTO_YES="true"
      shift
      ;;
    --push)
      PUSH_AFTER="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository." >&2
  exit 1
fi

if ! git rev-parse --verify "$TARGET" >/dev/null 2>&1; then
  echo "Invalid target commit-ish: $TARGET" >&2
  exit 1
fi

if [[ "$DRY_RUN" != "true" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Working tree is not clean. Commit or stash changes first." >&2
    exit 1
  fi
fi

echo "Rollback target: $TARGET"
echo "Files in scope:"
for f in "${SYNC_FILES[@]}"; do
  echo " - $f"
done

if [[ "$DRY_RUN" == "true" ]]; then
  git --no-pager diff --stat "$TARGET" -- "${SYNC_FILES[@]}" || true
  echo
  echo "Detailed diff:"
  git --no-pager diff "$TARGET" -- "${SYNC_FILES[@]}" || true
  echo "Dry run finished."
  exit 0
fi

if [[ "$AUTO_YES" != "true" ]]; then
  read -r -p "Proceed with rollback and create commit? [y/N] " ans
  if [[ ! "$ans" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
  fi
fi

for f in "${SYNC_FILES[@]}"; do
  if git cat-file -e "$TARGET:$f" 2>/dev/null; then
    git restore --source "$TARGET" -- "$f"
  else
    rm -f "$f"
  fi
done

git add -A -- "${SYNC_FILES[@]}" 2>/dev/null || true

if git diff --cached --quiet; then
  echo "No rollback changes detected. Nothing to commit."
  exit 0
fi

git commit -m "rollback(sync): restore schedule sync files to $TARGET"

echo "Rollback commit created."

if [[ "$PUSH_AFTER" == "true" ]]; then
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  git push origin "$current_branch"
  echo "Pushed to origin/$current_branch"
fi

