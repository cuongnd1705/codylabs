import { Transform } from 'class-transformer';

export const Trim = () =>
  Transform((parameters) => {
    const value = parameters.value as string[] | string;

    if (Array.isArray(value)) {
      return value.map((v: string) => v.trim().replace(/\s\s+/g, ' '));
    }

    return value.trim().replaceAll(/\s\s+/g, ' ');
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
