/*
  Warnings:

  - You are about to drop the `PlaneUserCredential` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PlaneUserCredential" DROP CONSTRAINT "PlaneUserCredential_integrationId_fkey";

-- DropForeignKey
ALTER TABLE "PlaneUserCredential" DROP CONSTRAINT "PlaneUserCredential_userId_fkey";

-- DropTable
DROP TABLE "PlaneUserCredential";
