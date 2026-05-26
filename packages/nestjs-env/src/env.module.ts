import type { StandardSchemaV1 } from '@standard-schema/spec';

import { DynamicModule, Global, Logger, Module } from '@nestjs/common';
import { glob } from 'glob';
import fs from 'node:fs';
import path from 'node:path';

import { ENV_CONFIG } from './constants';
import {
  ASYNC_OPTIONS_TYPE,
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
  OPTIONS_TYPE,
} from './env.module-definition';
import { EnvModuleOptions } from './interfaces';
import { parseEnvFile, parseJsonFile } from './parsers';
import { EnvService } from './services';
import { merge } from './utils';

@Global()
@Module({})
export class EnvModule extends ConfigurableModuleClass {
  private static readonly logger = new Logger(EnvModule.name);

  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    return {
      module: EnvModule,
      providers: [
        {
          provide: ENV_CONFIG,
          useFactory: async () => {
            const rawConfig = this.load(options);

            return this.validate(options.schema, rawConfig);
          },
        },
        EnvService,
      ],
      exports: [EnvService, ENV_CONFIG],
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
            const rawConfig = this.load(moduleOptions);

            return this.validate(moduleOptions.schema, rawConfig);
          },
          inject: [MODULE_OPTIONS_TOKEN],
        },
        EnvService,
      ],
      exports: [EnvService, ENV_CONFIG],
    };
  }

  private static load(options: EnvModuleOptions): Record<string, unknown> {
    const {
      env,
      configDir = 'config',
      basePath = process.cwd(),
      extensions = ['.json'],
      enableGlobalPattern = true,
      nestingSeparator = '__',
    } = options;

    let config: Record<string, unknown> = {};

    try {
      const configFilePaths = this.getConfigFilePaths({
        env,
        configDir,
        basePath,
        extensions,
        enableGlobalPattern,
      });

      this.logger.log(`Loading configuration from ${configFilePaths.length} files`);

      for (const configFilePath of configFilePaths) {
        try {
          const fileConfig = this.readFile(configFilePath, nestingSeparator);

          config = merge(config, fileConfig);

          this.logger.debug(`Loaded config from: ${configFilePath}`);
        } catch (error: any) {
          this.logger.warn(`Failed to load config from ${configFilePath}: ${error.message}`);
        }
      }

      return config;
    } catch (error: any) {
      this.logger.error('Failed to load configuration', error.stack);
      throw error;
    }
  }

  private static getConfigFilePaths(options: {
    env?: string;
    configDir: string;
    basePath: string;
    extensions: string[];
    enableGlobalPattern: boolean;
  }): string[] {
    const { env, configDir, basePath, extensions, enableGlobalPattern } = options;

    const resolveFirst = (filename: string): string | false => {
      for (const ext of extensions) {
        const filePath = path.join(basePath, configDir, `${filename}${ext}`);

        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }

      return false;
    };

    const configPaths: (string | false)[] = [
      resolveFirst('global'),
      ...(enableGlobalPattern ? this.getGlobalPatternFiles(basePath, configDir, extensions) : []),
      env ? resolveFirst(`global.${env}`) : false,
      resolveFirst('local'),
      env ? resolveFirst(`local.${env}`) : false,
      resolveFirst('secret'),
    ];

    const existingPaths = configPaths.filter((p): p is string => typeof p === 'string');

    this.logger.debug(`Resolved config files: ${existingPaths.join(', ') || '(none)'}`);

    return existingPaths;
  }

  private static getGlobalPatternFiles(basePath: string, configDir: string, extensions: string[]): string[] {
    const files: string[] = [];

    try {
      for (const ext of extensions) {
        const globalPattern = `*.global${ext}`;
        const pattern = path.join(basePath, configDir, globalPattern);

        files.push(...glob.sync(pattern));
      }
    } catch (error: any) {
      this.logger.warn(`Failed to load global pattern files: ${error.message}`);
    }

    return files;
  }

  private static readFile(filePath: string, nestingSeparator: string): Record<string, unknown> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();

      switch (ext) {
        case '.env':
          return parseEnvFile(content, filePath, nestingSeparator);
        case '.json':
          return parseJsonFile(content, filePath);
        default:
          this.logger.warn(`Unsupported config file extension "${ext}": ${filePath}`);

          return {};
      }
    } catch (error: any) {
      throw new Error(`Failed to read config file ${filePath}: ${error.message}`, { cause: error });
    }
  }

  private static async validate(schema: StandardSchemaV1, config: Record<string, unknown>): Promise<unknown> {
    try {
      const result = await schema['~standard'].validate(config);

      if ('issues' in result && result.issues) {
        const errorMessages = this.formatValidationIssues(result.issues);

        throw new Error(`Configuration validation failed:\n${errorMessages}`);
      }

      this.logger.log('Configuration validated successfully');

      return (result as StandardSchemaV1.SuccessResult<unknown>).value;
    } catch (error: any) {
      this.logger.error('Configuration validation failed', error.stack);

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
