import { ConfigurableModuleBuilder } from '@nestjs/common';

import { EnvModuleOptions } from './interfaces';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<EnvModuleOptions>().build();
