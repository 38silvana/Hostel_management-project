# Module 5: Testing, Deployment & Production Readiness

## Testing & Quality Assurance

### Running Backend Tests
Execute pytest suite using the Python virtual environment:
```bashash
export DATABASE_URL="postgresql://user:password@localhost:5432/hostel_db"
```
Execute schema migration script:
```bash
psql -U user -d hostel_db -f database/schema.sql
```

### 2. FastAPI Backend Deployment (Production Server)
Run FastAPI with Uvicorn / Gunicorn production workers:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 3. Next.js Frontend Deployment
Build production Next.js application bundle:
```bash
cd frontend
npm run build
npm start
```
Alternatively deploy to Vercel / Netlify with `NEXT_PUBLIC_API_URL` pointing to the FastAPI backend domain.
