"""
Alembic migration environment configuration for Noryvanta Business Marketplace.

This env.py supports both:
  - Synchronous migrations run from the CLI (alembic upgrade head)
  - Async SQLAlchemy engine (asyncpg / aiosqlite) via run_async_migrations()

DATABASE_URL is read from the environment (same as FastAPI app).
For local dev SQLite, aiosqlite is used.
For production PostgreSQL, asyncpg is used.
"""

import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ── Add backend root to path so app.* imports resolve ─────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all models so Alembic can detect them via metadata
from app.core.database import Base  # noqa: E402
from app.core.config import settings  # noqa: E402
import app.models  # noqa: E402, F401 — registers all model classes with Base

# ── Alembic config object ──────────────────────────────────────────────────────
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Use our SQLAlchemy metadata for autogenerate support
target_metadata = Base.metadata

# ── Resolve DATABASE_URL ───────────────────────────────────────────────────────
def get_url() -> str:
    """Return a sync-compatible URL for Alembic's connection.

    Alembic runs synchronous migrations even when the app uses async SQLAlchemy.
    We convert asyncpg → psycopg2 and aiosqlite → sqlite for the migration runner.
    """
    url = settings.DATABASE_URL
    # Async drivers → sync equivalents for Alembic CLI
    url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    url = url.replace("sqlite+aiosqlite:///", "sqlite:///")
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL to stdout, no DB connection)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations using an async engine (asyncpg / aiosqlite)."""
    config_section = config.get_section(config.config_ini_section, {})
    custom_url = config.get_main_option("sqlalchemy.url")
    target_url = custom_url if custom_url else settings.DATABASE_URL
    if target_url.startswith("sqlite:///") and not target_url.startswith("sqlite+aiosqlite:///"):
        target_url = target_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    elif target_url.startswith("postgresql://") and not target_url.startswith("postgresql+asyncpg://"):
        target_url = target_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    config_section["sqlalchemy.url"] = target_url

    connectable = async_engine_from_config(
        config_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connect to DB and apply changes)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
