-- CreateTable
CREATE TABLE "EntityObservabilityConfig" (
    "entityId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "upQuery" TEXT,
    "latencyQuery" TEXT,
    "errorQuery" TEXT,
    "logsSelector" TEXT,
    "dashboardUid" TEXT,
    "traceIdRegex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityObservabilityConfig_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "AlertDeliveryState" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "lastFiringAt" TIMESTAMP(3),
    "lastResolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertDeliveryState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityObservabilityConfig_integrationId_idx" ON "EntityObservabilityConfig"("integrationId");

-- CreateIndex
CREATE INDEX "AlertDeliveryState_integrationId_idx" ON "AlertDeliveryState"("integrationId");

-- CreateIndex
CREATE INDEX "AlertDeliveryState_lastResolvedAt_idx" ON "AlertDeliveryState"("lastResolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlertDeliveryState_integrationId_fingerprint_key" ON "AlertDeliveryState"("integrationId", "fingerprint");

-- AddForeignKey
ALTER TABLE "EntityObservabilityConfig" ADD CONSTRAINT "EntityObservabilityConfig_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "CatalogEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityObservabilityConfig" ADD CONSTRAINT "EntityObservabilityConfig_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDeliveryState" ADD CONSTRAINT "AlertDeliveryState_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
