#!/bin/sh
# Nightly backup of the push-notification Postgres DB -> local + S3.
# Runs inside the `cron` container (has postgresql-client + aws-cli).
set -eu

TS=$(date +%Y%m%d-%H%M%S)
FILE="pushnotify-${TS}.dump"
LOCAL="/backups/${FILE}"

log(){ echo "[$(date -Iseconds)] $*"; }
log "starting ${FILE}"

pg_dump -Fc --no-owner --no-privileges > "${LOCAL}.partial"
mv "${LOCAL}.partial" "${LOCAL}"

if ! pg_restore --list "${LOCAL}" >/dev/null 2>&1; then
  log "FATAL: dump failed pg_restore --list integrity check; keeping as .corrupt"
  mv "${LOCAL}" "${LOCAL}.corrupt"
  exit 1
fi
log "dump ok, verified readable ($(du -h "${LOCAL}" | cut -f1))"

if [ -n "${S3_BUCKET:-}" ] && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
  if aws s3 cp "${LOCAL}" "s3://${S3_BUCKET}/${S3_PREFIX}/${FILE}" >/dev/null; then
    log "uploaded s3://${S3_BUCKET}/${S3_PREFIX}/${FILE}"
    # Prune S3: keep 30 newest.
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | awk '{print $4}' | grep '^pushnotify-' \
      | sort -r | tail -n +31 | while read -r old; do
          aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${old}" >/dev/null && log "pruned s3 ${old}"
        done
  else
    log "WARNING: S3 upload failed — local copy retained"
  fi
fi

# Prune local: keep 7 newest.
cd /backups
ls -t pushnotify-*.dump 2>/dev/null | tail -n +8 | while read -r old; do
  rm -f -- "${old}" && log "pruned local ${old}"
done

log "complete"
