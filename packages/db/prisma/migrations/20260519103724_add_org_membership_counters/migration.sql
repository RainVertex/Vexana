-- AlterTable
ALTER TABLE "GithubReconciliationRun" ADD COLUMN     "orgMembershipsAdded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "orgMembershipsRemoved" INTEGER NOT NULL DEFAULT 0;
