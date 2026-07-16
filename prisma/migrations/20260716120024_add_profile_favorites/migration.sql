-- CreateTable
CREATE TABLE "ProfileFavorite" (
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "posterUrl" TEXT,
    "releaseYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileFavorite_pkey" PRIMARY KEY ("userId","tmdbId","mediaType")
);

-- CreateIndex
CREATE INDEX "ProfileFavorite_userId_createdAt_idx" ON "ProfileFavorite"("userId", "createdAt");
