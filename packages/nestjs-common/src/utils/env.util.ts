const checkEnv = (env: string): boolean => process.env.NODE_ENV?.startsWith(env) ?? false;

export const isDev = (): boolean => checkEnv('dev');

export const isQa = (): boolean => checkEnv('qa');

export const isUat = (): boolean => checkEnv('uat');

export const isProd = (): boolean => checkEnv('prod');
