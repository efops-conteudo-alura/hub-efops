# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Hub de Eficiência Operacional — Alura (EfOps)

Hub interno do departamento de conteúdo da Alura. Centraliza KPIs de produção, publicações, gastos, automações, processos, documentações, licenças e relatórios.

---

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19
- **Banco de dados:** PostgreSQL via Prisma ORM
- **Autenticação:** NextAuth v4 (credentials provider, roles: ADMIN | USER)
- **UI:** shadcn/ui + Tailwind CSS v4 + lucide-react
- **Formulários:** react-hook-form + zod
- **Editor de texto rico:** TipTap (starter-kit, link, placeholder, table, suggestion)
- **Flow/diagramas:** @xyflow/react
- **Gráficos:** Recharts
- **Import de DOCX:** mammoth
- **Import de XLSX:** xlsx

---

## Comandos úteis

```bash
npm run dev                      # inicia em desenvolvimento (sem Turbopack)
npm run build                    # prisma generate + next build
npm run lint                     # ESLint 9
npx prisma migrate dev           # aplica migrations + gera client
npx prisma studio                # interface visual do banco
npx tsx scripts/create-admin.ts  # cria usuário admin inicial
```

> **Nota:** O Turbopack às vezes não faz hot reload de client components — reiniciar o servidor resolve.

---

## Estrutura de pastas

```
src/
  app/
    (auth)/         → páginas públicas: login, criar-senha, primeiro-acesso
    (dashboard)/    → páginas protegidas pelo middleware
      <modulo>/
        page.tsx              → Server Component (busca dados via Prisma direto)
        layout.tsx            → quando necessário
        _components/          → componentes exclusivos do módulo
    api/
      <modulo>/
        route.ts              → GET, POST
        [id]/route.ts         → GET, PUT, DELETE
    setup/                    → setup inicial do sistema
    cadastro-instrutor/       → página pública de cadastro
    relatorios/responder/     → página pública para responder formulários
  components/                 → componentes globais (sidebar, profile, theme)
  components/ui/              → componentes shadcn (nunca editar manualmente)
  lib/                        → auth.ts, db.ts, utils.ts, crypto.ts, super-admins.ts
  types/next-auth.d.ts        → extensão dos tipos do NextAuth (Session + JWT com id e role)
  middleware.ts               → proteção de rotas autenticadas
prisma/
  schema.prisma               → fonte da verdade do banco
scripts/                      → scripts utilitários (ex: create-admin.ts)
```

---

## Convenções de código

### Componentes
- Server Components por padrão em `page.tsx` — buscar dados com Prisma diretamente, sem `useEffect`
- `"use client"` apenas quando necessário (interatividade, hooks, formulários)
- Componentes de página ficam em `_components/` dentro do módulo
- Componentes compartilhados ficam em `src/components/`
- Nunca editar arquivos em `src/components/ui/` — usar `npx shadcn add <componente>`

### API Routes (App Router)
Padrão para todas as rotas:

```ts
// src/app/api/<modulo>/route.ts
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // ...
}
```

- Sempre verificar sessão em rotas protegidas
- Rotas de admin verificam `session.user.role === "ADMIN"`
- Retornar `NextResponse.json(data)` ou `new Response("mensagem", { status: xxx })`

### Prisma
- Importar sempre de `@/lib/db`: `import { prisma } from "@/lib/db"` (o export é `prisma`, não `db`)
- Nunca importar direto de `@prisma/client` no código da aplicação
- Não alterar `src/generated/prisma/` manualmente — é gerado pelo Prisma
- Após alterar `schema.prisma`: rodar `npx prisma migrate dev` (já inclui generate)

### Formulários
- Sempre usar react-hook-form + zod para validação
- Schema zod definido no mesmo arquivo do componente ou em arquivo `_schema.ts` separado

### Estilo
- Usar classes Tailwind + utilitários do shadcn (`cn()` de `@/lib/utils`)
- Tema dark/light via next-themes (já configurado em `providers.tsx`)
- Ícones exclusivamente via lucide-react

---

## Autenticação e permissões

- Middleware (`src/middleware.ts`) protege todas as rotas exceto:
  `api/auth`, `api/setup`, `api/relatorios/form`, `login`, `setup`, `relatorios/responder`, `primeiro-acesso`
- Rotas `/api/admin/**` exigem `role === "ADMIN"`
- Super admins hardcoded em `src/lib/super-admins.ts`
- Primeiro acesso: usuário recebe e-mail, define senha via `/criar-senha`
- O JWT inclui `id` e `role` além dos campos padrão do NextAuth (tipos em `src/types/next-auth.d.ts`)
- Imagem do usuário nunca vai pro JWT (evita cookie > 4KB com base64)

---

## Módulos e responsabilidades

| Módulo | Rota | O que faz | Sincroniza com |
|---|---|---|---|
| Home | `/home` | Dashboard de boas-vindas | — |
| KPIs | `/kpis` | Produção mensal, edição, pesos e níveis de carreiras | API Alura (carreiras) |
| Publicações | `/publicacoes` | Catálogo de cursos, trilhas, artigos e carreiras | API Alura |
| Gastos | `/gastos` e `/gastos/categorias` | Controle de despesas do departamento | ClickUp (tasks) |
| Relatórios | `/relatorios` | Builder de formulários + coleta de respostas via link público | — |
| Processos | `/processos` | Documentação de processos com flow (@xyflow) e rich text (TipTap) | — |
| Documentações | `/documentacoes` | Wiki interna com editor TipTap + import DOCX | — |
| Automações | `/automacoes` | Catálogo de automações e agentes do time | — |
| Licenças | `/licencas` | Gestão de licenças/assinaturas com audit trail | — |
| Admin | `/admin/usuarios` | Gestão de usuários e e-mails permitidos | — |
| Analytics | `/dashboard` | Visão consolidada (sempre por último na sidebar) | — |

---

## Modelos principais do banco

- `User` — usuários do sistema (ADMIN | USER), senha em bcrypt
- `AllowedEmail` — whitelist de e-mails autorizados a criar conta
- `Subscription` — licenças; `loginPass` armazenado cifrado via `src/lib/crypto.ts` (AES-256-GCM)
- `SubscriptionAudit` — histórico de alterações de licenças (`{ field: { from, to } }`)
- `Automation` — automações/agentes (ACTIVE | INACTIVE | TESTING)
- `Expense` — gastos; `month` em formato `"YYYY-MM"`, `externalId` único para deduplicação ClickUp
- `Process` — `flowData` e `richText` armazenados como `JSON.stringify(...)` (strings, não JSON nativo)
- `Documentation` — `content` como JSON (TipTap) ou HTML string (import .docx)
- `Report` + `ReportResponse` — formulários dinâmicos com `token` público único
- `KpiProducao`, `KpiEdicao`, `KpiPesos`, `KpiAno` — dados de produção e edição
- `KpiCarreiraLevel` — níveis de carreiras sincronizados do site Alura
- `AluraCourse`, `AluraArtigo`, `AluraTrilha` — catálogo sincronizado da Alura

---

## Padrões de sync com APIs externas

Rotas de sync seguem o padrão:

```ts
// POST /api/<modulo>/sync
// 1. Busca dados da API externa
// 2. Upsert no banco (createOrUpdate por slug/externalId)
// 3. Retorna { created, updated, total }
```

Exemplos existentes: `gastos/sync-clickup`, `kpis/carreiras/sync`, `publicacoes/cursos/sync`

---

## O que NÃO fazer

- Não usar `fetch()` no servidor para buscar dados internos — usar Prisma direto
- Não criar componentes em `src/components/ui/` — usar `npx shadcn add <componente>`
- Não usar `any` no TypeScript — tipar sempre
- Não expor senhas ou dados sensíveis nas respostas de API
- Não alterar `src/generated/prisma/` manualmente — é gerado pelo Prisma
- Não importar `{ db }` de `@/lib/db` — o export correto é `{ prisma }`
