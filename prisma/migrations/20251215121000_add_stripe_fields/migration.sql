-- Add Stripe fields to Workspace
ALTER TABLE "Workspace"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
