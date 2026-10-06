# Noryvanta Redis Architecture & Cache Specification

Please see the comprehensive Redis specification in [supabase/redis.md](file:///f:/PROJECT/Project/Noryvanta_Web/supabase/redis.md).

### Core Features
- Redis used for high-throughput distributed caching, session storage, and rate limiting.
- Primary broker and result backend for Celery asynchronous background tasks.
- Pub/Sub channel architecture for real-time order and transaction status feeds.
