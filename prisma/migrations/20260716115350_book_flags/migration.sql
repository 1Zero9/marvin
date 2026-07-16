-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "favourite" BOOLEAN NOT NULL DEFAULT false;
