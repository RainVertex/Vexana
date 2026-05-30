-- AlterTable: Project gains catalog link and installation reference, creatorUserId becomes optional
ALTER TABLE "Project" DROP CONSTRAINT "Project_creatorUserId_fkey";
ALTER TABLE "Project" ALTER COLUMN "creatorUserId" DROP NOT NULL;
ALTER TABLE "Project" ADD COLUMN "catalogEntityId" TEXT;
ALTER TABLE "Project" ADD COLUMN "installationId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Project_catalogEntityId_key" ON "Project"("catalogEntityId");
CREATE INDEX "Project_installationId_idx" ON "Project"("installationId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_catalogEntityId_fkey" FOREIGN KEY ("catalogEntityId") REFERENCES "CatalogEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data: rename existing Backlog buckets to To-Do (kanban default column rename)
UPDATE "Bucket" SET "title" = 'To-Do' WHERE "title" = 'Backlog';
