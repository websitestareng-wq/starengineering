/*
  Warnings:

  - Added the required column `updatedAt` to the `TransactionAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionAttachmentKind" AS ENUM ('SOURCE', 'MERGED');

-- AlterTable
ALTER TABLE "TransactionAttachment" ADD COLUMN     "isMain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "TransactionAttachmentKind" NOT NULL DEFAULT 'SOURCE',
ADD COLUMN     "sourceOrder" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "TransactionAttachment_kind_idx" ON "TransactionAttachment"("kind");

-- CreateIndex
CREATE INDEX "TransactionAttachment_transactionId_kind_idx" ON "TransactionAttachment"("transactionId", "kind");

-- CreateIndex
CREATE INDEX "TransactionAttachment_transactionId_sourceOrder_idx" ON "TransactionAttachment"("transactionId", "sourceOrder");
