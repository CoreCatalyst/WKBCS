# Noryvanta Celery Background Task Architecture

Please see the comprehensive Celery specification in [supabase/celery.md](file:///f:/PROJECT/Project/Noryvanta_Web/supabase/celery.md).

### Core Features
- Asynchronous dispatch of heavy operations:
  - AI product description generation from image batches
  - Resend email dispatches (Business Registered, Listing Approved, Order Received, Settlement Processed)
  - Firebase FCM push notification dispatches
  - Daily banking reconciliation and statutory TDS / GST ledger generation
- Automated retry mechanisms with exponential backoff and dead-letter queues.
