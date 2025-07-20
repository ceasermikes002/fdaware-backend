-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('LITE', 'TEAM', 'SCALE');

-- AlterTable
ALTER TABLE "Invitation" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '2 days';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "paddleSubscriptionId" TEXT,
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'LITE',
ADD COLUMN     "planExpiresAt" TIMESTAMP(3);
