-- CreateEnum
CREATE TYPE "ExpenseCostCenter" AS ENUM ('ALURA', 'LATAM');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "costCenter" "ExpenseCostCenter" NOT NULL DEFAULT 'ALURA';
