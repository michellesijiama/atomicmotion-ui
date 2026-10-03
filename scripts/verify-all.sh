#!/usr/bin/env bash
# Run the repository checks from any directory.
set -euo pipefail
cd "$(dirname "$0")/.."
exec npm run check
