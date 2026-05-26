# @codylabs/nestjs-env

Schema-driven environment/config module for NestJS.

It loads configuration from layered files, validates it with the Standard Schema interface (works with Zod, Valibot, ArkType, and other compatible validators), and exposes a type-safe `EnvService` for runtime access.

## Features

- Standard Schema validation (not tied to one validator library)
- Supports both `.json` and `.env` config files
- Deterministic layered config loading and deep merge
- `register` and `registerAsync` support
- Type-safe path access via `EnvService.get('a.b.c')`
- Helper methods: `getRequired`, `getOrDefault`, `getNumber`, `getBoolean`, `getArray`, `getUrl`

## Installation

```bash
pnpm add @codylabs/nestjs-env
# plus your schema library, for example:
pnpm add zod
```

## Quick Start (Zod)

```ts
import { Module } from '@nestjs/common';
import { z } from 'zod';
import { EnvModule } from '@codylabs/nestjs-env';

const appSchema = z.object({
  app: z.object({
    port: z.number().int().positive(),
    url: z.string().url(),
  }),
  db: z.object({
    host: z.string(),
    port: z.number().int(),
  }),
});

@Module({
  imports: [
    EnvModule.register({
      schema: appSchema,
      env: process.env.NODE_ENV,
      configDir: 'config',
      extensions: ['.json', '.env'],
      nestingSeparator: '__',
    }),
  ],
})
export class AppModule {}
```

## Async Registration

```ts
import { Module } from '@nestjs/common';
import { EnvModule } from '@codylabs/nestjs-env';
import { z } from 'zod';

const schema = z.object({
  app: z.object({
    port: z.number(),
  }),
});

@Module({
  imports: [
    EnvModule.registerAsync({
      useFactory: async () => ({
        schema,
        env: process.env.NODE_ENV,
        configDir: 'config',
        extensions: ['.json', '.env'],
      }),
    }),
  ],
})
export class AppModule {}
```

## Using EnvService

```ts
import { Injectable } from '@nestjs/common';
import { EnvService } from '@codylabs/nestjs-env';

@Injectable()
export class AppService {
  constructor(private readonly env: EnvService) {}

  getPort(): number {
    return this.env.getNumber('app.port');
  }

  getDbHost(): string {
    return this.env.getRequired('db.host');
  }
}
```

## File Loading Order

Files are loaded in this order, then deep-merged:

1. `global`
2. `*.global`
3. `global.{env}`
4. `local`
5. `local.{env}`
6. `secret`

Each slot resolves by extension priority from `extensions`.

Example with `extensions: ['.json', '.env']`:

- If both `global.json` and `global.env` exist, `global.json` is used for that slot.
- If `global.json` is missing and `global.env` exists, `global.env` is used.

## .env Nesting

`.env` keys are converted to nested paths using `nestingSeparator` (default: `__`) and lowercased.

Example:

```env
APP__PORT=3000
APP__URL=https://example.com
DB__HOST=localhost
DB__PORT=5432
```

Becomes:

```json
{
  "app": {
    "port": 3000,
    "url": "https://example.com"
  },
  "db": {
    "host": "localhost",
    "port": 5432
  }
}
```

## EnvModule Options

```ts
interface EnvModuleOptions {
  schema: StandardSchemaV1;
  env?: string;
  configDir?: string; // default: 'config'
  basePath?: string; // default: process.cwd()
  extensions?: string[]; // default: ['.json']
  enableGlobalPattern?: boolean; // default: true
  nestingSeparator?: string; // default: '__'
}
```

## Validation Behavior

- Validation happens during module bootstrap.
- If validation fails, module initialization throws with formatted issue messages.
- Validation supports both sync and async Standard Schema validators.

## Exported API

- `EnvModule`
- `EnvService`
- `ENV_CONFIG`
- Type helpers from `interfaces`

## License

MIT
