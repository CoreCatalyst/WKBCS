# NORYVANTA — DEPLOYMENT ARCHITECTURE & PRODUCTION GUIDE
> **Tagline:** "Connect, Grow, Thrive"  
> **Target Environments:** AWS / Azure / Linux Container VM / Kubernetes  

---

## 1. Production Architecture Overview
- **Frontend:** Next.js 15 SSR/SSG containerized behind CDN / Nginx reverse proxy.
- **Backend:** FastAPI Uvicorn ASGI cluster behind Nginx reverse proxy.
- **Database:** Managed PostgreSQL 16 (AWS RDS or Supabase) with SSL enabled.
- **Worker & Scheduler:** Celery worker and beat communicating via Redis 7 cluster.
- **Observability:** Prometheus metrics scraping + Grafana dashboards + OpenSearch logging.

---

## 2. Environment Variables Checklist
Before deploying to production, ensure these are configured in production secrets:
- `APP_ENV=production` (Critical: disables master OTP bypass)
- `SECRET_KEY`: High-entropy 64-character secret
- `DATABASE_URL`: `postgresql+asyncpg://...`
- `REDIS_URL`: `redis://:...@...`
- `BACKEND_CORS_ORIGINS`: JSON array of approved frontend production domains
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- `CASHFREE_APP_ID` & `CASHFREE_SECRET_KEY`

---

## 3. Database Migration Deployment
```bash
cd backend
alembic upgrade head
```

---

## 4. Docker Production Build
```bash
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
```
