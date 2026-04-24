-- AlterTable: adiciona coluna costCenter em KpiProducao (default ALURA para dados existentes)
ALTER TABLE "KpiProducao" ADD COLUMN "costCenter" TEXT NOT NULL DEFAULT 'ALURA';

-- DropIndex: remove índice único antigo (apenas month)
DROP INDEX "KpiProducao_month_key";

-- CreateIndex: novo índice único composto (month + costCenter)
CREATE UNIQUE INDEX "KpiProducao_month_costCenter_key" ON "KpiProducao"("month", "costCenter");
