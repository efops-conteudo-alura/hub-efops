-- Converte costCenter de TEXT para o enum ExpenseCostCenter
ALTER TABLE "KpiProducao" ALTER COLUMN "costCenter" DROP DEFAULT;
ALTER TABLE "KpiProducao" ALTER COLUMN "costCenter" TYPE "ExpenseCostCenter" USING "costCenter"::"ExpenseCostCenter";
ALTER TABLE "KpiProducao" ALTER COLUMN "costCenter" SET DEFAULT 'ALURA'::"ExpenseCostCenter";
