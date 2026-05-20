#!/bin/sh
set -e
echo "[startup] Running database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy --schema ./prisma/schema.prisma
echo "[startup] Starting server..."
exec node server.js
