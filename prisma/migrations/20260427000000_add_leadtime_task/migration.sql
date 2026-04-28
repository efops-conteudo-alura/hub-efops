-- CreateTable: LeadtimeTask — armazena tasks sincronizadas do ClickUp para cálculo de leadtime
CREATE TABLE "LeadtimeTask" (
    "id" TEXT NOT NULL,
    "clickupTaskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "regiao" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "leadtimeDias" DOUBLE PRECISION,
    "dataGravInicio" TIMESTAMP(3),
    "dataGravFim" TIMESTAMP(3),
    "leadtimeGravacao" DOUBLE PRECISION,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadtimeTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadtimeTask_clickupTaskId_key" ON "LeadtimeTask"("clickupTaskId");

-- CreateIndex
CREATE INDEX "LeadtimeTask_regiao_idx" ON "LeadtimeTask"("regiao");

-- CreateIndex
CREATE INDEX "LeadtimeTask_listId_idx" ON "LeadtimeTask"("listId");
