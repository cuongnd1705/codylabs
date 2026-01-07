import { AppEnv } from '../enums';

const checkEnv = (env: AppEnv): boolean => process.env.NODE_ENV?.toLowerCase() === env;

export const isLocal = (): boolean => checkEnv(AppEnv.Local);

export const isDevelopment = (): boolean => checkEnv(AppEnv.Development);

export const isStaging = (): boolean => checkEnv(AppEnv.Staging);

export const isProduction = (): boolean => checkEnv(AppEnv.Production);
