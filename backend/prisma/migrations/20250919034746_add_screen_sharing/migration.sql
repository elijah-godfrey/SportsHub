-- CreateEnum
CREATE TYPE "public"."ScreenShareStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateTable
CREATE TABLE "public"."screen_share_sessions" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "gameId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."ScreenShareStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "maxViewers" INTEGER DEFAULT 50,
    "currentViewers" INTEGER NOT NULL DEFAULT 0,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screen_share_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."screen_share_viewers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "screen_share_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "screen_share_sessions_status_isPublic_startedAt_idx" ON "public"."screen_share_sessions"("status", "isPublic", "startedAt");

-- CreateIndex
CREATE INDEX "screen_share_sessions_hostUserId_status_idx" ON "public"."screen_share_sessions"("hostUserId", "status");

-- CreateIndex
CREATE INDEX "screen_share_sessions_gameId_status_idx" ON "public"."screen_share_sessions"("gameId", "status");

-- CreateIndex
CREATE INDEX "screen_share_viewers_sessionId_isActive_idx" ON "public"."screen_share_viewers"("sessionId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "screen_share_viewers_sessionId_userId_key" ON "public"."screen_share_viewers"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "public"."screen_share_sessions" ADD CONSTRAINT "screen_share_sessions_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."screen_share_sessions" ADD CONSTRAINT "screen_share_sessions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."screen_share_viewers" ADD CONSTRAINT "screen_share_viewers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."screen_share_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."screen_share_viewers" ADD CONSTRAINT "screen_share_viewers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
