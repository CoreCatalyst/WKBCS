# Redis Architecture & Specification: Noryvanta

## 1. Overview & Strategy
**Redis** operates as an in-memory data store for Noryvanta, fulfilling three critical high-throughput roles:
1. **Asynchronous Message Broker**: Message broker and result backend for Celery task workers.
2. **Session & OTP Cache**: Ephemeral storage for 6-digit cryptographic OTPs and refresh token blocklists.
3. **High-Frequency Rate Limiting & Catalog Caching**: Protecting sensitive endpoints (login, OTP dispatch, payment callbacks) against brute-force attacks and caching popular category listings.

---

## 2. Key-Space Architecture & TTL Policies

| Key Pattern | Data Type | TTL | Purpose |
| :--- | :--- | :--- | :--- |
| `otp:req:{identifier}` | String | 300s (5m) | Stores active OTP hash and attempt counter |
| `otp:ratelimit:{identifier}` | String | 60s (1m) | Throttles OTP request spam (max 1 per minute) |
| `token:blocklist:{jti}` | String | Token Expire | Invalidated access tokens during explicit logout |
| `cache:product:{prod_id}` | Hash | 3600s (1h) | Pre-computed product details and tiered pricing |
| `cache:categories:tree` | String (JSON) | 86400s (24h) | Hierarchical category taxonomy |
| `ratelimit:ip:{client_ip}` | String (Counter)| 60s | Token bucket / sliding window rate limiter |

---

## 3. Rate Limiting Algorithm (Sliding Window via Redis)

Implemented in FastAPI middleware using Redis atomic pipelines:
```python
async def check_rate_limit(redis_client, client_ip: str, limit: int = 60, window: int = 60):
    key = f"ratelimit:ip:{client_ip}"
    current = await redis_client.incr(key)
    if current == 1:
        await redis_client.expire(key, window)
    if current > limit:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please slow down."
        )
```

---

## 4. Redis Cluster / High Availability Configuration
- **Persistence**: Hybrid RDB (hourly snapshots) + AOF (Append-Only File with `appendfsync everysec`) for zero data loss during restarts.
- **Eviction Policy**: `allkeys-lru` (Least Recently Used) with memory cap at 2GB in staging, 8GB in production.
- **TLS/SSL**: In-transit encryption enabled for all Redis communication over private VPC subnets.
