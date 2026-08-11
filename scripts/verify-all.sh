#!/usr/bin/env bash
# One command that reproduces CI. Runs everything, reports every failure,
# then exits non-zero if any failed — CI stops at the first failure, which
# hides the rest.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
run() { echo "── $* ──"; "$@" || { echo "FAILED: $*"; fail=1; }; }

APP=atomicmotion-ui
[ -f package.json ] && APP=.        # post-flatten layout

run node scripts/verify-public-surface.mjs
run node scripts/verify-registry-paths.mjs
( cd "$APP" && npm run --silent lint ) || { echo "FAILED: lint"; fail=1; }
( cd "$APP" && npm run --silent build >/dev/null ) || { echo "FAILED: build"; fail=1; }
for s in $(cd "$APP" && node -p "Object.keys(require('./package.json').scripts).filter(s=>s.startsWith('test:')).join(' ')"); do
  ( cd "$APP" && npm run --silent "$s" ) || { echo "FAILED: $s"; fail=1; }
done
[ $fail -eq 0 ] && echo "ALL GREEN" || echo "SOME CHECKS FAILED"
exit $fail
