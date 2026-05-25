import {
  type AbilityOptions,
  type AbilityOptionsOf,
  type AbilityTuple,
  fieldPatternMatcher,
  Ability,
  type RawRuleFrom,
  type RawRuleOf,
} from '@casl/ability';

import type { BaseDrizzleQuery } from './types';

import { drizzleQuery } from './drizzle/drizzleQuery';

export function createDrizzleAbility<T extends Ability<any, BaseDrizzleQuery>>(
  rules?: RawRuleOf<T>[],
  options?: AbilityOptionsOf<T>,
): T;
export function createDrizzleAbility<A extends AbilityTuple = [string, string], C extends BaseDrizzleQuery = any>(
  rules?: RawRuleFrom<A, C>[],
  options?: AbilityOptions<A, C>,
): Ability<A, C>;
export function createDrizzleAbility(rules: any[] = [], options = {}): Ability<any, any> {
  return new Ability(rules, {
    ...options,
    conditionsMatcher: drizzleQuery,
    fieldMatcher: fieldPatternMatcher,
  });
}
