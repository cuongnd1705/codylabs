import type { StandardSchemaV1 } from '@standard-schema/spec';

import { DynamicModule, Global, Logger, Module } from '@nestjs/common';

import { ENV_CONFIG } from './constants';
import {
  ASYNC_OPTIONS_TYPE,
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
} from './env.module-definition';
import { EnvModuleOptions } from './interfaces';
import { EnvService } from './services';
import { merge } from './utils';

@Global()
@Module({})
export class EnvModule extends ConfigurableModuleClass {
  private static readonly logger = new Logger(EnvModule.name);

  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    const parentModule = super.register(options);

    return {
      ...parentModule,
      providers: [
        ...(parentModule.providers ?? []),
        {
          provide: ENV_CONFIG,
          useFactory: async () => {
            const rawConfig = await this.runLoaders(options);

            return this.validate(options.schema, rawConfig);
          },
        },
        EnvService,
      ],
      exports: [EnvService, ENV_CONFIG, ...(parentModule.exports ?? [])],
    };
  }

  static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    const parentModule = super.registerAsync(options);

    return {
      ...parentModule,
      providers: [
        ...(parentModule.providers ?? []),
        {
          provide: ENV_CONFIG,
          useFactory: async (moduleOptions: EnvModuleOptions) => {
            const rawConfig = await this.runLoaders(moduleOptions);

            return this.validate(moduleOptions.schema, rawConfig);
          },
          inject: [MODULE_OPTIONS_TOKEN],
        },
        EnvService,
      ],
      exports: [EnvService, ENV_CONFIG, ...(parentModule.exports ?? [])],
    };
  }

  private static async runLoaders(options: EnvModuleOptions): Promise<Record<string, unknown>> {
    const { load } = options;

    if (!load) {
      return {};
    }

    const loaders = Array.isArray(load) ? load : [load];
    let config: Record<string, unknown> = {};

    for (const loader of loaders) {
      try {
        const partial = await loader();

        config = merge(config, partial);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;

        this.logger.error(`Loader failed: ${message}`, stack);
        throw error;
      }
    }

    return config;
  }

  private static async validate(
    schema: StandardSchemaV1 | undefined,
    config: Record<string, unknown>,
  ): Promise<unknown> {
    if (!schema) {
      return config;
    }

    try {
      const result = await schema['~standard'].validate(config);

      if ('issues' in result && result.issues) {
        const errorMessages = this.formatValidationIssues(result.issues);

        throw new Error(`Configuration validation failed:\n${errorMessages}`);
      }

      this.logger.log('Configuration validated successfully');

      return (result as StandardSchemaV1.SuccessResult<unknown>).value;
    } catch (error: unknown) {
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Configuration validation failed', stack);
      throw error;
    }
  }

  private static formatValidationIssues(issues: readonly StandardSchemaV1.Issue[]): string {
    return issues
      .map((issue) => {
        const issuePath = issue.path?.map((segment) => (typeof segment === 'object' ? segment.key : segment)).join('.');

        return issuePath ? `  - ${issuePath}: ${issue.message}` : `  - ${issue.message}`;
      })
      .join('\n');
  }
}
