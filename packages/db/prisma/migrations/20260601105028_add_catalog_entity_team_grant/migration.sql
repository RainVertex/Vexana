-- CreateTable
CREATE TABLE "CatalogEntityTeamGrant" (
    "entityId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogEntityTeamGrant_pkey" PRIMARY KEY ("entityId","teamId")
);

-- CreateIndex
CREATE INDEX "CatalogEntityTeamGrant_teamId_idx" ON "CatalogEntityTeamGrant"("teamId");

-- AddForeignKey
ALTER TABLE "CatalogEntityTeamGrant" ADD CONSTRAINT "CatalogEntityTeamGrant_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "CatalogEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogEntityTeamGrant" ADD CONSTRAINT "CatalogEntityTeamGrant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
