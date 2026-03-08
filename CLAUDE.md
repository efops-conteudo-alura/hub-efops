# Hub de Eficiência Operacional — Alura (EfOps)

Hub interno do departamento de conteúdo da Alura. Centraliza KPIs de produção, publicações, gastos, automações, processos, documentações, licenças e relatórios.

---

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Banco de dados:** PostgreSQL via Prisma ORM (`src/generated/prisma`)
- **Autenticação:** NextAuth v4 (credentials provider, roles: ADMIN | USER)
- **UI:** shadcn/ui + Tailwind CSS v4 + lucide-react
- **Formulários:** react-hook-form + zod
- **Editor de texto rico:** TipTap (starter-kit, link, placeholder, table, suggestion)
- **Flow/diagramas:** @xyflow/react
- **Gráficos:** Recharts
- **Import de DOCX:** mammoth
- **Import de XLSX:** xlsx

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
  lib/                        → auth.ts, db.ts, utils.ts, crypto.ts
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
- Nunca editar arquivos em `src/components/ui/` — são gerados pelo shadcn

### API Routes (App Router)
Padrão para todas as rotas:

```ts
// src/app/api/<modulo>/route.ts
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response("Unauthorized", { status: 401 })
  // ...
}
```

- Sempre verificar sessão em rotas protegidas
- Rotas de admin verificam `session.user.role === "ADMIN"`
- Retornar `Response.json(data)` ou `new Response("mensagem", { status: xxx })`

### Prisma
- Importar sempre de `@/lib/db`: `import { db } from "@/lib/db"`
- Nunca importar direto de `@prisma/client`
- Após alterar `schema.prisma`: rodar `npx prisma migrate dev` e depois `npx prisma generate`

### Formulários
- Sempre usar react-hook-form + zod para validação
- Schema zod definido no mesmo arquivo do componente ou em arquivo `_schema.ts` separado

### Estilo
- Usar classes Tailwind + utilitários do shadcn (`cn()` de `@/lib/utils`)
- Tema dark/light via next-themes (já configurado em `providers.tsx`)
- Ícones exclusivamente via lucide-react

---

## Módulos e responsabilidades

| Módulo | O que faz | Sincroniza com |
|---|---|---|
| `kpis` | Produção mensal, edição, pesos e níveis de carreiras | API Alura (carreiras) |
| `publicacoes` | Catálogo de cursos, trilhas, artigos e carreiras | API Alura |
| `gastos` | Controle de despesas do departamento | ClickUp (tasks) |
| `relatorios` | Builder de formulários + coleta de respostas via link | — |
| `processos` | Documentação de processos com flow e rich text | — |
| `documentacoes` | Wiki interna com editor TipTap + import DOCX | — |
| `automacoes` | Catálogo de automações e agentes do time | — |
| `licencas` | Gestão de licenças/assinaturas com audit trail | — |
| `admin` | Gestão de usuários e e-mails permitidos | — |

---

## Modelos principais do banco

- `User` — usuários do sistema (ADMIN | USER)
- `AllowedEmail` — whitelist de e-mails autorizados a criar conta
- `Subscription` + `SubscriptionAudit` — licenças com histórico de alterações
- `Automation` — automações/agentes (ACTIVE | INACTIVE | TESTING)
- `Expense` — gastos por mês/categoria, com deduplicação por `externalId` (ClickUp)
- `Process` + `Documentation` — conteúdo rico (TipTap JSON) com status DRAFT/PUBLISHED
- `Report` + `ReportResponse` — formulários dinâmicos com token público
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

## Autenticação e permissões

- Middleware (`src/middleware.ts`) protege todas as rotas `/(dashboard)`
- Rotas `/api/admin/**` exigem `role === "ADMIN"`
- Primeiro acesso: usuário recebe e-mail, define senha via `/criar-senha`
- Super admins definidos em `src/lib/super-admins.ts`

---

## Comandos úteis

```bash
npm run dev                    # inicia em desenvolvimento
npx prisma migrate dev         # aplica migrations + gera client
npx prisma studio              # interface visual do banco
npx tsx scripts/create-admin.ts  # cria usuário admin inicial
npm run build                  # prisma generate + next build
```

---

## O que NÃO fazer

- Não usar `fetch()` no servidor para buscar dados internos — usar Prisma direto
- Não criar componentes em `src/components/ui/` — usar `npx shadcn add <componente>`
- Não usar `any` no TypeScript — tipar sempre
- Não expor senhas ou dados sensíveis nas respostas de API
- Não alterar `src/generated/prisma/` manualmente — é gerado pelo Prisma
