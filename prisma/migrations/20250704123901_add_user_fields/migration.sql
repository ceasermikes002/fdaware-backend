/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('FOOD_MANUFACTURER', 'SUPPLEMENT_MANUFACTURER', 'BEVERAGE_COMPANY', 'REGULATORY_CONSULTANT', 'OTHER');

-- CreateEnum
CREATE TYPE "TeamSize" AS ENUM ('JUST_ME', 'TWO_TO_FIVE', 'SIX_TO_TWENTY', 'TWENTY_PLUS');

-- CreateEnum
CREATE TYPE "LabelsPerMonth" AS ENUM ('ONE_TO_FIVE', 'SIX_TO_TWENTY', 'TWENTY_ONE_TO_FIFTY', 'FIFTY_PLUS');

-- CreateEnum
CREATE TYPE "Goals" AS ENUM ('REDUCE_COSTS', 'SPEED_LAUNCH', 'AVOID_WARNING_LETTERS', 'IMPROVE_ACCURACY', 'STREAMLINE_WORKFLOW', 'ALL_OF_THE_ABOVE');

-- CreateEnum
CREATE TYPE "ComplianceProcess" AS ENUM ('EXTERNAL_CONSULTANTS', 'IN_HOUSE_TEAM', 'MANUAL_REVIEW', 'NO_FORMAL_PROCESS');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "agreeToTerms" BOOLEAN,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyType" "CompanyType" NOT NULL,
    "teamSize" "TeamSize" NOT NULL,
    "labelsPerMonth" "LabelsPerMonth" NOT NULL,
    "goals" "Goals"[],
    "complianceProcess" "ComplianceProcess" NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
