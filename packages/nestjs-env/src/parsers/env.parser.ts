import { Logger } from '@nestjs/common';
import destr from 'destr';
import { parse } from 'dotenv';

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

function setNestedValue(obj: Record<string, unknown>, parts: string[], value: unknown): void {
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (current[part] === undefined || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }

    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}
