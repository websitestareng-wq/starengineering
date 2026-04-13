-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "lastCredentialSentAt" TIMESTAMP(3),
ADD COLUMN     "pan" TEXT;

-- CreateIndex
CREATE INDEX "User_gstin_idx" ON "User"("gstin");

-- CreateIndex
CREATE INDEX "User_pan_idx" ON "User"("pan");
