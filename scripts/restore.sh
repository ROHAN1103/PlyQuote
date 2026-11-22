#!/bin/sh
# Restores a dump into the running database. DESTRUCTIVE: replaces current data.
# Usage: ./scripts/restore.sh backups/pqb-20261116-020000.dump [backups/pqb-uploads-20261116-020000.tar]
set -eu
[ $# -ge 1 ] || { echo "Usage: $0 <dump-file> [uploads-tar]" >&2; exit 1; }
cd "$(dirname "$0")/.."
. ./.env
printf "This will REPLACE all data in database '%s'. Type 'restore' to continue: " "$POSTGRES_DB"
read -r answer
[ "$answer" = "restore" ] || { echo "Aborted."; exit 1; }
docker compose stop backend
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner < "$1"
docker compose start backend
if [ $# -ge 2 ]; then
  docker compose exec -T backend tar -C /srv/backend/data -xf - < "$2"
  echo "Uploads restored."
fi
echo "Restore complete."
