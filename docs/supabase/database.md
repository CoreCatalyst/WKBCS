# PostgreSQL Database Architecture & Schema: Noryvanta

Refer to primary schema specification in [database.md](file:///f:/PROJECT/Project/Noryvanta_Web/supabase/database.md).

## Key Database Capabilities
1. **ACID Transactions**: Financial ledger operations (escrow lock, milestone disbursement, platform commission) are executed within strict transactional boundaries with `SELECT FOR UPDATE` locking to prevent double-spending or race conditions.
2. **Row-Level Security (RLS)**: Enforced directly on PostgreSQL for multi-tenant isolation between buyers, vendors, and marketplace operators.
3. **JSONB Extensions**: Used for flexible product specifications, dynamic B2B shipping addresses, and comprehensive immutable audit trails.
