import type { StandardSchemaV1 } from '@standard-schema/spec';

export interface EnvModuleOptions {
  schema: StandardSchemaV1;
  env?: string;
  configDir?: string;
  basePath?: string;
  extensions?: string[];
  enableGlobalPattern?: boolean;
  nestingSeparator?: string;
}
