---
name: security-check
description: Realiza uma auditoria de segurança no projeto Hub EfOps. Use quando o usuário pedir para verificar segurança, fazer security check, auditar o projeto, ou antes de um deploy importante.
---

# Skill: Security Check — Hub EfOps

Você vai realizar uma auditoria de segurança sistemática no projeto Hub de Eficiência Operacional da Alura. O projeto usa Next.js 16 (App Router), NextAuth v4, Prisma + PostgreSQL e shadcn/ui.

Execute cada verificação abaixo em ordem. Para cada item encontrado, registre o arquivo, a linha e a severidade.

---

## 1. Autenticação nas API Routes

Leia todos os arquivos em `src/app/api/` e verifique se **todas** as rotas fazem:

```ts
const session = await getServerSession(authOptions)
if (!session) return new Response("Unauthorized", { status: 401 })
```

Sinalize como **CRÍTICO** qualquer rota que:
- Não verifica sessão
- Verifica sessão mas não retorna 401 se não autenticado
- Usa `session` sem verificar se é null antes

Exceções permitidas (não sinalizar):
- `src/app/api/auth/` — rotas do NextAuth
- `src/app/api/setup/` — rota de setup inicial
- `src/app/api/relatorios/form/[token]/` — formulário público com token
- `src/app/api/linte/cadastro/` — cadastro público de instrutor

---

## 2. Proteção de rotas admin

Leia todos os arquivos em `src/app/api/admin/` e verifique se verificam:

```ts
if (session.user.role !== "ADMIN") return new Response("Forbidden", { status: 403 })
```

Sinalize como **CRÍTICO** qualquer rota admin que não verifica o role.

---

## 3. Dados sensíveis nas respostas de API

Verifique se alguma rota retorna campos sensíveis desnecessariamente:
- Campo `password` em respostas de usuário
- Tokens ou secrets em respostas JSON
- Dados de outros usuários sem autorização

Sinalize como **ALTO** qualquer exposição de dados sensíveis.

---

## 4. Variáveis de ambiente no cliente

Verifique se há variáveis de ambiente sendo usadas em componentes `"use client"` ou em arquivos client-side sem o prefixo `NEXT_PUBLIC_`:

- Variáveis sem `NEXT_PUBLIC_` só devem aparecer em Server Components, API routes e `lib/`
- Sinalize como **ALTO** qualquer vazamento de secrets para o cliente

---

## 5. Validação de inputs nas API routes

Verifique se as rotas POST e PUT validam o body antes de usar:
- Sinalize como **MÉDIO** rotas que usam `req.json()` direto sem validação (zod ou manual)
- Sinalize como **ALTO** se dados do body são passados direto para o Prisma sem sanitização

---

## 6. Injeção via Prisma

Verifique queries Prisma que usam dados do usuário:
- `where: { id: body.id }` sem verificar se o id pertence ao usuário logado
- Sinalize como **ALTO** qualquer caso onde um usuário poderia acessar dados de outro

---

## Formato do relatório

Ao final, entregue um relatório estruturado:

```
# Security Check — Hub EfOps
Data: [hoje]

## Resumo
- 🔴 Críticos: X
- 🟠 Altos: X  
- 🟡 Médios: X
- ✅ Sem problemas encontrados em: [lista das categorias limpas]

## Problemas encontrados

### 🔴 CRÍTICO — [título]
**Arquivo:** `caminho/do/arquivo.ts`
**Linha:** XX
**Problema:** descrição clara do problema
**Correção sugerida:**
\`\`\`ts
// código corrigido
\`\`\`

---

## O que foi verificado e está OK
[lista dos itens sem problemas]
```

---

## Importante

- Leia os arquivos reais — não assuma que estão corretos
- Se um arquivo for muito grande, leia as partes relevantes (imports, handlers)
- Não sinalize falsos positivos — só reporte o que é genuinamente um risco
- Se encontrar algo fora das categorias acima que pareça um risco, adicione numa seção "Outros achados"
