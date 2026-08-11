#!/usr/bin/env bash
# One command that reproduces CI. Runs everything, reports every failure,
# then exits non-zero if any failed — CI stops at the first failure, which
# hides the rest.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
run() { echo "── $* ──"; "$@" || { echo "FAILED: $*"; fail=1; }; }

run node scripts/verify-public-surface.mjs
run node scripts/verify-registry-paths.mjs
run npm run --silent lint
npm run --silent build >/dev/null || { echo "FAILED: build"; fail=1; }
for s in $(node -p "Object.keys(require('./package.json').scripts).filter(s=>s.startsWith('test:')).join(' ')"); do
  run npm run --silent "$s"
done
[ $fail -eq 0 ] && echo "ALL GREEN" || echo "SOME CHECKS FAILED"
exit $fail
