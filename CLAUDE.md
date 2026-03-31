# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Hub de Eficiência Operacional — Alura (EfOps)

Hub interno do departamento de conteúdo da Alura. Centraliza KPIs de produção, publicações, gastos, automações, processos, documentações, licenças, relatórios e ferramentas de produção de conteúdo com IA.

---

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19
- **Banco de dados:** PostgreSQL via Prisma ORM (Neon)
- **Autenticação:** NextAuth v4 (credentials provider, roles: ADMIN | USER)
- **UI:** shadcn/ui + Tailwind CSS v4 + lucide-react
- **Formulários:** react-hook-form + zod
- **IA:** Anthropic Claude SDK (`@anthropic-ai/sdk`) — streaming + web search tool
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
    cadastro-instrutor/       → página pública de cadastro de instrutor
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
Padrão para todas as rotas protegidas:

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

Para rotas que exigem ADMIN:

```ts
const session = await getServerSession(authOptions)
if (!session || session.user.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

**Distinção importante:**
- `401 Unauthorized` — usuário não autenticado (sem sessão)
- `403 Forbidden` — autenticado mas sem permissão (role insuficiente)

- Sempre verificar sessão em rotas protegidas
- Sempre validar o body do request antes de usar no Prisma — nunca passar dados do usuário diretamente
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

## Identidade Visual (Alura Design System)

O Hub segue a identidade visual do site da Alura. **Para alterar qualquer aspecto visual globalmente, edite apenas `src/app/globals.css`** — não saia aplicando classes inline nos componentes.

### Fontes

Três fontes carregadas via `next/font/google` em `src/app/layout.tsx`:

| Fonte | Variável CSS | Uso |
|---|---|---|
| Encode Sans | `--font-encode-sans` | Títulos de página, card, tabela, gráfico |
| Roboto Flex | `--font-roboto-flex` | Corpo, subtítulos, labels, dropdowns, botões |
| JetBrains Mono | `--font-jetbrains-mono` | Abas, tags, números, IDs, datas, código |

### Classes semânticas `.hub-*`

Definidas em `@layer components` dentro de `globals.css`. **Sempre use estas classes — nunca defina font-family inline.**

```css
.hub-page-title    /* h1 de módulo: Encode Sans, text-4xl, font-light */
.hub-section-title /* subtítulo abaixo do h1: Roboto Flex, text-base, muted */
.hub-card-title    /* título de card/painel: Encode Sans, text-xl, font-normal */
.hub-chart-title   /* título de gráfico: Encode Sans, text-lg, font-normal */
.hub-table-header  /* <th> de tabela: Encode Sans, text-xs, uppercase */
.hub-tab-label     /* label de aba: JetBrains Mono, text-xs, uppercase */
.hub-tag           /* badge/tag: JetBrains Mono, uppercase, pill com borda */
.hub-number        /* números, IDs, datas, valores: JetBrains Mono */
```

### Overrides globais (fora de `@layer`)

Regras sem layer ganham de todas as utilities do Tailwind — usadas para sobrescrever defaults do shadcn:

```css
/* body herda Roboto Flex — garante que tabelas e texto genérico usem a fonte certa */
body { font-family: var(--font-roboto-flex, sans-serif); }

/* CardTitle do shadcn tem font-semibold hardcoded — anulado aqui */
[data-slot="card-title"] { font-family: var(--font-encode-sans); font-weight: 400; }

/* Todos os badges: JetBrains Mono + caixa alta */
[data-slot="badge"] { font-family: var(--font-jetbrains-mono); text-transform: uppercase; letter-spacing: 0.05em; }
```

### Paleta de cores (dark mode)

```
--background:    #1b1c1e  /* fundo das páginas */
--card:          #0c0d0e  /* cards — mais escuro que o fundo */
--sidebar:       #131416  /* sidebar — o mais escuro */
--foreground:    #f4f5f6
--muted-foreground: #888d96
--border:        #54565f
--primary:       #052fd3  /* azul Alura */
--secondary:     #37393f
```

> Cards são **mais escuros** que o fundo — inverso do padrão típico.

### Uso do azul (`--primary: #052fd3`)

Azul restrito a:
- Botões de criação de artefato ("Nova licença", "Novo relatório", etc.)
- Indicador de aba ativa (traço `border-t-foreground` no estilo caixinha)
- Tags/badges de status quando aplicável

**Não usar azul em:** ícones decorativos, textos, hover states genéricos.

### Estilo de abas (caixinha)

```tsx
// base
"px-5 py-4 text-xs font-mono font-semibold uppercase border border-sidebar-border -ml-px first:ml-0 transition-colors relative"
// ativa
"bg-[#0c0d0e] text-foreground border-t-foreground z-10"
// inativa
"bg-sidebar text-muted-foreground hover:text-foreground"
```

### Botões

- `variant="default"` → azul, para ações primárias de criação
- `variant="outline"` → fundo `bg-secondary`, sem borda visível, chapado
- Sempre `rounded-lg`, sem sombra, sem profundidade

### Sidebar

- Largura fixa 148px, sem botão de colapso
- Ícone centralizado + label abaixo
- Estado ativo: `bg-sidebar-accent text-foreground` (sem azul)
- Mobile: drawer 148px via `Sheet`

### Regras gerais de ID visual

- Títulos de página, card e gráfico: **Encode Sans, sem bold** (`font-normal` ou `font-light`)
- Corpo, labels, dropdowns: **Roboto Flex**
- Qualquer número, ID, data ou quantidade: **`hub-number`** (JetBrains Mono)
- Qualquer badge/tag de status ou categoria: **`hub-tag`** ou `[data-slot="badge"]` (JetBrains Mono + uppercase)
- Ícones decorativos: `text-muted-foreground` (nunca coloridos exceto em contextos de feature card)

---

## Ecossistema de Apps — Gerenciamento Centralizado

> **O hub-efops é o ponto central de toda a gestão de usuários e acessos do ecossistema.**  
> Todos os outros apps compartilham o mesmo banco PostgreSQL (Neon) e dependem das tabelas `User`, `AllowedEmail` e `AppRole` gerenciadas aqui.

### Apps no ecossistema

| Identificador (app) | Projeto | Roles disponíveis |
|---|---|---|
| `hub-efops` | este projeto | `ADMIN`, `USER` |
| `hub-producao-conteudo` | projeto-hub-producao-conteudo | `ADMIN`, `USER` |
| `select-activity` | (embutido no hub-producao) | `ADMIN`, `COORDINATOR`, `INSTRUCTOR` |

### Como o controle de acesso funciona

- **`AllowedEmail`** — whitelist de e-mails autorizados a criar conta em qualquer app do ecossistema. Gerenciada em `/admin/usuarios` neste hub. É uma tabela única compartilhada.
- **`User`** — tabela única de usuários para todos os apps. Criada aqui ou em qualquer app do ecossistema via `/primeiro-acesso`.
- **`AppRole`** — define qual usuário tem acesso a qual app e com qual role. Um usuário pode ter múltiplos AppRoles (um por app). Sem AppRole para um app = sem acesso a ele.

```prisma
model AppRole {
  userId String
  app    String   // ex: "hub-efops", "hub-producao-conteudo", "select-activity"
  role   String   // ex: "ADMIN", "USER", "COORDINATOR", "INSTRUCTOR"
  @@unique([userId, app])
}
```

### O que acontece quando alguém se cadastra

- Cadastro via hub-efops (`/api/auth/register`): cria User + AppRoles para `hub-efops:USER`, `hub-producao-conteudo:USER` e `select-activity:COORDINATOR`
- Cadastro via hub-producao (`/api/seletor/auth/register`): cria User + AppRoles para `hub-producao-conteudo:USER` e `select-activity:COORDINATOR`
- Se o usuário já existir em qualquer app: os AppRoles faltantes são criados via upsert (sem erro, sem duplicata)
- Em ambos os casos, o e-mail deve estar em `AllowedEmail` para o cadastro ser aceito

### Migrações do banco

**Só este projeto roda `npx prisma migrate`.** Os outros apps usam apenas `npx prisma generate` para gerar o client a partir do schema já migrado. Ao adicionar modelos ou campos ao banco, a migration deve ser criada aqui.

### Como adicionar um novo app ao ecossistema

1. Definir o identificador do app (ex: `"hub-novo-app"`) — será o valor do campo `app` no `AppRole`
2. Definir as roles que o app usará (ex: `"USER"`, `"ADMIN"`)
3. Atualizar a rota `/api/auth/register` neste hub para criar o AppRole do novo app no cadastro
4. Atualizar a rota de cadastro do hub-producao para também criar o AppRole do novo app (quando um usuário novo se cadastra por lá)
5. No novo app: implementar `auth.ts` que busca o AppRole pelo identificador definido e valida o acesso
6. No novo app: usar `npx prisma generate` (nunca `migrate`)
7. Documentar o novo app na tabela "Apps no ecossistema" acima (nos CLAUDE.md de ambos os hubs existentes)

---

## Autenticação e permissões

- Middleware (`src/middleware.ts`) protege todas as rotas exceto:
  `api/auth`, `api/setup`, `api/relatorios/form`, `api/linte/cadastro`, `login`, `setup`, `relatorios/responder`, `primeiro-acesso`
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
| Publicações | `/publicacoes` | Catálogo de cursos, trilhas, artigos e carreiras | Caelum BI (cursos), API Alura (trilhas/artigos) |
| Gastos | `/gastos` e `/gastos/categorias` | Controle de despesas do departamento | ClickUp (tasks) |
| Relatórios | `/relatorios` | Builder de formulários + coleta de respostas via link público + análise de IA com Gamma | — |
| Processos | `/processos` | Documentação de processos com flow (@xyflow) e rich text (TipTap) | — |
| Documentações | `/documentacoes` | Wiki interna com editor TipTap + import DOCX | — |
| Automações | `/automacoes` | Catálogo de automações e agentes do time | — |
| Licenças | `/licencas` | Gestão de licenças/assinaturas com audit trail | — |
| Produção de Conteúdo | `/producao-conteudo` | Ferramentas de IA para produção: validação de ementa e pesquisa de mercado | Claude API (Anthropic) |
| Imobilização | `/imobilizacao` | Controle de imobilização de horas por colaborador/produto por período | ClickUp (tasks) |
| Admin | `/admin/usuarios` | Gestão de usuários e e-mails permitidos | — |
| Analytics | `/dashboard` | Visão consolidada (sempre por último na sidebar) | — |

---

## Modelos principais do banco

- `User` — usuários do sistema (ADMIN | USER), senha em bcrypt
- `AllowedEmail` — whitelist de e-mails autorizados a criar conta
- `SystemConfig` — configurações do sistema (ex: URL do Caelum BI), armazenadas por chave
- `Subscription` — licenças; `loginPass` armazenado cifrado via `src/lib/crypto.ts` (AES-256-GCM)
- `SubscriptionAudit` — histórico de alterações de licenças (`{ field: { from, to } }`)
- `Automation` — automações/agentes (ACTIVE | INACTIVE | TESTING)
- `Expense` — gastos; `month` em formato `"YYYY-MM"`, `externalId` único para deduplicação ClickUp
- `Process` — `flowData` e `richText` armazenados como `JSON.stringify(...)` (strings, não JSON nativo)
- `Documentation` — `content` como JSON (TipTap) ou HTML string (import .docx)
- `Report` + `ReportResponse` — formulários dinâmicos com `token` público único; `isAdminOnly` controla visibilidade
- `AiAnaliseResult` — resultados de análise de IA dos relatórios; `gammaUrl` guarda link de apresentação gerada no Gamma
- `EmentaAnalise` — análises de validação de ementa geradas pelo Claude
- `PesquisaMercado` — pesquisas de mercado geradas pelo Claude com web search
- `KpiProducao`, `KpiEdicao`, `KpiPesos`, `KpiAno` — dados de produção e edição
- `KpiCarreiraLevel` — níveis de carreiras sincronizados do site Alura
- `AluraCourse`, `AluraArtigo`, `AluraTrilha` — catálogo sincronizado da Alura
- `ImobilizacaoPeriodo` — período de imobilização (ano + mês); contém `ImobilizacaoEntry`
- `ImobilizacaoEntry` — linha de imobilização: colaborador, produto, horas, percentual
- `ImobilizacaoTime` + `ImobilizacaoColaborador` — configuração de times e colaboradores

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

### Sync de cursos via Caelum BI

O sync de cursos (`/api/publicacoes/sync-admin`) usa o **Caelum BI** (`bi.caelumalura.com.br`) como fonte de dados — uma ferramenta interna da Alura com acesso ao banco de produção (`aluraproduction`).

- A query SQL está salva no Caelum BI como **"Hub EfOps - Cursos Publicados"** (query #2722)
- O link público é armazenado criptografado no banco como `SystemConfig` com chave `CAELUM_BI_URL`
- Configurável em `/admin/configuracoes` → seção "Caelum BI"
- O Caelum BI retorna `{ columns: [...], result: [[...], [...]] }` — linhas como arrays, não objetos
- Ordem das colunas: `[aluraId, slug, nome, dataPublicacao, statusPub, statusCriacao, tipoContrato, isExclusive, catalogos]`
- `statusPub` no banco da Alura é `PUBLISHED` (não `"pub"` como vinha do scraping antigo) — o GET de cursos aceita ambos
- O link público não expira enquanto a query existir no Caelum BI
- Se a query precisar ser recriada, basta salvar o novo link em `/admin/configuracoes`

**Tabelas relevantes do banco `aluraproduction`:**
- `Course` — cursos (campos: `id`, `code`=slug, `name`, `publicationDate`, `situation`=statusPub, `creationStatus`, `contractType`, `isExclusive`)
- `Catalog_Content` — join entre cursos e catálogos (`content_id` → `Course.id`, `catalog_id` → `Catalog.id`)
- `Catalog` — catálogos (`id`, `code`, `name`)

### Integração com Claude API (Anthropic)

Rotas que usam IA seguem o padrão de streaming com fallback:

```ts
import Anthropic from "@anthropic-ai/sdk"
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Streaming com web search (preferencial)
const stream = anthropic.messages.stream({ ..., tools: [{ type: "web_search_20250305", name: "web_search" }] })

// Fallback sem web search — usar messages.create() (não stream), nunca stream() novamente
// pois chunks já enviados ao cliente não podem ser desfeitos
const response = await anthropic.messages.create({ ... })
```

- Modelo padrão: `claude-sonnet-4-6`
- `max_tokens: 8000` com streaming resolve timeouts de respostas longas
- Sempre validar os inputs do usuário antes de compor o prompt (previne prompt injection)

---

## O que NÃO fazer

- Não usar `fetch()` no servidor para buscar dados internos — usar Prisma direto
- Não criar componentes em `src/components/ui/` — usar `npx shadcn add <componente>`
- Não usar `any` no TypeScript — tipar sempre
- Não expor senhas ou dados sensíveis nas respostas de API
- Não alterar `src/generated/prisma/` manualmente — é gerado pelo Prisma
- Não importar `{ db }` de `@/lib/db` — o export correto é `{ prisma }`
- Não passar dados do body do request diretamente para o Prisma sem validação prévia
- Não retornar 401 quando o usuário está autenticado mas sem permissão — usar 403
- Não usar `anthropic.messages.stream()` como fallback quando chunks já foram enviados ao cliente — usar `messages.create()` no fallback
