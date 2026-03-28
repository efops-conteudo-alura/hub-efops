-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUALLY', 'ONE_TIME', 'USAGE');

-- CreateEnum
CREATE TYPE "LoginType" AS ENUM ('PASSWORD', 'CODE');

-- CreateEnum
CREATE TYPE "AutomationType" AS ENUM ('AUTOMATION', 'AGENT');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TESTING');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('INSTRUTOR', 'EDITOR_FREELANCER', 'EDITOR_EXTERNO', 'SUPORTE_EDUCACIONAL', 'OUTROS');

-- CreateEnum
CREATE TYPE "ExpenseSource" AS ENUM ('CLICKUP', 'UPLOAD', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "DocumentationStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('FORM', 'AI_ANALYSIS');

-- CreateEnum
CREATE TYPE "ColaboradorTipo" AS ENUM ('NORMAL', 'LIDER', 'ESPECIAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planName" TEXT,
    "description" TEXT,
    "url" TEXT,
    "loginUser" TEXT,
    "loginPass" TEXT,
    "loginType" "LoginType" NOT NULL DEFAULT 'PASSWORD',
    "cost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "costCenter" TEXT,
    "team" TEXT,
    "responsible" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "renewalDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsefulLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsefulLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "conteudo" TEXT NOT NULL,
    "categoria" TEXT,
    "autorId" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "responsible" TEXT,
    "repoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AutomationType" NOT NULL DEFAULT 'AUTOMATION',
    "shortDesc" TEXT,
    "fullDesc" TEXT,
    "thumbnailUrl" TEXT,
    "link" TEXT,
    "status" "AutomationStatus" NOT NULL DEFAULT 'ACTIVE',
    "creator" TEXT,
    "tools" TEXT[],
    "roiHoursSaved" DOUBLE PRECISION,
    "roiMonthlySavings" DOUBLE PRECISION,
    "roiDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "date" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT,
    "source" "ExpenseSource" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "status" "ProcessStatus" NOT NULL DEFAULT 'DRAFT',
    "creatorId" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "flowData" TEXT,
    "richText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documentation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "tags" TEXT[],
    "status" "DocumentationStatus" NOT NULL DEFAULT 'DRAFT',
    "creatorId" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "fields" JSONB NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "ReportType" NOT NULL DEFAULT 'FORM',
    "aiInstructions" TEXT,
    "aiNeedsFile" BOOLEAN NOT NULL DEFAULT false,
    "aiNeedsDate" BOOLEAN NOT NULL DEFAULT false,
    "aiOutputFormat" TEXT NOT NULL DEFAULT 'text',
    "aiNeedsClickup" BOOLEAN NOT NULL DEFAULT false,
    "aiClickupListIds" TEXT,
    "aiHasPresentation" BOOLEAN NOT NULL DEFAULT false,
    "isAdminOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportResponse" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnaliseResult" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "resultado" TEXT NOT NULL,
    "resultadoApresentacao" TEXT,
    "gammaUrl" TEXT,
    "totalRows" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAnaliseResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiAno" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiAno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiPesos" (
    "id" TEXT NOT NULL,
    "curso" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "artigo" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "carreira" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "nivel" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "trilha" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "KpiPesos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiProducao" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "cursos" INTEGER NOT NULL DEFAULT 0,
    "artigos" INTEGER NOT NULL DEFAULT 0,
    "carreiras" INTEGER NOT NULL DEFAULT 0,
    "niveis" INTEGER NOT NULL DEFAULT 0,
    "trilhas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiCarreiraLevel" (
    "id" TEXT NOT NULL,
    "carreiraSlug" TEXT NOT NULL,
    "carreiraName" TEXT NOT NULL,
    "levelName" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "firstPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiCarreiraLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AluraCourse" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "metadescription" TEXT,
    "categoria" TEXT,
    "subcategoria" TEXT,
    "instrutores" TEXT[],
    "cargaHoraria" INTEGER,
    "dataPublicacao" TIMESTAMP(3),
    "aluraId" INTEGER,
    "instrutor" TEXT,
    "nivel" TEXT,
    "statusPub" TEXT,
    "statusCriacao" TEXT,
    "tipoContrato" TEXT,
    "tipo" TEXT,
    "catalogos" TEXT[],
    "subcategorias" TEXT,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "ementa" TEXT,
    "finishingAction" TEXT,
    "targetPublic" TEXT,
    "highlightedInformation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AluraCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AluraArtigo" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "autor" TEXT,
    "categoria" TEXT,
    "dataPublicacao" TIMESTAMP(3),
    "dataModificacao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AluraArtigo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AluraTrilha" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT,
    "numCursos" INTEGER,
    "cargaHoraria" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AluraTrilha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowedEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "originalData" JSONB NOT NULL,
    "submittedData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "exportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmentaAnalise" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "ementaOriginal" TEXT NOT NULL,
    "avaliacao" TEXT NOT NULL,
    "sugestaoEmenta" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmentaAnalise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PesquisaMercado" (
    "id" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "tipoConteudo" TEXT NOT NULL,
    "tipoPesquisa" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "eixos" TEXT[],
    "focoGeo" TEXT NOT NULL,
    "plataformas" TEXT,
    "resultado" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "autorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PesquisaMercado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionAudit" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriptionName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiEdicao" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "correcoes" INTEGER NOT NULL DEFAULT 0,
    "entregasConteudo" INTEGER NOT NULL DEFAULT 0,
    "entregasStart" INTEGER NOT NULL DEFAULT 0,
    "entregasLatam" INTEGER NOT NULL DEFAULT 0,
    "entregasMarketing" INTEGER NOT NULL DEFAULT 0,
    "entregasOutras" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiEdicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImobilizacaoPeriodo" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "feriados" INTEGER NOT NULL DEFAULT 0,
    "diasUteis" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImobilizacaoPeriodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImobilizacaoEntry" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "timeId" TEXT,
    "colaboradorNome" TEXT NOT NULL,
    "colaboradorMatricula" TEXT,
    "cargaHorariaTotal" INTEGER,
    "cargaHorariaDiaria" INTEGER,
    "produtoTipo" TEXT,
    "produtoId" TEXT,
    "produtoNome" TEXT NOT NULL,
    "horas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImobilizacaoEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImobilizacaoTime" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "clickupListId" TEXT NOT NULL,
    "clickupListIdsAdicionais" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImobilizacaoTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImobilizacaoColaborador" (
    "id" TEXT NOT NULL,
    "timeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "clickupUsername" TEXT,
    "matricula" TEXT,
    "cargaHorariaDiaria" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "tipo" "ColaboradorTipo" NOT NULL DEFAULT 'NORMAL',
    "regraJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImobilizacaoColaborador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AppRole_userId_app_key" ON "AppRole"("userId", "app");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_externalId_key" ON "Expense"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_token_key" ON "Report"("token");

-- CreateIndex
CREATE UNIQUE INDEX "KpiAno_year_key" ON "KpiAno"("year");

-- CreateIndex
CREATE UNIQUE INDEX "KpiProducao_month_key" ON "KpiProducao"("month");

-- CreateIndex
CREATE UNIQUE INDEX "KpiCarreiraLevel_carreiraSlug_levelName_key" ON "KpiCarreiraLevel"("carreiraSlug", "levelName");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AluraCourse_slug_key" ON "AluraCourse"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AluraCourse_aluraId_key" ON "AluraCourse"("aluraId");

-- CreateIndex
CREATE UNIQUE INDEX "AluraArtigo_slug_key" ON "AluraArtigo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AluraTrilha_slug_key" ON "AluraTrilha"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AllowedEmail_email_key" ON "AllowedEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KpiEdicao_month_key" ON "KpiEdicao"("month");

-- CreateIndex
CREATE UNIQUE INDEX "ImobilizacaoPeriodo_ano_mes_key" ON "ImobilizacaoPeriodo"("ano", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "ImobilizacaoEntry_periodoId_colaboradorNome_produtoNome_key" ON "ImobilizacaoEntry"("periodoId", "colaboradorNome", "produtoNome");

-- AddForeignKey
ALTER TABLE "AppRole" ADD CONSTRAINT "AppRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportResponse" ADD CONSTRAINT "ReportResponse_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAnaliseResult" ADD CONSTRAINT "AiAnaliseResult_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImobilizacaoEntry" ADD CONSTRAINT "ImobilizacaoEntry_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "ImobilizacaoPeriodo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImobilizacaoEntry" ADD CONSTRAINT "ImobilizacaoEntry_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "ImobilizacaoTime"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImobilizacaoColaborador" ADD CONSTRAINT "ImobilizacaoColaborador_timeId_fkey" FOREIGN KEY ("timeId") REFERENCES "ImobilizacaoTime"("id") ON DELETE CASCADE ON UPDATE CASCADE;
