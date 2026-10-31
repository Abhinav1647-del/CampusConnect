# Campus Connect Backend API

Production-oriented NestJS backend for IIIT Nagpur Campus Connect.

## Stack

- **Runtime**: Node.js (ESM)
- **Framework**: NestJS 12
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL via Prisma 7
- **Auth**: JWT (access + refresh tokens), Passport
- **File Storage**: S3-compatible (Cloudflare R2 / AWS S3) or local disk fallback
- **Push Notifications**: Expo Push Notifications
- **Rate Limiting**: @nestjs/throttler
- **Docs**: Swagger / OpenAPI at `/api/docs`
- **Tests**: Vitest

## Prerequisites

- Node.js >= 20
- PostgreSQL 14+
- npm 10+

## PostgreSQL Setup (Windows PowerShell)

```powershell
# Install PostgreSQL from https://www.postgresql.org/download/windows/
# Or use Docker:
docker run --name campusconnect-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=campusconnect -p 5432:5432 -d postgres:16

# Create database manually (if not using Docker):
# psql -U postgres
# CREATE DATABASE campusconnect;
```

## Installation (Windows PowerShell)

```powershell
# Clone and navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment file
Copy-Item .env.example .env
# Edit .env with your DATABASE_URL and JWT secrets
```

## Environment Configuration

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/campusconnect"
JWT_SECRET="your-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
STORAGE_PROVIDER="local"
```

## Database Setup

```powershell
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
# Enter migration name when prompted (e.g. "init")

# Seed development data
npm run prisma:seed
```

## Running the Server

```powershell
# Development (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

Server runs at: http://localhost:3000
Swagger docs: http://localhost:3000/api/docs

## Development Seed Accounts

| Role | Email | Password |
|------|-------|----------|
| APP_ADMIN | admin@iiitn.ac.in | Admin@123456 |
| MESS_ADMIN | mess.admin@iiitn.ac.in | Admin@123456 |
| CAMPUSCART_MODERATOR | moderator@iiitn.ac.in | Admin@123456 |
| CLUB_LEAD | bt21cse003@iiitn.ac.in | Student@123456 |
| STUDENT | bt21cse001@iiitn.ac.in | Student@123456 |
| STUDENT | bt21cse002@iiitn.ac.in | Student@123456 |

## Running Tests

```powershell
npm run test
npm run test:cov
npm run test:e2e
```

## API Overview

All endpoints are prefixed with `/api`. Full documentation at `/api/docs`.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new student |
| POST | /api/auth/login | Login, receive access+refresh tokens |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Logout, revoke refresh token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/me | Get current user profile |
| PUT | /api/users/me | Update profile |

### Mess & Dining
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/mess/menu | Get menu by date (?messId=&date=YYYY-MM-DD) |
| GET | /api/mess/menu/history | Paginated meal history |
| GET | /api/mess/menu-items | List all menu items |
| POST | /api/mess/ratings | Submit/update food rating |
| GET | /api/mess/ratings/history | My ratings history |
| GET | /api/mess/ratings/stats | Monthly stats (?messId&year&month) |
| GET | /api/mess/notices | Get mess notices |
| POST | /api/admin/mess/menu | Create meal (MESS_ADMIN) |
| PATCH | /api/admin/mess/menu/:id | Update meal (MESS_ADMIN) |
| PATCH | /api/admin/mess/menu/:id/publish | Publish meal (MESS_ADMIN) |

### Clubs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/clubs | List clubs |
| POST | /api/clubs | Create club (APP_ADMIN) |
| GET | /api/clubs/:clubId | Get club details |
| POST | /api/clubs/:clubId/join | Join club |
| DELETE | /api/clubs/:clubId/leave | Leave club |
| POST | /api/clubs/:clubId/announcements | Create announcement |
| GET | /api/clubs/:clubId/announcements | Get announcements |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/events | List events |
| GET | /api/clubs/:clubId/events | Events by club |
| POST | /api/clubs/:clubId/events | Create event (Club Lead) |
| GET | /api/events/:eventId | Get event details |
| POST | /api/events/:eventId/register | Register for event |
| DELETE | /api/events/:eventId/register | Cancel registration |
| POST | /api/events/:eventId/cancel | Cancel event (Lead/Admin) |

### CampusCart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/campuscart/listings | Search listings |
| POST | /api/campuscart/listings | Create listing |
| GET | /api/campuscart/listings/:id | Get listing |
| PATCH | /api/campuscart/listings/:id | Update listing |
| PATCH | /api/campuscart/listings/:id/status | Update status |
| POST | /api/campuscart/listings/:id/requests | Send purchase request |
| POST | /api/campuscart/requests/:id/accept | Accept request (seller) |
| POST | /api/campuscart/requests/:id/reject | Reject request (seller) |
| POST | /api/campuscart/requests/:id/complete | Mark complete |
| GET | /api/campuscart/conversations | My conversations |
| POST | /api/campuscart/conversations/:id/messages | Send message |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get my notifications |
| GET | /api/notifications/unread-count | Unread count |
| PATCH | /api/notifications/:id/read | Mark read |
| PATCH | /api/notifications/read-all | Mark all read |

## Request/Response Format

All responses are wrapped:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

Error responses:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "path": "/api/mess/ratings"
}
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

Token flow:
1. POST `/api/auth/login` → receive `accessToken` (15min) + `refreshToken` (7d)
2. When access token expires → POST `/api/auth/refresh` with `{ refreshToken }` → new tokens
3. Logout → POST `/api/auth/logout` with `{ refreshToken }`

## File Upload

- **Dev**: Files saved locally in `./uploads/`, served at `/uploads/`
- **Prod**: Set `STORAGE_PROVIDER=s3` and configure S3 credentials in `.env`
- Max file size: 5MB
- Allowed types: image/jpeg, image/png, image/webp, image/gif

## CORS

- **Development**: All origins allowed (`*`)
- **Production**: Set `FRONTEND_URL` in `.env` (e.g. your Lovable deployment URL)

## Rate Limiting

100 requests per 60 seconds per IP (configurable via `THROTTLE_TTL` and `THROTTLE_LIMIT`).

## Deployment

```powershell
# Build
npm run build

# Set environment variables for production
# Run migrations
npm run prisma:migrate:prod

# Start
npm run start:prod
```

## Troubleshooting

**DATABASE_URL not connecting**: Check PostgreSQL is running and credentials match.
**Prisma generate fails**: Run `npm run prisma:generate` after any schema changes.
**bcrypt native build fails**: Install Visual C++ Build Tools or use `bcryptjs` as fallback.
