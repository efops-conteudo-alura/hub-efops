---
name: nova-feature
description: Cria a estrutura completa de um novo módulo ou feature no Hub de Eficiência Operacional, seguindo os padrões do projeto. Use quando o usuário pedir para criar um novo módulo, seção, página ou feature no Hub.
---

# Skill: Nova Feature no Hub EfOps

Você vai criar a estrutura completa de uma nova feature no Hub de Eficiência Operacional da Alura. Siga rigorosamente os padrões do projeto descritos no CLAUDE.md.

## Antes de criar qualquer arquivo

Pergunte ao usuário (se não estiver claro):
1. **Nome do módulo** — ex: "instrutores", "agenda", "feedbacks"
2. **Precisa de banco de dados?** — se sim, quais campos o model Prisma deve ter
3. **Tem sync com API externa?** — ClickUp, Alura, ou outro
4. **Acesso restrito a admin?** — ou qualquer usuário autenticado acessa

---

## Estrutura a criar

Para um módulo chamado `[modulo]`, crie sempre:

### 1. Página principal (Server Component)
```
src/app/(dashboard)/[modulo]/page.tsx
```
- Busca dados direto com Prisma (`import { db } from "@/lib/db"`)
- Verifica sessão com `getServerSession(authOptions)`
- Passa dados para componentes client via props

### 2. Componentes do módulo
```
src/app/(dashboard)/[modulo]/_components/
```
Criar os componentes necessários. Padrões comuns:
- `[modulo]-client.tsx` — componente client principal com estado
- `[modulo]-table.tsx` ou `[modulo]-list.tsx` — listagem
- `[modulo]-form-dialog.tsx` — dialog de criação/edição (react-hook-form + zod)

### 3. API Routes
```
src/app/api/[modulo]/route.ts          → GET (lista) + POST (cria)
src/app/api/[modulo]/[id]/route.ts     → GET + PUT + DELETE por ID
```

Se tiver sync:
```
src/app/api/[modulo]/sync/route.ts     → POST (sincroniza com fonte externa)
```

### 4. Model Prisma (se necessário)
Adicionar ao `prisma/schema.prisma` seguindo os padrões existentes:
- `id String @id @default(cuid())`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- Status com enum quando aplicável (ex: DRAFT/PUBLISHED, ACTIVE/INACTIVE)

---

## Templates de código

### page.tsx (Server Component)
```tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"

export default async function [Modulo]Page() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const items = await db.[modulo].findMany({
    orderBy: { createdAt: "desc" }
  })

  return <[Modulo]Client items={items} />
}
```

### route.ts (API)
```ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response("Unauthorized", { status: 401 })

  const items = await db.[modulo].findMany({
    orderBy: { createdAt: "desc" }
  })
  return Response.json(items)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return new Response("Unauthorized", { status: 401 })

  const body = await req.json()
  const item = await db.[modulo].create({ data: body })
  return Response.json(item, { status: 201 })
}
```

### sync/route.ts (se aplicável)
```ts
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return new Response("Unauthorized", { status: 401 })

  // 1. Buscar dados da fonte externa
  // 2. Upsert no banco (createOrUpdate por slug/externalId)
  // 3. Retornar { created, updated, total }

  return Response.json({ created, updated, total })
}
```

---

## Após criar os arquivos

1. Se criou model Prisma, lembrar o usuário de rodar:
   ```bash
   npx prisma migrate dev --name add_[modulo]
   ```

2. Sugerir adicionar o módulo na sidebar (`src/components/sidebar.tsx`)

3. Se for rota restrita a admin, lembrar de verificar `session.user.role === "ADMIN"` nas API routes

---

## O que NÃO fazer

- Não usar `fetch()` no servidor para buscar dados internos — sempre Prisma direto
- Não criar componentes em `src/components/ui/` — usar `npx shadcn add`
- Não usar `any` no TypeScript
- Não criar estrutura diferente da estabelecida — consistência é o objetivo desta skill
