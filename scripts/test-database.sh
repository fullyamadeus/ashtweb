#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
asht_test_container="asht-database-test-$$"
trap 'docker rm -f "$asht_test_container" >/dev/null 2>&1 || true' EXIT
docker run --rm -d --name "$asht_test_container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
for attempt in $(seq 1 30); do
  if docker exec "$asht_test_container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -i "$asht_test_container" psql -q -U postgres -v ON_ERROR_STOP=1 < tests/schema-setup.sql
docker exec -i "$asht_test_container" psql -q -U postgres -v ON_ERROR_STOP=1 < supabase/schema.sql
docker exec -i "$asht_test_container" psql -q -U postgres -v ON_ERROR_STOP=1 < supabase/schema.sql
docker exec -i "$asht_test_container" psql -q -U postgres -v ON_ERROR_STOP=1 < tests/schema-check.sql
