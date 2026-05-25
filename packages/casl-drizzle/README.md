# @codylabs/casl-drizzle

CASL integration for [Drizzle ORM](https://orm.drizzle.team/) — define and enforce permissions using Drizzle RQB v2 where syntax.

Similar to [`@casl/prisma`](https://github.com/stalniy/casl/tree/master/packages/casl-prisma) but for Drizzle ORM v1.

## Installation

```bash
pnpm add @codylabs/casl-drizzle @casl/ability drizzle-orm
```

## Usage

### 1. Define your types

```ts
import type { Ability } from '@casl/ability';
import type { DrizzleQuery, Subjects } from '@codylabs/casl-drizzle';

// Your Drizzle table select types (from $inferSelect)
interface User {
  id: number;
  name: string;
  role: string;
}

interface Post {
  id: number;
  title: string;
  authorId: number;
  status: string;
  private: boolean;
}

type AppSubjects = Subjects<{ User: User; Post: Post }>;
type AppAbility = Ability<
  ['create' | 'read' | 'update' | 'delete', 'all' | AppSubjects],
  DrizzleQuery<{ User: User; Post: Post }>
>;
```

### 2. Create abilities

```ts
import { createDrizzleAbility } from '@codylabs/casl-drizzle';
import { subject } from '@casl/ability';

const ability = createDrizzleAbility<AppAbility>([
  { action: 'read', subject: 'Post', conditions: { status: 'published' } },
  { action: 'read', subject: 'Post', conditions: { authorId: userId } },
  { action: 'read', subject: 'Post', conditions: { private: true }, inverted: true },
  { action: 'update', subject: 'Post', conditions: { authorId: userId } },
]);

// Runtime checks work
ability.can('read', subject('Post', { id: 1, title: 'Hi', authorId: userId, status: 'published', private: false })); // true
ability.can('read', subject('Post', { id: 2, title: 'Secret', authorId: 999, status: 'draft', private: true })); // false
```

### 3. Query accessible records

```ts
import { accessibleBy } from '@codylabs/casl-drizzle';

// Get the where clause for Drizzle RQB v2
const where = accessibleBy(ability).ofType('Post');

// Use with Drizzle relational query builder v2
const posts = await db.query.posts.findMany({ where });

// Combine with your own conditions using AND
const posts = await db.query.posts.findMany({
  where: {
    AND: [accessibleBy(ability).ofType('Post'), { status: 'published' }],
  },
});
```

## Supported Operators

All Drizzle RQB v2 column-level filter operators are supported:

| Operator               | Description                 | Example                                         |
| ---------------------- | --------------------------- | ----------------------------------------------- |
| `eq` (or direct value) | Equal                       | `{ id: 1 }` or `{ id: { eq: 1 } }`              |
| `ne`                   | Not equal                   | `{ status: { ne: 'archived' } }`                |
| `gt`                   | Greater than                | `{ age: { gt: 18 } }`                           |
| `gte`                  | Greater than or equal       | `{ age: { gte: 18 } }`                          |
| `lt`                   | Less than                   | `{ age: { lt: 65 } }`                           |
| `lte`                  | Less than or equal          | `{ age: { lte: 65 } }`                          |
| `in`                   | Value in array              | `{ status: { in: ['draft', 'published'] } }`    |
| `notIn`                | Value not in array          | `{ id: { notIn: [1, 2] } }`                     |
| `like`                 | SQL LIKE (case-sensitive)   | `{ title: { like: '%hello%' } }`                |
| `ilike`                | SQL LIKE (case-insensitive) | `{ title: { ilike: '%hello%' } }`               |
| `notLike`              | NOT LIKE                    | `{ title: { notLike: '%draft%' } }`             |
| `notIlike`             | NOT ILIKE                   | `{ title: { notIlike: '%draft%' } }`            |
| `isNull`               | Is null                     | `{ deletedAt: { isNull: true } }`               |
| `isNotNull`            | Is not null                 | `{ name: { isNotNull: true } }`                 |
| `arrayContains`        | Array contains all values   | `{ tags: { arrayContains: ['a', 'b'] } }`       |
| `arrayContained`       | Array contained by values   | `{ tags: { arrayContained: ['a', 'b', 'c'] } }` |
| `arrayOverlaps`        | Arrays overlap              | `{ tags: { arrayOverlaps: ['a', 'x'] } }`       |

### Logical Operators

| Operator | Level         | Description                       |
| -------- | ------------- | --------------------------------- |
| `AND`    | Table / Field | All conditions must match         |
| `OR`     | Table / Field | At least one condition must match |
| `NOT`    | Table / Field | Negate the condition              |

## How It Works

This package follows the same architecture as `@casl/prisma`:

1. **`drizzleQuery`** — A conditions matcher that parses Drizzle RQB v2 where objects into an AST (using `@ucast/core`) and interprets them at runtime (using `@ucast/js`). This powers `ability.can()` checks in memory.

2. **`accessibleBy`** — Converts CASL ability rules into Drizzle RQB v2 where objects using `rulesToCondition` from `@casl/ability/extra`. Allowed rules are OR-ed, forbidden rules are wrapped in NOT and AND-ed with each allowed branch.

3. **`createDrizzleAbility`** — Factory that creates a CASL `Ability` instance pre-configured with the Drizzle conditions matcher.

## Empty Conditions

When a user has no permissions for a given action/subject, `accessibleBy(...).ofType(...)` returns `{ OR: [] }`. In Drizzle RQB v2, an empty `OR` array means no records match — so the query returns an empty result set.

## License

MIT
