-- AlterTable
ALTER TABLE "LlmModel" ADD COLUMN "costPer1kCacheRead" DECIMAL(10,6),
ADD COLUMN "costPer1kCacheWrite" DECIMAL(10,6);
