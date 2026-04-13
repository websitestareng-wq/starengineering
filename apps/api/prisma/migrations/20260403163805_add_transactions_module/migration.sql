-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALES', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'DEBIT_NOTE', 'CREDIT_NOTE', 'JOURNAL_DR', 'JOURNAL_CR');

-- CreateEnum
CREATE TYPE "EntrySide" AS ENUM ('DR', 'CR');

-- CreateEnum
CREATE TYPE "BillAllocationType" AS ENUM ('NEW_REF', 'AGAINST_REF', 'ADVANCE', 'ON_ACCOUNT');

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "voucherDate" TIMESTAMP(3) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "side" "EntrySide" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "particulars" TEXT NOT NULL,
    "sendEmail" BOOLEAN NOT NULL DEFAULT false,
    "partyId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionBillRow" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "allocationType" "BillAllocationType" NOT NULL,
    "side" "EntrySide" NOT NULL,
    "refNo" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "againstBillRowId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionBillRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionAttachment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeInBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transaction_partyId_idx" ON "Transaction"("partyId");

-- CreateIndex
CREATE INDEX "Transaction_createdById_idx" ON "Transaction"("createdById");

-- CreateIndex
CREATE INDEX "Transaction_voucherDate_idx" ON "Transaction"("voucherDate");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_side_idx" ON "Transaction"("side");

-- CreateIndex
CREATE INDEX "Transaction_voucherNo_idx" ON "Transaction"("voucherNo");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_voucherNo_type_voucherDate_key" ON "Transaction"("voucherNo", "type", "voucherDate");

-- CreateIndex
CREATE INDEX "TransactionBillRow_transactionId_idx" ON "TransactionBillRow"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionBillRow_allocationType_idx" ON "TransactionBillRow"("allocationType");

-- CreateIndex
CREATE INDEX "TransactionBillRow_side_idx" ON "TransactionBillRow"("side");

-- CreateIndex
CREATE INDEX "TransactionBillRow_refNo_idx" ON "TransactionBillRow"("refNo");

-- CreateIndex
CREATE INDEX "TransactionBillRow_againstBillRowId_idx" ON "TransactionBillRow"("againstBillRowId");

-- CreateIndex
CREATE INDEX "TransactionAttachment_transactionId_idx" ON "TransactionAttachment"("transactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionBillRow" ADD CONSTRAINT "TransactionBillRow_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionBillRow" ADD CONSTRAINT "TransactionBillRow_againstBillRowId_fkey" FOREIGN KEY ("againstBillRowId") REFERENCES "TransactionBillRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionAttachment" ADD CONSTRAINT "TransactionAttachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
