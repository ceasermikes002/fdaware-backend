# Billing & Subscription (Vercel‑style)

## Overview
- Workspace‑first billing: the `Workspace` model is the single source of truth for plan state.
- Fields: `plan`, `planExpiresAt`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `billingInterval`.
- Lite tier `$249/month`. Scanning requires active subscription and is limited to 2 SKUs/month; demo workspace bypasses checks.

## Environment & Safety
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_LITE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `DEMO_WORKSPACE_ID`.
- Test vs Live: ensure price IDs match the environment; do not mix.
 - Webhook signature is verified using the raw body. The app disables global body parsing and re-adds it for non-webhook routes:
   - `NestFactory.create(AppModule, { bodyParser: false })`
   - `app.use('/api/billing/webhook', raw({ type: '*/*' }));`
   - JSON/urlencoded parsers re-registered for other routes.

## Endpoints (prefix: `/api`)

### Create Checkout Session
- `POST /api/billing/create-checkout-session`
- Body:
```
{
  "workspaceId": "workspace_123",
  "successUrl": "https://app.example.com/billing/success",
  "cancelUrl": "https://app.example.com/billing/cancel",
  "customerEmail": "user@company.com" // optional
}
```
- Behavior:
  - If workspace already has an active subscription, returns a Stripe Billing Portal session instead of creating a new checkout.
- Otherwise returns a Checkout Session URL.

### Create Billing Portal Session
- `POST /api/billing/create-portal-session`
- Body:
```
{
  "workspaceId": "workspace_123",
  "returnUrl": "https://app.example.com/billing"
}
```
- Returns a Stripe Billing Portal URL for upgrade/downgrade/cancel/payment methods.

### Cancel Subscription
- `POST /api/billing/cancel-subscription`
- Body:
```
{
  "workspaceId": "workspace_123",
  "immediate": false,
  "cancelAtPeriodEnd": true
}
```
- Cancels immediately or schedules cancellation at period end; updates `planExpiresAt` and `billingStatus`.

### Workspace Billing Status
- `POST /api/billing/workspace-status`
- Body:
```
{ "workspaceId": "workspace_123" }
```
- Returns: plan, planExpiresAt, billingStatus, stripeCustomerId, stripeSubscriptionId, stripePriceId, billingInterval, subscriptionActive, usageCount, usageLimit, planPriceAmount, planPriceCurrency, planPriceInterval, planNickname.

### Stripe Webhook
- `POST /api/billing/webhook`, header `stripe-signature: <value>`.
- Only webhooks mutate billing state; frontend redirects are not trusted.
- Deduplication: every `event.id` is stored in `StripeEvent`; duplicates are skipped.
- Handled events and effects:
  - `checkout.session.completed`: fetch subscription; update `Workspace` fields (plan, expires, customer/subscription IDs, `stripePriceId`, `billingInterval`).
  - `customer.subscription.created`/`updated`: same as above; keeps `planExpiresAt` in sync with Stripe.
  - `customer.subscription.deleted`: keep plan active until `current_period_end` (set `planExpiresAt` accordingly). If deleted immediately without period end, access ends now.
  - `invoice.paid` / `invoice.payment_succeeded`: refresh `planExpiresAt` to new period end.
  - `invoice.payment_failed`: do not revoke immediately; keep access until current period end (UI can show past_due warning).

Sample handler skeleton:
```
switch (event.type) {
  case 'checkout.session.completed':
    // fetch subscription, update Workspace from subscription
    break;
  case 'customer.subscription.created':
    // update Workspace from subscription
    break;
  case 'customer.subscription.updated':
    // update Workspace from subscription
    break;
  case 'customer.subscription.deleted':
    // set planExpiresAt = current_period_end (grace), else end now
    break;
  case 'invoice.paid':
  case 'invoice.payment_succeeded':
    // refresh planExpiresAt
    break;
  case 'invoice.payment_failed':
    // mark past_due in UI; keep access until period end
    break;
  default:
    // ignore
}
```

## Paywall Enforcement
- Server‑side only: before scans, check `Workspace.planExpiresAt > now` and monthly distinct SKUs `< 2`.
- Demo workspace bypasses checks.
- Never trust frontend flags; never use `User.plan` for gating.

## Edge Cases & Rules
1. Checkout succeeded but webhook delayed: webhooks are source of truth; no DB changes on redirect.
2. Webhook retried: dedup using `StripeEvent.id`; skip duplicates.
3. Duplicate checkout clicks: detect existing active subscription, return Billing Portal session.
4. Canceled subscription: access remains until `current_period_end`; set `planExpiresAt` accordingly; downgrade after expiration.
5. Immediate deletion: downgrade instantly (no grace period if `current_period_end` absent).
6. Multiple paid workspaces per user: allowed; plan depends on active workspace.
7. Workspace switching: always load plan by `workspaceId` in session; never cache on user.
8. User removed from workspace: revoke access immediately regardless of personal subscriptions.
9. Downgrade limit violations: choose policy (lock read‑only, auto‑trim members, grace period) — scans are blocked server‑side.
10. Payment failed: mark past_due (UI), warn, downgrade after grace period.
11. Workspace deletion: cancel subscription first or soft‑delete workspace.
12. Owner leaves: transfer ownership or block leaving if last admin.
13. Multiple prices per plan: store `stripePriceId` and `billingInterval` from subscription.
14. Wrong Stripe mode: enforce test/live separation; validate price IDs.
15. Forged webhooks: always verify signature; never trust request body.
16. Manual API edits: only webhooks mutate billing; server enforces checks.
17. Data integrity: never check `user.plan`; always check `workspace.plan`; never delete billing history.

## Swagger
- Available at `/api/docs`, tag `Billing`. Documents checkout and webhook endpoints with request/response schemas.

## Prisma & Config
- Prisma v7 uses `prisma.config.ts` for datasource URL.
- Schema contains `Workspace` billing fields and `StripeEvent` for webhook logs.
- Client is generated with `npx prisma generate`.

## Testing (Test Mode)
- Use Stripe CLI:
  - `stripe listen --forward-to http://localhost:8080/api/billing/webhook`
  - Complete Checkout via the returned URL.
- Confirm DB writes in Prisma Studio: `stripeCustomerId`, `stripeSubscriptionId`, `planExpiresAt`, `stripePriceId`, `billingInterval` become non‑null after events.
