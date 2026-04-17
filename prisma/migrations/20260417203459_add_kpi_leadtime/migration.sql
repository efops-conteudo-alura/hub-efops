-- CreateTable
CREATE TABLE "KpiLeadtime" (
    "id" TEXT NOT NULL,
    "costCenter" "ExpenseCostCenter" NOT NULL DEFAULT 'ALURA',
    "nome" TEXT NOT NULL,
    "dataInicio" TEXT NOT NULL,
    "inicioGravacao" TEXT,
    "fimGravacao" TEXT,
    "inicioEdicao" TEXT,
    "fimEdicao" TEXT,
    "dataConclusao" TEXT,
    "instrutor" TEXT,
    "responsavel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiLeadtime_pkey" PRIMARY KEY ("id")
);
