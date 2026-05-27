-- CreateTable
CREATE TABLE "PlaneOAuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "planeUserId" TEXT NOT NULL,
    "planeEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaneOAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaneOAuthToken_integrationId_idx" ON "PlaneOAuthToken"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaneOAuthToken_userId_integrationId_key" ON "PlaneOAuthToken"("userId", "integrationId");

-- AddForeignKey
ALTER TABLE "PlaneOAuthToken" ADD CONSTRAINT "PlaneOAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaneOAuthToken" ADD CONSTRAINT "PlaneOAuthToken_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
