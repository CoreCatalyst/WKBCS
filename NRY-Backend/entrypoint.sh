#!/bin/bash
set -e

echo "⏳ Running Alembic database migrations..."
alembic upgrade head

echo "✅ Migrations complete. Starting application..."
exec "$@"
