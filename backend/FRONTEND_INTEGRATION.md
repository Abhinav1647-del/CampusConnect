# Frontend Integration Guide
For the Lovable frontend team connecting to the Campus Connect API.

## Base URL

```
Development: http://localhost:3000
Production:  https://your-backend-domain.com
```

All endpoints are prefixed with `/api`.

## Authentication Flow

### 1. Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@iiitn.ac.in",
  "name": "John Doe",
  "rollNumber": "BT21CSE001",
  "password": "MyPassword@123"
}
```

Password rules: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.

Response `201`:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "role": "STUDENT" },
    "message": "Registration successful"
  }
}
```

### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@iiitn.ac.in",
  "password": "MyPassword@123"
}
```

Response `200`:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "role": "STUDENT", "rollNumber": "BT21CSE001" },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Store both tokens securely** (e.g. AsyncStorage or SecureStore). Never store in localStorage for web.

### 3. Authenticated Requests

Include the access token in every protected request:
```http
Authorization: Bearer <accessToken>
```

### 4. Token Refresh

When you receive a `401 Unauthorized`, refresh the token:
```http
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJhbGci..." }
```

Response `200`:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

## Expo Push Notifications

After login, register the Expo push token:
```http
PUT /api/users/me
Authorization: Bearer <accessToken>

{ "expoPushToken": "ExponentPushToken[...]" }
```

## Key Endpoints

### Get Today's Menu
```http
GET /api/mess/menu?messId=mess-main&date=2024-01-15
```

Response `data`:
```json
{
  "meals": [
    {
      "id": "...",
      "period": "BREAKFAST",
      "isPublished": true,
      "mealItems": [
        { "menuItem": { "id": "...", "name": "Poha", "isVeg": true } }
      ],
      "avgRating": 4.2,
      "ratingCount": 15,
      "myRating": null
    }
  ]
}
```

### Submit Food Rating
```http
POST /api/mess/ratings
Authorization: Bearer <accessToken>

{
  "mealId": "meal-id-here",
  "rating": 4,
  "feedback": "Dal was great today!"
}
```

### List Clubs
```http
GET /api/clubs?category=Technical&page=1&limit=20
```

### Register for Event
```http
POST /api/events/:eventId/register
Authorization: Bearer <accessToken>
```

Response includes `status`: `REGISTERED` or `WAITLISTED`.

### Create Listing (CampusCart)
```http
POST /api/campuscart/listings
Authorization: Bearer <accessToken>

{
  "title": "Engineering Maths Textbook",
  "description": "Kreyszig 10th edition, good condition",
  "price": 350,
  "category": "Books",
  "condition": "GOOD"
}
```

Returns a listing with `status: "DRAFT"`. Then publish it:
```http
PATCH /api/campuscart/listings/:id/status
Authorization: Bearer <accessToken>

{ "status": "ACTIVE" }
```

### Upload Listing Images
```http
POST /api/campuscart/listings/:id/images
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

images: <file1>, <file2>
```

## Error Handling

All errors follow:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "string or validation array",
  "path": "/api/..."
}
```

Common status codes:
- `400` — Validation error or bad request
- `401` — Missing or expired token
- `403` — Insufficient permissions
- `404` — Resource not found
- `409` — Conflict (e.g. already registered)
- `429` — Rate limited

## Pagination

All list endpoints support:
```
?page=1&limit=20
```

Response includes:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

## Role-Based UI

The `role` field in the user object controls what the frontend shows:

| Role | Capabilities |
|------|-------------|
| `STUDENT` | Rate meals, join clubs, register for events, create listings |
| `CLUB_LEAD` | All STUDENT + create events and announcements for their club |
| `MESS_ADMIN` | All STUDENT + create/publish menus and notices |
| `CAMPUSCART_MODERATOR` | All STUDENT + moderate listings, resolve reports |
| `APP_ADMIN` | All capabilities |

## Swagger / OpenAPI

Full interactive API docs (with try-it-out): `http://localhost:3000/api/docs`

Click "Authorize" and paste your `accessToken` to test protected endpoints.

## CORS

The backend allows requests from your Lovable deployment URL. The `FRONTEND_URL` environment variable on the backend must be set to your Lovable app's URL in production.
