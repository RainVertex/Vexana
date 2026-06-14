-- CreateTable
CREATE TABLE "AgentMcpServer" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "authKind" TEXT NOT NULL DEFAULT 'none',
    "bearerToken" BYTEA,
    "oauthScope" TEXT,
    "oauthClientInfo" BYTEA,
    "oauthDiscovery" JSONB,
    "toolAllowlist" JSONB NOT NULL DEFAULT '[]',
    "toolPrefix" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastError" TEXT,
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMcpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOAuthToken" (
    "id" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" BYTEA NOT NULL,
    "refreshToken" BYTEA,
    "tokenType" TEXT,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpOAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOAuthFlow" (
    "id" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeVerifier" BYTEA NOT NULL,
    "redirectTo" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpOAuthFlow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentMcpServer_agentId_idx" ON "AgentMcpServer"("agentId");

-- CreateIndex
CREATE INDEX "McpOAuthToken_userId_idx" ON "McpOAuthToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "McpOAuthToken_mcpServerId_userId_key" ON "McpOAuthToken"("mcpServerId", "userId");

-- CreateIndex
CREATE INDEX "McpOAuthFlow_userId_idx" ON "McpOAuthFlow"("userId");

-- CreateIndex
CREATE INDEX "McpOAuthFlow_expiresAt_idx" ON "McpOAuthFlow"("expiresAt");

-- AddForeignKey
ALTER TABLE "AgentMcpServer" ADD CONSTRAINT "AgentMcpServer_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "AgentMcpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthFlow" ADD CONSTRAINT "McpOAuthFlow_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "AgentMcpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthFlow" ADD CONSTRAINT "McpOAuthFlow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
