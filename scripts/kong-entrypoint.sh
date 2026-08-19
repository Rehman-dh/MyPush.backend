#!/bin/sh
# Kong 2.x doesn't expand env vars inside declarative config, so we render
# the template with sed at startup. JWT tokens are base64url (no / + =) so
# using | as the sed delimiter is safe.

set -e

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "ERROR: ANON_KEY and SERVICE_ROLE_KEY must be set on the kong container" >&2
  exit 1
fi

sed \
  -e "s|\${ANON_KEY}|$ANON_KEY|g" \
  -e "s|\${SERVICE_ROLE_KEY}|$SERVICE_ROLE_KEY|g" \
  /home/kong/kong.template.yml > /tmp/kong.yml

echo "[kong-entrypoint] Rendered /tmp/kong.yml — first 5 lines:"
head -5 /tmp/kong.yml

exec /docker-entrypoint.sh kong docker-start
