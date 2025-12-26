import fs from 'node:fs';
import path from 'node:path';

import { DynamicModule, Global, Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClassConstructor, plainToClass } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import destr from 'destr';
import { glob } from 'glob';

import { ConfigurableModuleClass, OPTIONS_TYPE } from './env.module-definition';
import { LoadConfigOptions } from './interfaces';
import { EnvService } from './services';
import { merge } from './utils';

@Global()
@Module({})
export class EnvModule extends ConfigurableModuleClass {
  private static readonly logger = new Logger(EnvModule.name);

  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    return {
      module: EnvModule,
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [() => this.validate(options.class, this.load(options))],
        }),
      ],
      providers: [EnvService],
      exports: [EnvService],
    };
  }

  private static load(options: LoadConfigOptions): Record<string, unknown> {
    const { env, configDir = 'config', extension = '.json', enableGlobalPattern = true } = options;

    let config: Record<string, unknown> = {};

    try {
      const configFilePaths = this.getConfigFilePaths({
        env,
        configDir,
        extension,
        enableGlobalPattern,
      });

      this.logger.log(`Loading configuration from ${configFilePaths.length} files`);

      for (const configFilePath of configFilePaths) {
        try {
          const fileConfig = this.readJsonFile(configFilePath);

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

  private static getConfigFilePaths(options: LoadConfigOptions): string[] {
    const { env, configDir, extension, enableGlobalPattern } = options;

    const getFilePath = (filename: string): string => path.join(process.cwd(), configDir, `${filename}${extension}`);

    const configPaths: (string | false)[] = [
      getFilePath('global'),
      ...(enableGlobalPattern ? this.getGlobalPatternFiles(configDir, extension) : []),
      env ? getFilePath(`global.${env}`) : false,
      getFilePath('local'),
      env ? getFilePath(`local.${env}`) : false,
      getFilePath('secret'),
    ];

    const existingPaths = configPaths
      .filter(Boolean)
      .map(String)
      .filter((filePath) => {
        const exists = fs.existsSync(filePath);

        if (!exists) {
          this.logger.debug(`Config file not found: ${filePath}`);
        }

        return exists;
      });

    return existingPaths;
  }

  private static getGlobalPatternFiles(configDir: string, extension: string): string[] {
    try {
      const globalPattern = `*.global${extension}`;
      const pattern = path.join(process.cwd(), configDir, globalPattern);

      return glob.sync(pattern);
    } catch (error: any) {
      this.logger.warn(`Failed to load global pattern files: ${error.message}`);

      return [];
    }
  }

  private static readJsonFile(filePath: string): Record<string, unknown> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      if (!content.trim()) {
        this.logger.warn(`Empty config file: ${filePath}`);

        return {};
      }

      const parsed = destr(content);

      if (parsed === null || parsed === undefined) {
        this.logger.warn(`Invalid JSON in config file: ${filePath}`);

        return {};
      }

      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        this.logger.warn(`Config file must contain an object: ${filePath}`);

        return {};
      }

      return parsed as Record<string, unknown>;
    } catch (error: any) {
      throw new Error(`Failed to read config file ${filePath}: ${error.message}`);
    }
  }

  private static validate<T extends object>(classConstructor: ClassConstructor<T>, config: Record<string, unknown>): T {
    try {
      const validatedConfig = plainToClass(classConstructor, config, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
        exposeDefaultValues: true,
      });

      const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        const errorMessages = this.formatValidationErrors(errors);

        throw new Error(`Configuration validation failed:\n${errorMessages}`);
      }

      this.logger.log('Configuration validation successfully');

      return validatedConfig;
    } catch (error: any) {
      this.logger.error('Configuration validation failed', error.stack);

      throw error;
    }
  }

  private static formatValidationErrors(errors: ValidationError[]): string {
    const formatError = (error: ValidationError, filePath = ''): string[] => {
      const currentPath = filePath ? `${filePath}.${error.property}` : error.property;
      const messages: string[] = [];

      if (error.constraints) {
        Object.values(error.constraints).forEach((constraint) => {
          messages.push(`  - ${currentPath}: ${constraint}`);
        });
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => {
          messages.push(...formatError(child, currentPath));
        });
      }

      return messages;
    };

    return errors.flatMap((error) => formatError(error)).join('\n');
  }
}
