# Package Manifest & Architectural Rationale: Noryvanta Business Marketplace

This document details the selected packages, libraries, dependencies, and runtime tools utilized across the frontend, backend, and infrastructure stacks of the **Noryvanta Business Marketplace Platform**.

---

## 1. Backend Dependencies (Python 3.11+)

Located in `backend/requirements.txt`:

| Package Name | Version Spec | Category | Architectural Rationale & Purpose |
| :--- | :--- | :--- | :--- |
| **`fastapi`** | `^0.115.0` | Core Web Framework | High-performance asynchronous ASGI web framework with native type annotations and automatic OpenAPI 3.1 spec generation. |
| **`uvicorn[standard]`** | `^0.30.0` | ASGI Server | Lightning-fast asynchronous server implementation for Python based on `uvloop` and `httptools`. |
| **`pydantic`** | `^2.8.0` | Validation & Serialization | Core domain model schema validation and lightning serialization compiled in Rust. |
| **`pydantic-settings`** | `^2.4.0` | Configuration | Type-safe environment variable parsing with `.env` file support. |
| **`sqlalchemy`** | `^2.0.32` | ORM & Query Builder | Modern SQLAlchemy 2.0 async engine and declarative relational mappings for PostgreSQL. |
| **`asyncpg`** | `^0.29.0` | Database Driver | High-throughput asynchronous PostgreSQL database client library. |
| **`psycopg2-binary`** | `^2.9.9` | Migration DB Driver | Synchronous PostgreSQL driver utilized by Alembic during schema migrations. |
| **`alembic`** | `^1.13.2` | Database Migrations | Robust schema migration tool supporting auto-generating upgrade/downgrade scripts. |
| **`redis`** | `^5.0.8` | Cache & Rate Limiting | Async Redis client for distributed locking, sliding-window rate limiting, and OTP caching. |
| **`celery[redis]`** | `^5.4.0` | Asynchronous Tasks | Distributed task queue for asynchronous SMS dispatch, tax e-invoicing, and escrow batching. |
| **`pyjwt`** | `^2.9.0` | Cryptographic Security | JSON Web Token (JWT) encoding, decoding, and signature verification with HS256/RS256. |
| **`passlib[bcrypt]`** | `^1.7.4` | Password Hashing | Cryptographic password hashing adhering to OWASP security guidelines. |
| **`python-multipart`** | `^0.0.9` | Form Parsing | Streaming parser for multipart/form-data used in KYC document uploads. |
| **`httpx`** | `^0.27.0` | Async HTTP Client | Asynchronous HTTP client for integrating with external tax/logistics APIs. |
| **`prometheus-fastapi-instrumentator`** | `^7.0.0` | Observability | Exports detailed HTTP latency, error rates, and custom gauges directly to Prometheus. |
| **`pytest`** | `^8.3.2` | Testing | Testing framework for unit, integration, and mock validation. |
| **`pytest-asyncio`** | `^0.24.0` | Testing | Async test support for FastAPI endpoints and database fixtures. |

---

## 2. Frontend Dependencies (Next.js 14/15 & React)

Located in `frontend/package.json`:

| Package Name | Version Spec | Category | Architectural Rationale & Purpose |
| :--- | :--- | :--- | :--- |
| **`next`** | `^15.0.0` | Core Framework | React framework supporting server components, optimized image handling, and App Router. |
| **`react`** | `^19.0.0` | UI Library | Primary component rendering and state synchronization engine. |
| **`react-dom`** | `^19.0.0` | DOM Renderer | DOM bindings for React. |
| **`tailwindcss`** | `^3.4.10` | Styling Engine | Utility-first CSS framework customized with Sovereign Commerce design tokens. |
| **`lucide-react`** | `^0.441.0` | Iconography | Clean, consistent, lightweight SVG iconography across desktop and mobile. |
| **`axios`** | `^1.7.7` | HTTP Client | Promise-based HTTP client equipped with request/response interceptors for JWT token lifecycle. |
| **`clsx`** | `^2.1.1` | Class Utility | High-performance utility for conditionally constructing `className` strings. |
| **`tailwind-merge`** | `^2.5.2` | Class Utility | Intelligently merges Tailwind CSS classes without style conflicts. |
| **`@tanstack/react-query`** | `^5.56.2` | Data Fetching | Client-side cache management, background synchronization, and optimistic UI updates. |
| **`typescript`** | `^5.6.2` | Type Safety | Static type checker ensuring end-to-end interface contracts. |
| **`@types/react`** | `^19.0.0` | Type Definitions | TypeScript typings for React. |
| **`@types/node`** | `^20.16.5` | Type Definitions | TypeScript typings for Node.js runtime. |

---

## 3. Infrastructure & DevOps Tooling

| Tool / Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Docker** | `26.x+` | Multi-stage container builds ensuring identical runtime environments. |
| **Docker Compose** | `v2.x` | Orchestrates multi-service development topology (Web, API, Worker, Redis, DB, Prometheus). |
| **Prometheus** | `v2.54.0` | Time-series metrics scraper pulling from `/metrics`. |
| **Grafana** | `v11.1.0` | Metric visualization dashboards for API latency, active escrow value, and worker health. |
| **PostgreSQL** | `16-alpine` | Primary transactional relational database with full ACID compliance. |
| **Redis** | `7.2-alpine` | High-performance in-memory cache and Celery broker. |
