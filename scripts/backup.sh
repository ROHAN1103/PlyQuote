#!/bin/sh
# Writes a compressed PostgreSQL dump to ./backups. Run from the project root; schedule with cron.
# Example crontab:  0 2 * * *  cd /opt/pqb && ./scripts/backup.sh >> backups/backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
. ./.env
mkdir -p backups
FILE="backups/pqb-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$FILE"
echo "Backup written: $FILE ($(wc -c < "$FILE") bytes)"
# Keep the 30 most recent dumps.
ls -1t backups/pqb-*.dump 2>/dev/null | tail -n +31 | xargs -r rm --
