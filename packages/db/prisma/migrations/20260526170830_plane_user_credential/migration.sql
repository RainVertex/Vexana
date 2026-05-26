-- CreateTable
CREATE TABLE "PlaneUserCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "encryptedApiToken" TEXT NOT NULL,
    "planeMemberExternalId" TEXT NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaneUserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaneUserCredential_integrationId_idx" ON "PlaneUserCredential"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaneUserCredential_userId_integrationId_key" ON "PlaneUserCredential"("userId", "integrationId");

-- AddForeignKey
ALTER TABLE "PlaneUserCredential" ADD CONSTRAINT "PlaneUserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaneUserCredential" ADD CONSTRAINT "PlaneUserCredential_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
