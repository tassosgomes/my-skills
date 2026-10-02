#!/usr/bin/env bash
# Fails when a versioned Flyway migration that already exists on the base branch was modified,
# deleted or renamed.
#
# Flyway does checksum applied migrations, so an edited V__ file does fail — but only at
# `flyway validate`/`migrate` against a database that already ran it, which means staging or
# production, at deploy time. CI builds a fresh database and never sees the mismatch. This gate
# moves the failure to the pull request.
#
# Repeatable migrations (R__*.sql) are excluded: they are meant to be edited and re-run when
# their checksum changes.
#
# Set BASE_REF when the base branch is not origin/main (release branch, differently named trunk).
# A gate comparing against the wrong base is worse than no gate.
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"

changed=$(git diff --name-status --diff-filter=MDR "$BASE_REF...HEAD" -- '*db/migration/*' \
  | awk '{ print $NF "\t" $0 }' | grep -v '/R__[^/]*'$'\t' | cut -f2- || true)

if [ -n "$changed" ]; then
  echo "error: versioned migrations already present on $BASE_REF were changed:"
  echo "$changed"
  echo
  echo "A migration applied outside your machine is immutable — add a new V__ migration."
  echo "Never run 'flyway repair' to make a checksum mismatch go away: it hides the drift."
  exit 1
fi

echo "ok: no versioned migration already on $BASE_REF was changed."
