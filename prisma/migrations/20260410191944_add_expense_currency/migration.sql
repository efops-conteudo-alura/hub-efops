-- CreateEnum
CREATE TYPE "ExpenseCurrency" AS ENUM ('BRL', 'USD');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "currency" "ExpenseCurrency" NOT NULL DEFAULT 'BRL',
ADD COLUMN     "exchangeRate" DOUBLE PRECISION;
