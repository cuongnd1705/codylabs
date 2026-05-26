export function setNestedValue(obj: Record<string, unknown>, parts: string[], value: unknown): void {
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
