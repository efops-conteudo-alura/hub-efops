---
name: eslint-standards
description: Padrões de lint deste projeto. Auto-carregar ao escrever ou revisar código TypeScript/React/Next.js. Usado por frontend-dev, backend-dev, code-reviewer e qa-engineer.
---

# Padrões ESLint do Projeto

## Regras ativas (o que vai quebrar o build)

| Regra | Nível | O que significa |
|-------|-------|-----------------|
| `@typescript-eslint/no-explicit-any` | ❌ error | Proibido usar `any` — use `unknown` + type guard |
| `react/jsx-key` | ❌ error | Todo elemento em lista precisa de `key` |
| `eqeqeq` | ❌ error | Sempre `===`, nunca `==` |
| `no-unreachable` | ❌ error | Sem código após `return` ou `throw` |
| `@typescript-eslint/no-unused-vars` | ⚠️ warn | Variáveis declaradas e não usadas |
| `no-console` | ⚠️ warn | `console.log` não permitido — use `console.error` para erros |
| `@next/next/no-img-element` | ⚠️ warn | Use `<Image>` do next/image, não `<img>` |

## Padrões obrigatórios ao escrever código

```typescript
// ❌ Proibido
const data: any = fetchData()
if (x == null) { }
const unused = 'hello'

// ✅ Correto
const data: unknown = fetchData()
if (typeof data === 'object' && data !== null) { }
if (x === null) { }
```

```tsx
// ❌ Proibido em listas
items.map(item => <div>{item.name}</div>)

// ✅ Correto
items.map(item => <div key={item.id}>{item.name}</div>)
```

```tsx
// ❌ Proibido
<img src="/logo.png" alt="Logo" />

// ✅ Correto
import Image from 'next/image'
<Image src="/logo.png" alt="Logo" width={100} height={40} />
```

## Como rodar

```bash
npm run lint          # mostra erros
npm run lint:fix      # corrige automaticamente o que for possível
npm run typecheck     # verifica tipos TypeScript sem compilar
```

## No pipeline

O `qa-engineer` roda `npm run lint` e `npm run typecheck` como primeiro passo. Se qualquer um deles falhar com `error`, o QA **bloqueia** antes de validar os critérios de aceite. Warnings não bloqueiam, mas são reportados.

## Variáveis ignoradas intencionalmente

Prefixe com `_` para sinalizar que a variável é intencionalmente não usada:

```typescript
function handler(_req: Request, res: Response) {
  res.json({ ok: true })
}
```
