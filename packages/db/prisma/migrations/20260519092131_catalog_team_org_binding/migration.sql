/*
  Warnings:

  - Added the required column `accountLogin` to the `CatalogEntity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountLogin` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CatalogEntity" ADD COLUMN     "accountLogin" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "accountLogin" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "CatalogEntity_accountLogin_idx" ON "CatalogEntity"("accountLogin");

-- CreateIndex
CREATE INDEX "Team_accountLogin_idx" ON "Team"("accountLogin");
