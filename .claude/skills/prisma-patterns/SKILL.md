---
name: prisma-patterns
description: Prisma ORM patterns for this project (Neon PostgreSQL). Auto-load when modifying schema.prisma, writing queries, or creating migrations.
---

# Prisma + Neon Patterns

## Schema conventions

```prisma
model Item {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations: always define both sides
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])  // index FK fields
}
```

## Common query patterns

```typescript
// Find with relation
const item = await prisma.item.findUnique({
  where: { id },
  include: { user: { select: { name: true, email: true } } }
})

// Scoped to user (always do this for user-owned resources)
const items = await prisma.item.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: page * 20,
})

// Atomic operations
const result = await prisma.$transaction([
  prisma.item.update({ where: { id }, data: { status: 'done' } }),
  prisma.log.create({ data: { itemId: id, action: 'completed' } }),
])
```

## Migrations

```bash
# After changing schema.prisma
npx prisma migrate dev --name add-item-status

# Generate client after changes
npx prisma generate

# View DB in browser
npx prisma studio
```

## Neon-specific

- Connection string in `DATABASE_URL` env var
- Use connection pooling URL (`DATABASE_URL_UNPOOLED`) for migrations
- Neon auto-pauses on inactivity — first query after pause may be slow (cold start)
