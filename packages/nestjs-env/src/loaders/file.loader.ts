import { Logger } from '@nestjs/common';
import { globSync } from 'glob';
import fs from 'node:fs';
import path from 'node:path';

import type { Loader } from './types';

import { parseEnvFile, parseJsonFile } from '../parsers';
import { merge } from '../utils';

export interface FileLoaderOptions {
  /**
   * The environment name (e.g. `process.env.NODE_ENV`). Used to resolve
   * environment-specific config files such as `global.production.json`.
   */
  env?: string;
  /**
   * Directory (relative to `basePath`) containing config files.
   * @default 'config'
   */
  configDir?: string;
  /**
   * Base path from which `configDir` is resolved.
   * @default process.cwd()
   */
  basePath?: string;
  /**
   * File extensions to consider when resolving config files.
   * @default ['.json']
   */
  extensions?: string[];
  /**
   * When `true`, files matching `*.global{ext}` inside `configDir` are
   * automatically included.
   * @default true
   */
  enableGlobalPattern?: boolean;
  /**
   * Separator used to convert flat `.env` keys into a nested object.
   * For example `APP__PORT=3000` with separator `__` becomes `{ app: { port: 3000 } }`.
   * @default '__'
   */
  nestingSeparator?: string;
}

const logger = new Logger('FileLoader');

/**
 * Loads configuration from layered files in the following order (later entries
 * take precedence over earlier ones):
 *
 * 1. `global{ext}`
 * 2. `*.global{ext}` (when `enableGlobalPattern` is `true`)
 * 3. `global.{env}{ext}`
 * 4. `local{ext}`
 * 5. `local.{env}{ext}`
 * 6. `secret{ext}`
 */
export function fileLoader(options: FileLoaderOptions = {}): Loader {
  return (): Record<string, unknown> => {
    const {
      env,
      configDir = 'config',
      basePath = process.cwd(),
      extensions = ['.json'],
      enableGlobalPattern = true,
      nestingSeparator = '__',
    } = options;

    let config: Record<string, unknown> = {};

    const configFilePaths = resolveConfigFilePaths({
      env,
      configDir,
      basePath,
      extensions,
      enableGlobalPattern,
    });

    logger.log(`Loading configuration from ${configFilePaths.length} files`);

    for (const configFilePath of configFilePaths) {
      try {
        const fileConfig = readFile(configFilePath, nestingSeparator);

        config = merge(config, fileConfig);

        logger.debug(`Loaded config from: ${configFilePath}`);
      } catch (error: unknown) {
        logger.warn(
          `Failed to load config from ${configFilePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return config;
  };
}

function resolveConfigFilePaths(options: {
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
    ...(enableGlobalPattern ? resolveGlobalPatternFiles(basePath, configDir, extensions) : []),
    env ? resolveFirst(`global.${env}`) : false,
    resolveFirst('local'),
    env ? resolveFirst(`local.${env}`) : false,
    resolveFirst('secret'),
  ];

  const existingPaths = configPaths.filter((p): p is string => typeof p === 'string');

  logger.debug(`Resolved config files: ${existingPaths.join(', ') || '(none)'}`);

  return existingPaths;
}

function resolveGlobalPatternFiles(basePath: string, configDir: string, extensions: string[]): string[] {
  const files: string[] = [];

  try {
    for (const ext of extensions) {
      const pattern = path.join(basePath, configDir, `*.global${ext}`);

      files.push(...globSync(pattern));
    }
  } catch (error: unknown) {
    logger.warn(`Failed to resolve global pattern files: ${error instanceof Error ? error.message : String(error)}`);
  }

  return files;
}

function readFile(filePath: string, nestingSeparator: string): Record<string, unknown> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.env':
      return parseEnvFile(content, filePath, nestingSeparator);
    case '.json':
      return parseJsonFile(content, filePath);
    default:
      logger.warn(`Unsupported config file extension "${ext}": ${filePath}`);

      return {};
  }
}
