# Authentication Flow Documentation

This document explains the complete authentication flow between the NextJS frontend (using NextAuth) and the NestJS backend APIs for the FDAware application.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication Endpoints](#authentication-endpoints)
4. [JWT Token Handling](#jwt-token-handling)
5. [User Session Management](#user-session-management)
6. [Password Reset Flow](#password-reset-flow)
7. [Frontend Integration with NextAuth](#frontend-integration-with-nextauth)
8. [Security Considerations](#security-considerations)
9. [Error Handling](#error-handling)
10. [Environment Variables](#environment-variables)
11. [Code Examples](#code-examples)

## Overview

The authentication system is a hybrid approach that combines:
- **Backend**: NestJS with JWT-based authentication
- **Frontend**: NextJS with NextAuth for session management
- **Database**: PostgreSQL with Prisma ORM
- **Security**: bcrypt for password hashing, JWT for tokens

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NextJS        │    │   NestJS        │    │   PostgreSQL    │
│   Frontend      │    │   Backend       │    │   Database      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │  NextAuth   │◄┼────┼►│ Auth Module │◄┼────┼►│   Users     │ │
│ │  Session    │ │    │ │             │ │    │ │   Table     │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Pages/    │ │    │ │ JWT Service │ │    │ │ Password    │ │
│ │ Components  │ │    │ │             │ │    │ │ Reset Tokens│ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Authentication Endpoints

### 1. Login Endpoint

**POST** `/auth/login`

Validates user credentials and returns user data with JWT token.

**Request Body:**
```typescript
{
  email: string;      // Valid email address
  password: string;   // Minimum 6 characters
}
```

**Response:**
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  profileImage: string | null;
  onboardingComplete: boolean;
  token: string;      // JWT token
}
```

### 2. Signup Endpoint

**POST** `/auth/signup`

Creates a new user account with optional profile image upload.

**Request Body (multipart/form-data):**
```typescript
{
  email: string;           // Valid email address
  password: string;        // Minimum 6 characters
  firstName?: string;      // Optional
  lastName?: string;       // Optional
  name?: string;          // Optional
  company?: string;       // Optional
  agreeToTerms: boolean;  // Required
  workspaceId?: string;   // Optional
  profileImage?: File;    // Optional file upload
}
```

**Response:**
```typescript
{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
```

### 3. Forgot Password Endpoint

**POST** `/auth/forgot-password`

Initiates password reset process by sending reset email.

**Request Body:**
```typescript
{
  email: string;  // Valid email address
}
```

**Response:**
```typescript
{
  message: "If that email exists, a reset link has been sent."
}
```

### 4. Reset Password Endpoint

**POST** `/auth/reset-password`

Completes password reset using token from email.

**Request Body:**
```typescript
{
  token: string;        // Reset token from email
  newPassword: string;  // Minimum 8 characters
}
```

**Response:**
```typescript
{
  message: "Password has been reset."
}
```

## JWT Token Handling

### Token Generation

The backend generates JWT tokens with the following payload:

```typescript
{
  sub: string;    // User ID
  email: string;  // User email
  iat: number;    // Issued at timestamp
  exp: number;    // Expiration timestamp (7 days)
}
```

### Token Configuration

- **Secret**: `process.env.JWT_SECRET` (fallback: 'changeme')
- **Expiration**: 7 days
- **Algorithm**: HS256 (default)

### Token Validation

The backend uses `AuthGuard` to validate JWT tokens:

```typescript
// Example protected route
@UseGuards(AuthGuard)
@Get('protected')
async getProtectedData(@Request() req) {
  // req.user contains decoded JWT payload
  return { userId: req.user.sub };
}
```

## User Session Management

### Backend Session Handling

The backend is stateless and relies on JWT tokens for authentication. No server-side sessions are maintained.

### Frontend Session with NextAuth

NextAuth manages client-side sessions and integrates with the backend:

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const res = await fetch(`${process.env.BACKEND_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        })
        
        if (res.ok) {
          const user = await res.json()
          return user
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.token
        token.user = user
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.user = token.user
      return session
    }
  }
})
```

## Password Reset Flow

### 1. Initiate Reset

1. User enters email on forgot password page
2. Frontend calls `/auth/forgot-password`
3. Backend generates secure token and stores in database
4. Email sent with reset link containing token
5. Token expires after 1 hour

### 2. Complete Reset

1. User clicks reset link with token
2. Frontend displays reset password form
3. User enters new password
4. Frontend calls `/auth/reset-password` with token and new password
5. Backend validates token and updates password
6. Token marked as used
7. Confirmation email sent

### Database Schema

```sql
-- Password reset tokens table
CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
```

## Frontend Integration with NextAuth

### Login Component Example

```typescript
// components/LoginForm.tsx
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function LoginForm() {
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = await signIn('credentials', {
      email: credentials.email,
      password: credentials.password,
      redirect: false
    })
    
    if (result?.error) {
      // Handle login error
      console.error('Login failed:', result.error)
    } else {
      // Redirect on success
      window.location.href = '/dashboard'
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={credentials.email}
        onChange={(e) => setCredentials({...credentials, email: e.target.value})}
        required
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
        required
      />
      <button type="submit">Login</button>
    </form>
  )
}
```

### Protected Route Example

```typescript
// pages/dashboard.tsx
import { useSession, getSession } from 'next-auth/react'
import { GetServerSideProps } from 'next'

export default function Dashboard() {
  const { data: session } = useSession()
  
  if (!session) {
    return <div>Access Denied</div>
  }
  
  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
      <p>Token: {session.accessToken}</p>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context)
  
  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }
  
  return {
    props: { session },
  }
}
```

### API Calls with Authentication

```typescript
// utils/api.ts
import { getSession } from 'next-auth/react'

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const session = await getSession()
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${session?.accessToken}`,
      'Content-Type': 'application/json',
    },
  })
}

// Usage example
const response = await authenticatedFetch('/api/protected-endpoint', {
  method: 'GET'
})
```

## Security Considerations

### Password Security

- **Hashing**: bcrypt with salt rounds (10)
- **Minimum Length**: 6 characters for login, 8 for reset
- **Storage**: Only hashed passwords stored in database

### JWT Security

- **Secret**: Use strong, random JWT secret in production
- **Expiration**: 7-day expiration to balance security and UX
- **Transmission**: Always use HTTPS in production
- **Storage**: NextAuth handles secure token storage

### Reset Token Security

- **Generation**: Cryptographically secure random bytes (32 bytes)
- **Expiration**: 1-hour expiration window
- **Single Use**: Tokens marked as used after successful reset
- **Cleanup**: Expired tokens should be cleaned up periodically

### Input Validation

- **Email Validation**: Class-validator with `@IsEmail()`
- **Password Requirements**: Minimum length validation
- **Sanitization**: Whitelist validation with `ValidationPipe`
- **File Uploads**: Proper file type and size validation

### Rate Limiting

Consider implementing rate limiting for:
- Login attempts
- Password reset requests
- Account creation

## Error Handling

### Backend Error Responses

```typescript
// Validation errors
{
  statusCode: 400,
  message: ["email must be an email", "password must be longer than or equal to 6 characters"],
  error: "Bad Request"
}

// Authentication errors
{
  statusCode: 401,
  message: "Invalid credentials",
  error: "Unauthorized"
}

// Reset token errors
{
  statusCode: 400,
  message: "Invalid or expired reset token",
  error: "Bad Request"
}
```

### Frontend Error Handling

```typescript
// Login error handling
const result = await signIn('credentials', {
  email,
  password,
  redirect: false
})

if (result?.error) {
  switch (result.error) {
    case 'CredentialsSignin':
      setError('Invalid email or password')
      break
    default:
      setError('An unexpected error occurred')
  }
}
```

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/fdaware"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Frontend URL (for reset links)
FRONTEND_URL="http://localhost:3000"
```

### Frontend (.env.local)

```bash
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Backend API URL
BACKEND_URL="http://localhost:8000"
```

## Code Examples

### Complete Signup Flow

```typescript
// Frontend signup component
const handleSignup = async (formData: FormData) => {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/auth/signup`, {
      method: 'POST',
      body: formData // multipart/form-data for file upload
    })
    
    if (response.ok) {
      const user = await response.json()
      // Redirect to login or auto-login
      router.push('/login?message=Account created successfully')
    } else {
      const error = await response.json()
      setError(error.message)
    }
  } catch (error) {
    setError('Network error occurred')
  }
}
```

### Middleware for Protected Routes

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Additional middleware logic
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*']
}
```

### Backend Auth Guard Implementation

```typescript
// common/guards/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request)
    
    if (!token) {
      throw new UnauthorizedException()
    }
    
    try {
      const payload = this.jwtService.verify(token)
      request.user = payload
    } catch {
      throw new UnauthorizedException()
    }
    
    return true
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
```

This documentation provides a comprehensive overview of the authentication flow between your NextJS frontend and NestJS backend. The system is designed to be secure, scalable, and maintainable while providing a smooth user experience.