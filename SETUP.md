# NORYVANTA — LOCAL DEVELOPMENT SETUP GUIDE
> **Tagline:** "Connect, Grow, Thrive"  
> **Platform:** B2B Wholesale Commerce Platform  

---

## 1. Prerequisites
- **Node.js:** v18+ or v20+ LTS
- **Python:** 3.10+ / 3.14 (with venv)
- **Git**
- **Docker & Docker Compose** (optional for local, required for full stack)

---

## 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Run development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- Swagger UI available at: `http://127.0.0.1:8000/docs`
- Health check probe: `http://127.0.0.1:8000/api/v1/health`

### Running Backend Tests
```bash
# From repository root with PYTHONPATH set:
$env:PYTHONPATH="backend"; .\backend\venv\Scripts\python -m pytest backend/tests
```

---

## 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run local development server
npm run dev
```

- Application runs at: `http://localhost:3000`

### Building Frontend
```bash
npm run build
```

---

## 4. Docker Full-Stack Setup (Optional Local / Staging)

```bash
# Copy environment configuration
cp .env.example .env

# Start all containers
docker compose up -d
```
