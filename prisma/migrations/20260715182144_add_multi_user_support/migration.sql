-- DropIndex
DROP INDEX "Title_status_releaseYear_idx";

-- DropIndex
DROP INDEX "Title_tmdbId_mediaType_key";

-- AlterTable
ALTER TABLE "Title" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "theme" TEXT,
    "watchedSortKey" TEXT,
    "watchlistSortKey" TEXT,
    "region" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "Title_userId_status_releaseYear_idx" ON "Title"("userId", "status", "releaseYear");

-- CreateIndex
CREATE UNIQUE INDEX "Title_tmdbId_mediaType_userId_key" ON "Title"("tmdbId", "mediaType", "userId");

