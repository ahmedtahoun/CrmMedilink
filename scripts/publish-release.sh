#!/usr/bin/env bash
# Build the app and publish it to the `release` branch, which cPanel Git
# Version Control clones straight into /home/wukxvrqncc/crm.medilink360.ai.
#
# The `release` branch holds ONLY the flat static build at repo root
# (index.html, assets/, favicon.svg, .htaccess) — no source, no app/.
#
# Usage:  ./scripts/publish-release.sh "what changed"
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MSG="${1:-release build}"
START_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# 1. clean build from the current (source) branch
npm --prefix app ci --silent 2>/dev/null || npm --prefix app install --silent
npm --prefix app run build

# 2. stage the build output somewhere safe
TMP="$(mktemp -d)"
cp -R app/dist/. "$TMP"/

# 3. swap to release, replace its contents with the build
git fetch origin release --quiet || true
git checkout release
git rm -rqf . 2>/dev/null || true
cp -R "$TMP"/. .
rm -rf "$TMP"

cat > .gitignore <<'EOF'
/app/
/design_handoff_medilink360/
/.claude/
node_modules
.DS_Store
*.log
"Prototype proposal for manager.zip"
EOF

git add -A
if git diff --cached --quiet; then
  echo "No build changes — nothing to publish."
else
  git commit -m "release: $MSG"
  echo
  echo "Committed to 'release'. Push it and deploy:"
  echo "  git push origin release"
  echo "  # then cPanel > Git Version Control > Manage > Update from Remote"
fi

git checkout "$START_BRANCH"
