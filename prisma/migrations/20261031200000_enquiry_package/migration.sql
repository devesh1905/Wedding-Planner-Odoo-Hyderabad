-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "planning" TEXT,
ADD COLUMN "estimateLow" INTEGER,
ADD COLUMN "estimateHigh" INTEGER;
