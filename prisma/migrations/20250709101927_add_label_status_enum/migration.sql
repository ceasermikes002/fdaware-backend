/*
  Warnings:

  - Changed the type of `status` on the `LabelVersion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LabelStatus" AS ENUM ('SCANNED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Invitation" ALTER COLUMN "expiresAt" SET DEFAULT now() + interval '2 days';

-- AlterTable
ALTER TABLE "LabelVersion" DROP COLUMN "status",
ADD COLUMN     "status" "LabelStatus" NOT NULL;
