import { camel, constant, kebab, normalizeEmail, pascal, snake, title } from '@codylabs/helper-fns';
import { Transform } from 'class-transformer';

export const Trim = () =>
  Transform((parameters) => {
    const value = parameters.value as string[] | string | null;

    if (!value) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((v: string) => v.trim().replaceAll(/\s{2,}/g, ' '));
    }

    return value.trim().replaceAll(/\s{2,}/g, ' ');
  });

export const ToBoolean = () =>
  Transform(
    (parameters) => {
      switch (parameters.value) {
        case 'true': {
          return true;
        }
        case 'false': {
          return false;
        }
        default: {
          return parameters.value as boolean;
        }
      }
    },
    {
      toClassOnly: true,
    },
  );

export const ToArray = () =>
  Transform((parameters) => (Array.isArray(parameters.value) ? parameters.value : [parameters.value]), {
    toClassOnly: true,
  });

export const ToUpperCase = () =>
  Transform(
    (parameters) => {
      const value = parameters.value;

      if (typeof value === 'string') {
        return value.toUpperCase();
      }

      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? v.toUpperCase() : v));
      }

      return value;
    },
    {
      toClassOnly: true,
    },
  );

export const ToLowerCase = () =>
  Transform(
    (parameters) => {
      const value = parameters.value;

      if (typeof value === 'string') {
        return value.toLowerCase();
      }

      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? v.toLowerCase() : v));
      }

      return value;
    },
    {
      toClassOnly: true,
    },
  );

export const ToConstantCase = () =>
  Transform(
    (parameters) => {
      const value = parameters.value;

      if (typeof value === 'string') {
        return constant(value);
      }

      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? constant(v) : v));
      }

      return value;
    },
    {
      toClassOnly: true,
    },
  );

export const ToCamelCase = () =>
  Transform(
    (parameters) => {
      const value = parameters.value;

      if (typeof value === 'string') {
        return camel(value);
      }

      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? camel(v) : v));
      }

      return value;
    },
    {
      toClassOnly: true,
    },
  );

export const ToPascalCase = () =>
  Transform(
    (parameters) => {
      const value = parameters.value;

      if (typeof value === 'string') {
        return pascal(value);
      }

      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? pascal(v) : v));
      }

      return value;
    },
    {
      toClassOnly: true,
    },
  );

export const ToSnakeCase = () =>
  Transform(
    (parameters) => {
      const value = parameters.value;

      if (typeof value === 'string') {
        return snake(value);
      }

      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? snake(v) : v));
      }

      return value;
    },
    {
      toClassOnly: true,
    },
  );

export const ToKebabCase = () =>
  Transform(
    (parameters) => {
      const value = parameters.value;

      if (typeof value === 'string') {
        return kebab(value);
      }

      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? kebab(v) : v));
      }

      return value;
    },
    {
      toClassOnly: true,
    },
  );

export const ToTitleCase = () =>
  Transform(
    (parameters) => {
      const value = parameters.value;

      if (typeof value === 'string') {
        return title(value);
      }

      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? title(v) : v));
      }

      return value;
    },
    {
      toClassOnly: true,
    },
  );

export const NormalizeEmail = () =>
  Transform(
    (parameters) => {
      const value = parameters.value;

      if (typeof value === 'string') {
        return normalizeEmail(value);
      }

      if (Array.isArray(value)) {
        return value.map((v) => (typeof v === 'string' ? normalizeEmail(v) : v));
      }

      return value;
    },
    {
      toClassOnly: true,
    },
  );
