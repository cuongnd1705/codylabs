import { Logger } from '@nestjs/common';
import destr from 'destr';

const logger = new Logger('JsonParser');

export function parseJsonFile(content: string, filePath: string): Record<string, unknown> {
  if (!content.trim()) {
    logger.warn(`Empty config file: ${filePath}`);

    return {};
  }

  const parsed = destr(content);

  if (parsed === null || parsed === undefined) {
    logger.warn(`Invalid JSON in config file: ${filePath}`);

    return {};
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    logger.warn(`Config file must contain an object: ${filePath}`);

    return {};
  }

  return parsed as Record<string, unknown>;
}
