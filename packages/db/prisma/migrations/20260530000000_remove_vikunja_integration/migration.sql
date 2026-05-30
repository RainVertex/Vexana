-- DropForeignKey
ALTER TABLE "VikunjaComment" DROP CONSTRAINT IF EXISTS "VikunjaComment_taskId_fkey";
ALTER TABLE "VikunjaTask" DROP CONSTRAINT IF EXISTS "VikunjaTask_projectId_fkey";
ALTER TABLE "VikunjaTask" DROP CONSTRAINT IF EXISTS "VikunjaTask_bucketId_fkey";
ALTER TABLE "VikunjaTask" DROP CONSTRAINT IF EXISTS "VikunjaTask_parentId_fkey";
ALTER TABLE "VikunjaBucket" DROP CONSTRAINT IF EXISTS "VikunjaBucket_projectId_fkey";
ALTER TABLE "VikunjaLabel" DROP CONSTRAINT IF EXISTS "VikunjaLabel_projectId_fkey";
ALTER TABLE "VikunjaProject" DROP CONSTRAINT IF EXISTS "VikunjaProject_ownerId_fkey";
ALTER TABLE "VikunjaProject" DROP CONSTRAINT IF EXISTS "VikunjaProject_integrationId_fkey";
ALTER TABLE "VikunjaSyncCursor" DROP CONSTRAINT IF EXISTS "VikunjaSyncCursor_integrationId_fkey";

-- DropTable
DROP TABLE IF EXISTS "VikunjaComment";
DROP TABLE IF EXISTS "VikunjaTask";
DROP TABLE IF EXISTS "VikunjaBucket";
DROP TABLE IF EXISTS "VikunjaLabel";
DROP TABLE IF EXISTS "VikunjaSyncCursor";
DROP TABLE IF EXISTS "VikunjaProject";

-- AlterEnum: remove 'vikunja' from IntegrationKind
ALTER TYPE "IntegrationKind" RENAME TO "IntegrationKind_old";
CREATE TYPE "IntegrationKind" AS ENUM ('github', 'jira', 'slack', 'grafana');
ALTER TABLE "Integration" ALTER COLUMN "kind" TYPE "IntegrationKind" USING ("kind"::text::"IntegrationKind");
DROP TYPE "IntegrationKind_old";
