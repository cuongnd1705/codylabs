import { Transform } from 'class-transformer';

const trimValue = (value: string) => value.trim().replace(/\s\s+/g, ' ');

const toBooleanValue = (value: string) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
};

const toNumberValue = (value: any) => (Number.isNaN(Number(value)) ? value : Number(value));

export const Trim = () =>
  Transform((parameters) => {
    const value = parameters.value as string[] | string;

    return Array.isArray(value) ? value.map(trimValue) : trimValue(value);
  });

export const ToBoolean = () =>
  Transform((parameters) => toBooleanValue(parameters.value), {
    toClassOnly: true,
  });

export const ToArray = () =>
  Transform((parameters) => (Array.isArray(parameters.value) ? parameters.value : [parameters.value]), {
    toClassOnly: true,
  });

export const ToNumber = () =>
  Transform((parameters) => toNumberValue(parameters.value), {
    toClassOnly: true,
  });
