# Noryvanta PostgreSQL / Supabase Database Architecture

Please see the comprehensive database specification in [supabase/database.md](file:///f:/PROJECT/Project/Noryvanta_Web/supabase/database.md).

### Core Features
- Full relational schema (Users, Business Profiles, Products, Tiered Prices, Orders, Order Items, Escrow Transactions, Settlements, Financial Ledgers, Network Levels, KYC).
- Compatible with Supabase PostgreSQL and standard PostgreSQL (asyncpg / psycopg2).
- Zero customer platform fee guarantee maintained at database & calculation level.
- Multi-step Alembic migrations (Versions 001 to 004) for incremental schema evolution.
