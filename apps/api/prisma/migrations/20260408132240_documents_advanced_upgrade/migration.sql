-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "folderName" TEXT,
ADD COLUMN     "remindBeforeDays" INTEGER DEFAULT 7;

-- CreateIndex
CREATE INDEX "Document_folderName_idx" ON "Document"("folderName");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");
