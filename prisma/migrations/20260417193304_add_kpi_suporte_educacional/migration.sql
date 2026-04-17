-- CreateTable
CREATE TABLE "KpiSuporteEducacional" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "topicosRespondidos" INTEGER NOT NULL DEFAULT 0,
    "slaMedio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "artigosCriados" INTEGER NOT NULL DEFAULT 0,
    "artigosRevisados" INTEGER NOT NULL DEFAULT 0,
    "imersoes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiSuporteEducacional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KpiSuporteEducacional_month_key" ON "KpiSuporteEducacional"("month");
