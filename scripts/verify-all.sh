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
run npm run --silent build
test_scripts="$(node -p "Object.keys(require('./package.json').scripts).filter(s=>s.startsWith('test:')).join(' ')")" || {
  echo "FAILED: discover test:* scripts"
  fail=1
  test_scripts=""
}
set -- $test_scripts
if [ "$#" -lt 11 ]; then
  echo "FAILED: expected at least 11 test:* scripts, found $#"
  fail=1
fi
for script in "$@"; do
  run npm run --silent "$script"
done
[ $fail -eq 0 ] && echo "ALL GREEN" || echo "SOME CHECKS FAILED"
exit $fail
