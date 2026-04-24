---
name: nextjs-patterns
description: Reference for Next.js 16 App Router patterns used in this project. Auto-load when working with pages, components, server actions, or API routes.
---

# Next.js App Router Patterns

## File structure
```
app/
├── (auth)/           # Route group — doesn't affect URL
│   ├── login/
│   └── layout.tsx
├── dashboard/
│   ├── page.tsx      # Server Component by default
│   ├── loading.tsx   # Shown while page.tsx suspends
│   └── error.tsx     # Error boundary for this route
└── api/
    └── [route]/
        └── route.ts  # API route handler
```

## Server vs Client components

```typescript
// Server Component (default) — runs on server, can be async
export default async function Page() {
  const data = await db.query()  // direct DB access ✅
  return <div>{data.name}</div>
}

// Client Component — add directive at top
"use client"
import { useState } from 'react'
export default function Counter() {
  const [count, setCount] = useState(0)  // hooks ✅
}
```

## Server Actions (preferred over API routes for internal mutations)

```typescript
// app/actions/[feature].ts
"use server"
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).max(100),
})

export async function createItem(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = schema.parse({
    title: formData.get('title'),
  })

  return await prisma.item.create({
    data: { ...validated, userId: session.user.id }
  })
}
```

## Data fetching in Server Components

```typescript
// Fetch directly — no useEffect needed
async function UserList() {
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  })
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```
