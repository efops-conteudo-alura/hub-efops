-- CreateTable
CREATE TABLE "FeriadoAlura" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeriadoAlura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeriadoAlura_ano_data_key" ON "FeriadoAlura"("ano", "data");
