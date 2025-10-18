# Auth API Endpoints

This document describes all authentication-related endpoints for the FDAware backend.

---

## 1. Login

**POST** `/auth/login`

Authenticate a user and return a JWT token.

### Request Body
```json
{
  "email": "user@example.com",
  "password": "yourPassword"
}
```

### Response
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "name": "John Doe",
  "token": "jwt.token.here"
}
```

---

## 2. Signup

**POST** `/auth/signup`

Register a new user.

### Request Body
```json
{
  "email": "user@example.com",
  "password": "yourPassword",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Inc",
  "profileImage": "https://..." // optional
}
```

### Response
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

---

## 3. Change Password (while logged in)

**POST** `/users/me/change-password`

Change the password for the currently authenticated user.

### Request Body
```json
{
  "oldPassword": "currentPassword",
  "newPassword": "newPassword123"
}
```

### Response
```json
{
  "message": "Password updated"
}
```

**Notes:**
- Requires authentication (JWT).
- Sends a confirmation email after successful change.

---

## 4. Forgot Password (Request Reset)

**POST** `/auth/forgot-password`

Request a password reset link to be sent to the user's email.

### Request Body
```json
{
  "email": "user@example.com"
}
```

### Response
```json
{
  "message": "If that email exists, a reset link has been sent."
}
```

**Notes:**
- Always returns a generic message for security.
- Sends an email with a reset link if the email exists.

---

## 5. Reset Password (via Email Link)

**POST** `/auth/reset-password`

Reset the user's password using a valid reset token.

### Request Body
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newPassword123"
}
```

### Response
```json
{
  "message": "Password has been reset."
}
```

**Notes:**
- The token is single-use and expires after 1 hour.
- Sends a confirmation email after successful reset.

---

## 6. Get Current User Profile

**GET** `/users/me`

Get the profile of the currently authenticated user.

### Response
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Inc",
  "profileImage": "https://...",
  "createdAt": "2025-07-10T15:00:00.000Z",
  "updatedAt": "2025-07-10T15:00:00.000Z"
}
```

**Notes:**
- Requires authentication (JWT).

---

## 7. Update Current User Profile

**PUT** `/users/me`

Update the profile of the currently authenticated user.

### Request Body
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "company": "New Company",
  "profileImage": "https://..."
}
```

### Response
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "company": "New Company",
  "profileImage": "https://...",
  "createdAt": "2025-07-10T15:00:00.000Z",
  "updatedAt": "2025-07-10T15:00:00.000Z"
}
```

**Notes:**
- Requires authentication (JWT).
- Only provided fields are updated.

---

## Error Responses
- All endpoints return standard HTTP error codes and messages for invalid input, unauthorized access, or expired/invalid tokens.
- Password reset and change always return generic messages to prevent email enumeration.

---

## Email Templates
- `reset-password.hbs`: Sent for password reset requests.
- `password-changed.hbs`: Sent after password is changed or reset.

---

- Returns the same shape as regular login with a JWT token.

---

For further details, see the code or contact the backend team.