-- CreateTable
CREATE TABLE "MovieNight" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "MovieNight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieNightCandidate" (
    "id" TEXT NOT NULL,
    "movieNightId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "posterUrl" TEXT,
    "releaseYear" INTEGER,
    "addedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieNightCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieNightVote" (
    "candidateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieNightVote_pkey" PRIMARY KEY ("candidateId","userId")
);

-- CreateIndex
CREATE INDEX "MovieNight_status_createdAt_idx" ON "MovieNight"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MovieNightCandidate_movieNightId_idx" ON "MovieNightCandidate"("movieNightId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieNightCandidate_movieNightId_tmdbId_mediaType_key" ON "MovieNightCandidate"("movieNightId", "tmdbId", "mediaType");

-- CreateIndex
CREATE INDEX "MovieNightVote_candidateId_idx" ON "MovieNightVote"("candidateId");
