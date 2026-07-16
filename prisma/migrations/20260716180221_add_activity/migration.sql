-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tmdbId" INTEGER,
    "mediaType" "MediaType",
    "title" TEXT,
    "posterUrl" TEXT,
    "releaseYear" INTEGER,
    "rating" DOUBLE PRECISION,
    "season" INTEGER,
    "listId" TEXT,
    "listName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");
