const DRIZZLE_INJECTION_TOKEN = Symbol('DRIZZLE_INJECTION_TOKEN');
const DRIZZLE_POOL_TOKEN = Symbol('DRIZZLE_POOL_TOKEN');

export const getDrizzleInstanceToken = () => DRIZZLE_INJECTION_TOKEN;
export const getDrizzlePoolToken = () => DRIZZLE_POOL_TOKEN;
