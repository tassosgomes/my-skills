#!/usr/bin/env bash
# Fails when a migration that already exists on the base branch was modified, deleted or renamed.
#
# EF Core does NOT checksum migrations: __EFMigrationsHistory stores only MigrationId and
# ProductVersion. Editing a migration that is already applied drifts silently — the database says
# it ran, the file says something else, and the difference only surfaces on a database recreated
# from scratch. `dotnet ef migrations has-pending-model-changes` does not catch this: it compares
# the model to ModelSnapshot, not the migration to what was applied.
#
# ModelSnapshot is excluded: it is legitimately rewritten by every new migration.
#
# Set BASE_REF when the base branch is not origin/main (release branch, differently named trunk).
# A gate comparing against the wrong base is worse than no gate.
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"

changed=$(git diff --name-status --diff-filter=MDR "$BASE_REF...HEAD" -- '*Migrations/*' \
  | grep -v 'ModelSnapshot\.cs$' || true)

if [ -n "$changed" ]; then
  echo "error: migration files already present on $BASE_REF were changed:"
  echo "$changed"
  echo
  echo "A migration applied outside your machine is immutable — add a new corrective migration."
  echo "If it only ever ran on your machine:"
  echo "  dotnet ef database update <PreviousMigration> && dotnet ef migrations remove"
  exit 1
fi

echo "ok: no migration already on $BASE_REF was changed."
