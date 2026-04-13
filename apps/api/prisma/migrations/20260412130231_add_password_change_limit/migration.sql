-- AlterTable
ALTER TABLE "Reminder" ALTER COLUMN "category" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastPasswordChangedAt" TIMESTAMP(3);
