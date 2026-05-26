import { Logger } from '@nestjs/common';
import destr from 'destr';
import { parse } from 'dotenv';

import { setNestedValue } from '../utils';

const logger = new Logger('EnvParser');

export function parseEnvFile(content: string, filePath: string, nestingSeparator = '__'): Record<string, unknown> {
  if (!content.trim()) {
    logger.warn(`Empty config file: ${filePath}`);

    return {};
  }

  const flat = parse(content);
  const nested: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.toLowerCase().split(nestingSeparator);
    const coerced = destr(value);

    setNestedValue(nested, parts, coerced);
  }

  return nested;
}
