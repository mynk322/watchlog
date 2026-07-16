-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "mediaType" "MediaType",
ADD COLUMN     "tmdbId" INTEGER;

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "posterUrl" TEXT,
    "releaseYear" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suggestion_toUserId_dismissedAt_createdAt_idx" ON "Suggestion"("toUserId", "dismissedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Suggestion_fromUserId_toUserId_tmdbId_mediaType_key" ON "Suggestion"("fromUserId", "toUserId", "tmdbId", "mediaType");
