-- CreateTable
CREATE TABLE "ScorecardEntitySnapshot" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "scorePercent" DOUBLE PRECISION NOT NULL,
    "rulesPassed" INTEGER NOT NULL,
    "rulesTotal" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScorecardEntitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScorecardEntitySnapshot_scorecardId_entityId_capturedAt_idx" ON "ScorecardEntitySnapshot"("scorecardId", "entityId", "capturedAt");

-- CreateIndex
CREATE INDEX "ScorecardEntitySnapshot_entityId_idx" ON "ScorecardEntitySnapshot"("entityId");

-- AddForeignKey
ALTER TABLE "ScorecardEntitySnapshot" ADD CONSTRAINT "ScorecardEntitySnapshot_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "Scorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardEntitySnapshot" ADD CONSTRAINT "ScorecardEntitySnapshot_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "CatalogEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
