-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MOVIE', 'TV');

-- CreateEnum
CREATE TYPE "TitleStatus" AS ENUM ('WATCHED', 'WATCHLIST');

-- CreateTable
CREATE TABLE "Title" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "releaseYear" INTEGER,
    "releaseDate" TIMESTAMP(3),
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "overview" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "voteAverage" DOUBLE PRECISION,
    "runtime" INTEGER,
    "status" "TitleStatus" NOT NULL,
    "watchUrl" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingItem" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "releaseYear" INTEGER,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "overview" TEXT,
    "voteAverage" DOUBLE PRECISION,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Title_status_releaseYear_idx" ON "Title"("status", "releaseYear");

-- CreateIndex
CREATE UNIQUE INDEX "Title_tmdbId_mediaType_key" ON "Title"("tmdbId", "mediaType");

-- CreateIndex
CREATE UNIQUE INDEX "TrendingItem_tmdbId_mediaType_key" ON "TrendingItem"("tmdbId", "mediaType");
