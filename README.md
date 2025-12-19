# FDAware Backend

NestJS API powering FDAware: authentication, workspaces, labels, subscriptions, notifications and reports. Uses Prisma (PostgreSQL), AWS S3, Stripe, and an external ML service for OCR/compliance analysis.

## Quickstart
- Install dependencies: `npm install`
- Generate Prisma client: `npm run prisma:generate`
- Start dev server: `npm run start:dev` (http://localhost:8080, global prefix `api`)
- Swagger docs: `http://localhost:8080/api/docs`

## Environment
Loads `.env.local` first, then `.env`.

```
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=changeme

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_BUCKET=...

ML_API_URL=http://127.0.0.1:10000/analyze

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_LITE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx
SMTP_FROM=your@gmail.com

FRONTEND_URL=http://localhost:3000
```

## Modules & Endpoints

### Auth (`/api/auth`)
- Sign up, sign in, password reset, Google OAuth fields in schema.

### Workspaces (`/api/workspaces`)
- `POST /:workspaceId/invite` invite/add members (admin only). Fails if email delivery fails; otherwise persists invitation or membership.
- `GET /:workspaceId/members` list active members and pending invitations.
- `POST /:workspaceId/invites/:inviteId/resend` resend invitation (updates `invitedAt` only on email success).
- `DELETE /:workspaceId/invites/:inviteId` cancel a pending invitation.
- `GET /:workspaceId/invites/:inviteId/validate?token=...` validate invitation.
- `POST /:workspaceId/invites/:inviteId/accept` accept invitation (authenticated; invite email must match user email).
- `DELETE /:workspaceId/members/:userId` remove member (admin only; protects last admin).
- `PUT /:workspaceId/members/:userId/role` change role (admin only; protects last admin).
- `POST /:workspaceId/leave` leave workspace (protects last admin from leaving).

Email links used in templates:
- Existing member notification: `${FRONTEND_URL}/dashboard/team-settings`
- New invite: `${FRONTEND_URL}/accept-invite?workspaceId=...&inviteId=...&token=...`

### Labels (`/api/labels`)
- `POST /upload` upload a label file (`multipart/form-data`, field `file`), returns label + initial analysis.
- `POST /:id/upload-version` upload a new version for a label.
- `GET /` list labels (optionally by `workspaceId`).
- `GET /:id` get a label by id.
- `GET /:id/versions` list versions for a label.
- `GET /:id/versions/:versionId` get a specific version.
- `PUT /:labelId/versions/:versionId/approve|reject` approve or reject a version.
- `GET /:id/download` get a presigned download URL.

### Billing (`/api/billing`)
- `POST /create-checkout-session` start Stripe Checkout for Lite subscription.
- `POST /create-portal-session` open Stripe Billing Portal (manage plan, payment methods).
- `POST /cancel-subscription` cancel immediately or at period end.
- `POST /workspace-status` return plan, expiry, billing status, Stripe IDs, interval, usage stats, and price metadata.
- `POST /webhook` Stripe webhook (raw-body signature verification; idempotent; updates workspace plan state).

### Reports (`/api/reports`)
- Create/download reports (CSV/PDF) for workspace activity and analysis.

### Notifications (`/api/notifications`)
- Real-time notifications via WebSocket; REST endpoints to query and mark read.

## ML Integration
- On label upload, sends file URL to the ML service (`ML_API_URL`) for OCR and compliance analysis.
- Results are persisted to `LabelVersion` and `Violation` tables.

## Stripe Webhooks (Test Mode)
- `stripe listen --forward-to http://localhost:8080/api/billing/webhook`
- Use test keys and test price IDs; set `STRIPE_WEBHOOK_SECRET` from the CLI output.

## Development Notes
- Global API prefix: `/api`
- Swagger: `/api/docs`
- Prisma client: `npm run prisma:generate`
- DB connection via `prisma.config.ts` using `DATABASE_URL`.

## Tech Stack
- NestJS, TypeScript
- Prisma (PostgreSQL)
- AWS S3
- Stripe (subscriptions)
- Socket.io (notifications)