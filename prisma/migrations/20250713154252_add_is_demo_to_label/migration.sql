/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Label` table. All the data in the column will be lost.
  - You are about to drop the column `paddleSubscriptionId` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `Workspace` table. All the data in the column will be lost.
  - You are about to drop the column `planExpiresAt` on the `Workspace` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Invitation" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '2 days';

-- AlterTable
ALTER TABLE "Label" DROP COLUMN "createdAt",
ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Workspace" DROP COLUMN "paddleSubscriptionId",
DROP COLUMN "plan",
DROP COLUMN "planExpiresAt";

-- DropEnum
DROP TYPE "Plan";
