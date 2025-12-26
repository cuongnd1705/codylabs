import { ClassConstructor } from 'class-transformer';

export interface EnvModuleOptions {
  class: ClassConstructor<object>;
  env?: string;
  configDir?: string;
  extension?: string;
  enableGlobalPattern?: boolean;
}
