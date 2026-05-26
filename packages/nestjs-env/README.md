# @codylabs/nestjs-env

Schema-driven environment/config module for NestJS.

Loads configuration from composable **loaders**, validates it with the [Standard Schema](https://standardschema.dev/) interface (works with Zod, Valibot, ArkType, and other compatible validators), and exposes a type-safe `EnvService` for runtime access.

## Features

- Composable loader pattern — combine `fileLoader`, `processEnvLoader`, or your own custom loaders
- `process.env` support out of the box via `processEnvLoader`
- Standard Schema validation — not tied to any specific validator library
- Supports `.json` and `.env` config files with deterministic layered loading and deep merge
- `register` and `registerAsync` support
- Type-safe dot-notation access via `EnvService.get('a.b.c')`
- Helper methods: `getRequired`, `getOrDefault`, `getNumber`, `getBoolean`, `getArray`, `getUrl`, `getMany`, `getParsed`
- Schema is optional — skip validation for simple use cases

## Installation

```bash
pnpm add @codylabs/nestjs-env
# plus your schema library, for example:
pnpm add zod
```

## Quick Start

```ts
import { Module } from '@nestjs/common';
import { z } from 'zod';
import { EnvModule, fileLoader, processEnvLoader } from '@codylabs/nestjs-env';

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
      load: [
        // 1. Load from JSON/env files in ./config
        fileLoader({
          env: process.env.NODE_ENV,
          configDir: 'config',
          extensions: ['.json', '.env'],
        }),
        // 2. Override with process.env (highest priority)
        processEnvLoader(),
      ],
    }),
  ],
})
export class AppModule {}
```

## Async Registration

```ts
@Module({
  imports: [
    EnvModule.registerAsync({
      useFactory: async () => ({
        schema: appSchema,
        load: [fileLoader({ env: process.env.NODE_ENV }), processEnvLoader()],
      }),
    }),
  ],
})
export class AppModule {}
```

## Using EnvService

Inject `EnvService` with a generic for full type safety:

```ts
import { Injectable } from '@nestjs/common';
import { EnvService } from '@codylabs/nestjs-env';
import type { z } from 'zod';
import type { appSchema } from './config.schema';

type AppConfig = z.infer<typeof appSchema>;

@Injectable()
export class AppService {
  constructor(private readonly env: EnvService<AppConfig>) {}

  getPort(): number {
    return this.env.getNumber('app.port'); // typed, autocompleted
  }

  getDbHost(): string {
    return this.env.getRequired('db.host');
  }

  getDbUrl(): URL {
    return this.env.getUrl('db.url');
  }
}
```

## Loaders

Loaders are plain functions with the signature `() => Record<string, unknown> | Promise<Record<string, unknown>>`. They are called in array order and their results are **deep-merged** — later loaders take precedence over earlier ones.

### `fileLoader(options?)`

Loads from layered config files in the following order (later entries override earlier ones):

| Priority    | File                                                     |
| ----------- | -------------------------------------------------------- |
| 1 (lowest)  | `global{ext}`                                            |
| 2           | `*.global{ext}` (glob, when `enableGlobalPattern: true`) |
| 3           | `global.{env}{ext}`                                      |
| 4           | `local{ext}`                                             |
| 5           | `local.{env}{ext}`                                       |
| 6 (highest) | `secret{ext}`                                            |

Each slot resolves the first matching extension from the `extensions` array.

```ts
fileLoader({
  env?: string;           // e.g. process.env.NODE_ENV
  configDir?: string;     // default: 'config'
  basePath?: string;      // default: process.cwd()
  extensions?: string[];  // default: ['.json']
  enableGlobalPattern?: boolean; // default: true
  nestingSeparator?: string;     // default: '__'
})
```

### `processEnvLoader(options?)`

Reads from `process.env`. Keys are lowercased and split by `nestingSeparator` into a nested object. Values are coerced via [`destr`](https://github.com/unjs/destr) (`"true"` → `true`, `"42"` → `42`).

```ts
processEnvLoader({
  nestingSeparator?: string; // default: '__'
})
```

### Custom loader

Any function that returns a (possibly async) plain object works:

```ts
EnvModule.register({
  schema: appSchema,
  load: async () => {
    const remote = await fetch('https://config-service/app').then((r) => r.json());
    return remote;
  },
});
```

### Multiple loaders

```ts
load: [
  fileLoader({ env: process.env.NODE_ENV }), // base from files
  processEnvLoader(), // env vars win
];
```

## `.env` Nesting

`.env` keys are converted to nested paths using `nestingSeparator` (default `__`) and lowercased:

```env
APP__PORT=3000
APP__URL=https://example.com
DB__HOST=localhost
DB__PORT=5432
```

Becomes:

```json
{
  "app": { "port": 3000, "url": "https://example.com" },
  "db": { "host": "localhost", "port": 5432 }
}
```

## EnvModule Options

```ts
interface EnvModuleOptions {
  schema?: StandardSchemaV1; // omit to skip validation
  load?: Loader | Loader[]; // one or more loaders
}
```

## EnvService API

| Method                        | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| `get(path)`                   | Returns value at dot-notation path                    |
| `getRequired(path)`           | Returns value, throws if `undefined` or `null`        |
| `getOrDefault(path, default)` | Returns value or fallback                             |
| `getNumber(path)`             | Returns value coerced to `number`                     |
| `getBoolean(path)`            | Returns value coerced to `boolean`                    |
| `getArray(path, delimiter?)`  | Returns value as `string[]`, splits strings           |
| `getUrl(path)`                | Returns value as `URL`                                |
| `getParsed(path, parser)`     | Returns value transformed by a custom parser function |
| `getMany(paths)`              | Returns multiple values keyed by path                 |
| `getAll()`                    | Returns the entire config object                      |

## Validation

- Runs during module bootstrap using the Standard Schema `~standard.validate` interface.
- Works with any compliant library: Zod, Valibot, ArkType, etc.
- Throws with formatted field-level issue messages on failure.
- When `schema` is omitted, the raw merged config is used as-is.

## License

MIT
