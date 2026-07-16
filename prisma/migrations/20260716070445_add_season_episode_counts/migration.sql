-- AlterTable
ALTER TABLE "Title" ADD COLUMN     "seasonEpisodeCounts" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
