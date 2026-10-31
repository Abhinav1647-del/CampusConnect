# IIIT Nagpur Campus Connect — Complete Fullstack Monorepo

Enterprise-grade campus platform connecting students, mess committees, club leads, and administrators. This repository unifies the high-performance **NestJS + Prisma Backend** with the **Lovable TanStack-Start Frontend**.

---

## 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph Frontend ["Frontend (TanStack Start / React 19 / Vite)"]
        UI["User Interface (Tailwind CSS + Radix UI)"]
        API_LAYER["API Client (fetch + Bearer token injection)"]
    end

    subgraph Backend ["Backend Modular Monolith (NestJS 12 + TypeScript)"]
        GATEWAY["API Gateway / Controller Router (/api)"]
        AUTH_MOD["Auth & RBAC Module (JWT + Bcrypt)"]
        USERS_MOD["User Management Module"]
        MESS_MOD["Mess & Dining Module"]
        CLUBS_MOD["Clubs & Events Module"]
        CART_MOD["CampusCart Marketplace Module"]
        NOTIF_MOD["Notifications Module (Expo Push)"]
        UPLOAD_MOD["File Upload Service (S3 / Local Multer)"]
        AUDIT_MOD["Admin & Audit Logging Module"]
    end

    subgraph Database ["Persistence Layer"]
        PRISMA["Prisma ORM Client"]
        POSTGRES[("PostgreSQL Database")]
    end

    UI --> API_LAYER
    API_LAYER -- "REST API (HTTP / JSON)" --> GATEWAY
    GATEWAY --> AUTH_MOD
    GATEWAY --> USERS_MOD
    GATEWAY --> MESS_MOD
    GATEWAY --> CLUBS_MOD
    GATEWAY --> CART_MOD
    GATEWAY --> NOTIF_MOD
    GATEWAY --> UPLOAD_MOD
    GATEWAY --> AUDIT_MOD
    AUTH_MOD --> PRISMA
    USERS_MOD --> PRISMA
    MESS_MOD --> PRISMA
    CLUBS_MOD --> PRISMA
    CART_MOD --> PRISMA
    NOTIF_MOD --> PRISMA
    AUDIT_MOD --> PRISMA
    PRISMA --> POSTGRES
```

---

## 🚀 Quick Start Guide (Windows PowerShell)

### 1. Prerequisites
- **Node.js**: v20+ or v24+
- **PostgreSQL**: v14+ running locally (or Supabase / Neon / Docker connection string)

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/campusconnect?schema=public"

JWT_SECRET="super-secret-jwt-key-iiitn-2026-campusconnect"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="super-secret-refresh-key-iiitn-2026-campusconnect"
JWT_REFRESH_EXPIRES_IN="7d"

UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=5
```

**Frontend (`frontend/campus-connect-hub-main/.env`):**
```env
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Run Database Migrations & Seed
```powershell
# In backend directory:
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..
```

### 4. Running Backend and Frontend

**Start the NestJS Backend (Port 3000):**
```powershell
npm run dev:backend
# API running at: http://localhost:3000
# Swagger API docs at: http://localhost:3000/api/docs
```

**Start the Frontend (Port 5173 / 3001):**
```powershell
npm run dev:frontend
# App accessible in browser at: http://localhost:5173
```

---

## 🔑 Development Seed Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **APP_ADMIN** | `admin@iiitn.ac.in` | `Admin@123456` |
| **MESS_ADMIN** | `mess.admin@iiitn.ac.in` | `Admin@123456` |
| **CAMPUSCART_MODERATOR** | `moderator@iiitn.ac.in` | `Admin@123456` |
| **CLUB_LEAD** | `bt21cse003@iiitn.ac.in` | `Student@123456` |
| **STUDENT** | `bt21cse001@iiitn.ac.in` | `Student@123456` |
| **STUDENT** | `bt21cse002@iiitn.ac.in` | `Student@123456` |

---

## 🧪 Automated Testing

Both backend and frontend are equipped with test suites:

```powershell
# Run backend tests (49 unit & integration tests)
npm run test:backend

# Run frontend tests
npm run test:frontend

# Build both applications for production
npm run build:backend
npm run build:frontend
```

---

## 📚 API Endpoints Summary

- **Authentication**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- **Users**: `GET /api/users/me`, `PUT /api/users/me`, `GET /api/users`
- **Mess & Dining**: `GET /api/mess/menu?date=YYYY-MM-DD`, `GET /api/mess/ratings/history`, `POST /api/mess/ratings`, `POST /api/admin/mess/menu`
- **Clubs & Events**: `GET /api/clubs`, `GET /api/clubs/:clubId/events`, `POST /api/events/:eventId/register`, `POST /api/clubs/:clubId/announcements`
- **CampusCart**: `GET /api/campuscart/listings`, `POST /api/campuscart/listings`, `POST /api/campuscart/listings/:id/requests`, `PATCH /api/campuscart/listings/:id/status`
- **Notifications**: `GET /api/notifications`, `PATCH /api/notifications/:id/read`
- **Interactive Documentation**: Swagger UI at `http://localhost:3000/api/docs`
