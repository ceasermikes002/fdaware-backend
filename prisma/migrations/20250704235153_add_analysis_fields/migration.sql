-- AlterTable
ALTER TABLE "LabelVersion" ADD COLUMN     "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "compliantItems" JSONB,
ADD COLUMN     "overallScore" INTEGER;

-- AlterTable
ALTER TABLE "Violation" ADD COLUMN     "category" TEXT DEFAULT 'General',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "severity" TEXT DEFAULT 'medium';
