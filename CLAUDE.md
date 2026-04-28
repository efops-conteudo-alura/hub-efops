# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Hub de Eficiência Operacional — Alura (EfOps)

Hub interno do departamento de conteúdo da Alura. Centraliza KPIs, publicações, gastos, automações, processos, documentações, licenças, relatórios e ferramentas de IA.

---

## Stack

| Tecnologia | Versão | Uso |
|---|---|---|
| Next.js | 16.1.6 | Framework (App Router) |
| React | 19.2.3 | UI |
| Prisma | 6.19.2 | ORM |
| NextAuth | 5.0.0-beta.30 | Autenticação (v5 — API diferente da v4) |
| Tailwind CSS | 4.x | Estilo |
| shadcn/ui | 3.x | Componentes |
| Anthropic SDK | 0.79+ | Claude API |
| TipTap | 3.x | Editor rico (docs e processos) |
| XYFlow | 12.x | Diagramas de processos |
| dnd-kit | 6.x | Drag & drop |
| Recharts | 3.x | Gráficos |
| Zod | 4.x | Validação |
| react-hook-form | 7.x | Formulários |
| mammoth | 1.x | Import DOCX |
| xlsx | 0.18.x | Import/export Excel |

---

## Comandos

```bash
npm run dev              # desenvolvimento (sem Turbopack)
npm run build            # prisma generate + next build
npm run lint             # ESLint
npm run lint:fix         # ESLint com auto-fix
npm run typecheck        # tsc --noEmit
npx prisma migrate dev   # aplica migration + gera client
npx prisma studio        # UI visual do banco
npx tsx scripts/create-admin.ts  # cria admin inicial
```

> Turbopack não faz hot reload de client components — reiniciar o servidor resolve.
> Neon pausa a instância após inatividade — a primeira query pode demorar alguns segundos.

---

## Variáveis de Ambiente

```
DATABASE_URL              # PostgreSQL Neon (obrigatório)
NEXTAUTH_SECRET           # Segredo JWT (obrigatório)
ENCRYPTION_KEY            # AES-256-GCM — fallback: NEXTAUTH_SECRET
ANTHROPIC_API_KEY         # API Claude
CLICKUP_API_KEY           # Integração ClickUp (gastos, imobilização, leadtimes KPIs)
CLICKUP_LIST_ID           # ID lista ClickUp para gastos
GAMMA_API_KEY             # Geração de apresentações Gamma
LINTE_API_KEY             # API Linte (cadastro de instrutores)
LINTE_ORGANIZATION_ID     # ID organização Linte
LINTE_ASSIGNEE_EMAIL      # Email padrão atribuição Linte
```

---

## Estrutura de Pastas

```
src/
  app/
    (auth)/             # login, criar-senha, primeiro-acesso
    (dashboard)/        # páginas protegidas pelo middleware
      <modulo>/
        page.tsx        # Server Component — busca dados via Prisma direto
        _components/    # componentes exclusivos do módulo
    api/
      <modulo>/
        route.ts        # GET, POST
        [id]/route.ts   # GET, PUT, DELETE
    globals.css         # tokens CSS e classes .hub-*
    layout.tsx          # fontes globais (3 fontes Google)
    providers.tsx       # ThemeProvider + SessionProvider
  components/           # componentes globais (sidebar, dialogs)
    ui/                 # shadcn — NUNCA editar manualmente
  lib/
    auth.ts             # NextAuth config + export { handlers, auth, signIn, signOut }
    auth.config.ts      # authConfig separado (callbacks, pages, session strategy)
    db.ts               # singleton PrismaClient exportado como `prisma`
    crypto.ts           # criptografia AES-256-GCM para dados sensíveis
    super-admins.ts     # lista hardcoded de super admins
    utils.ts            # cn() e helpers
  middleware.ts         # proteção de rotas via NextAuth
  types/                # extensões de tipos (next-auth.d.ts — Session com id e role)
prisma/
  schema.prisma         # fonte da verdade do banco — único ponto de migrate
scripts/                # utilitários ad-hoc (excluídos do ESLint)
```

---

## Módulos

| Módulo | Rota | Descrição |
|---|---|---|
| Home | `/home` | Dashboard de boas-vindas |
| KPIs | `/kpis` | Produção, edição, suporte, leadtime, carreiras |
| Publicações | `/publicacoes` | Catálogo cursos/trilhas/artigos sincronizados da Alura |
| Gastos | `/gastos` | Despesas por centro de custo + ClickUp sync |
| Relatórios | `/relatorios` | Builder de formulários + análise IA (Claude) |
| Processos | `/processos` | Documentação com XYFlow + TipTap |
| Documentações | `/documentacoes` | Wiki TipTap + import DOCX |
| Automações | `/automacoes` | Catálogo de automações e agentes |
| Licenças | `/subscriptions` | Assinaturas com audit trail e criptografia |
| Produção IA | `/producao-conteudo` | Validação de ementa com Claude |
| Pesquisa de Mercado | `/pesquisa-mercado` | Pesquisa com Claude + web search |
| Imobilização | `/imobilizacao` | Horas por colaborador/produto + ClickUp sync |
| Biblioteca de Prompts | `/biblioteca-de-prompts` | Prompts IA reutilizáveis |
| Projetos | `/projetos` | Gestão de projetos internos |
| Analytics | `/dashboard` | Visão consolidada |
| Admin | `/admin/usuarios` | Usuários, emails permitidos, configurações do sistema |

---

## Autenticação (NextAuth v5)

**Atenção: este projeto usa NextAuth v5 (beta), que tem API diferente da v4.**

```ts
import { auth } from "@/lib/auth"

const session = await auth()
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
```

- `401` — não autenticado (sem sessão)
- `403` — autenticado sem permissão (role insuficiente)
- Roles por app via `AppRole { userId, app, role }` — único por `(userId, app)`
- App ID deste hub: `"hub-efops"`. Roles: `ADMIN`, `USER`
- Login via credentials (email + senha bcrypt)
- Usuário sem AppRole para `"hub-efops"` não consegue logar

Rotas públicas (não protegidas):
`/api/auth`, `/api/setup`, `/api/relatorios/form`, `/api/linte/cadastro`, `/login`, `/setup`, `/relatorios/responder`, `/primeiro-acesso`

---

## Banco de Dados

```ts
import { prisma } from "@/lib/db"  // export é `prisma`, não `db`
```

- PostgreSQL via Neon — só este projeto roda `npx prisma migrate`
- `npm run build` inclui `prisma generate` automaticamente
- Dados sensíveis criptografados com `src/lib/crypto.ts` (AES-256-GCM)
- `loginPass` de `Subscription` é sempre armazenado criptografado
- `SystemConfig` armazena configs globais (algumas criptografadas, ex: `CAELUM_BI_URL`)

---

## Padrão de API Route

```ts
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  // validar body com Zod antes de usar no Prisma
}
```

- Rotas admin também checam `session.user.role !== "ADMIN"` → 403
- Server Components em `page.tsx` buscam dados via Prisma direto (sem `fetch()` interno)
- Sync de APIs externas: POST para `/api/<modulo>/sync`, retorna `{ created, updated, total }`

---

## Design System

Três fontes via `next/font/google`:

| Variável CSS | Fonte | Uso |
|---|---|---|
| `--font-encode-sans` | Encode Sans | Títulos de página, card, tabela, gráfico |
| `--font-roboto-flex` | Roboto Flex | Corpo, labels, dropdowns, botões |
| `--font-jetbrains-mono` | JetBrains Mono | Abas, tags, datas, código, números |

Classes semânticas (definidas em `globals.css`, usar sempre — não definir font-family inline):
`hub-page-title`, `hub-card-title`, `hub-chart-title`, `hub-table-header`, `hub-tab-label`, `hub-tag`, `hub-number`

Paleta dark: fundo `#111213`, card `#0c0d0e`, sidebar mais escuro que card, primário `#052fd3` (azul Alura).
**Cards são mais escuros que o fundo** — inverso do padrão típico.
Azul (`--primary`) apenas em: botões de criação, indicador de aba ativa, badges de status.

---

## ESLint (flat config, ESLint 9)

`eslint.config.mjs` — regras ativas:

- `eqeqeq: always` → sempre `===` / `!==` (nunca `==` ou `!=`)
- `@typescript-eslint/no-explicit-any` → error
- `@typescript-eslint/no-unused-vars` → warn (prefixo `_` para ignorar)
- `react-hooks/rules-of-hooks` → error
- `react-hooks/exhaustive-deps` → warn
- `no-console` → warn (permite `console.warn` e `console.error`)
- `no-unreachable` → error

Ignorados: `.next/`, `node_modules/`, `prisma/migrations/`, `scripts/`

---

## Ecossistema Multi-App

Este hub é o ponto central de gestão de usuários. Todos os apps compartilham o mesmo banco Neon:

| App ID | Projeto |
|---|---|
| `hub-efops` | este projeto |
| `hub-producao-conteudo` | hub de produção de conteúdo |
| `select-activity` | seletor de atividades (embutido no hub-producao) |

- `AllowedEmail` — whitelist global de emails que podem se cadastrar
- `AppRole` — define acesso por app: sem AppRole = sem acesso
- Só este hub roda `npx prisma migrate`. Os outros usam apenas `npx prisma generate`
- Registro neste hub cria AppRoles para os três apps acima

---

## Integrações Externas

- **Claude API**: streaming via `anthropic.messages.stream()`. Fallback: usar `messages.create()` — nunca `stream()` de novo após chunks já enviados
- **ClickUp**: três integrações distintas:
  - **Gastos** (`/api/gastos/sync-clickup`) — usa `CLICKUP_LIST_ID`
  - **Imobilização** (`/api/imobilizacao/[ano]/[mes]/sync/[timeId]`) — lista por time configurável em `/imobilizacao/configurar`
  - **Leadtimes KPIs** (`/api/kpis/leadtimes/sync`) — 3 listas hardcoded (2 ALURA + 1 LATAM); calcula dias entre status de início e conclusão lendo `status_history` da task. Fallback: `date_created` / `date_done` quando histórico não vier
- **Caelum BI**: sync de cursos via query SQL salva criptografada em `SystemConfig` (`CAELUM_BI_URL`)
- **Gamma**: geração de apresentações a partir de análises de relatórios
- **Linte**: cadastro de instrutores via webhook público

---

## O Que NÃO Fazer

- Não usar `fetch()` no servidor para dados internos — usar Prisma direto
- Não editar `src/components/ui/` — adicionar via `npx shadcn add <componente>`
- Não usar `any` no TypeScript
- Não importar `{ db }` de `@/lib/db` — o export é `{ prisma }`
- Não importar `@prisma/client` diretamente no código da aplicação
- Não rodar `npx prisma migrate` em outros projetos do ecossistema
- Não usar `getServerSession(authOptions)` — é padrão NextAuth v4. Usar `auth()` de `@/lib/auth`
- Não retornar 401 quando autenticado sem permissão — usar 403
- Não passar body do request direto ao Prisma sem validação Zod
- Não expor `ENCRYPTION_KEY`, senhas ou tokens em logs ou respostas de API
- Não usar `anthropic.messages.stream()` como fallback quando chunks já foram enviados ao cliente
