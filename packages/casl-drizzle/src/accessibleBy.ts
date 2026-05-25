import type { Ability, Generics, Normalize, ExtractSubjectType } from '@casl/ability';

import { rulesToCondition } from '@casl/ability/extra';

import type { BaseDrizzleQuery, InferDrizzleTypes } from './types';

function convertToDrizzleQuery(rule: Ability<any, BaseDrizzleQuery>['rules'][number]) {
  return rule.inverted ? { NOT: rule.conditions } : rule.conditions;
}

const DRIZZLE_QUERY_AGGREGATION = {
  and: (conditions: unknown[]) => ({ AND: conditions }),
  or: (conditions: unknown[]) => ({ OR: conditions }),
  empty: () => ({}),
};

type ModelName<TAbility extends Ability<any, BaseDrizzleQuery>> = Extract<
  keyof InferDrizzleTypes<Generics<TAbility>['conditions']>['WhereInput'],
  string
>;

type SubjectType<TAbility extends Ability<any, BaseDrizzleQuery>> = Extract<
  ExtractSubjectType<Normalize<Generics<TAbility>['abilities']>[1]>,
  ModelName<TAbility>
>;

export class AccessibleRecords<TAbility extends Ability<any, BaseDrizzleQuery>> {
  constructor(
    private readonly ability: TAbility,
    private readonly action: string,
  ) {}

  ofType<TSubjectType extends SubjectType<TAbility>>(
    subjectType: TSubjectType,
  ): InferDrizzleTypes<Generics<TAbility>['conditions']>['WhereInput'][TSubjectType] {
    const rules = this.ability.rulesFor(this.action, subjectType);
    const query = rulesToCondition(rules, convertToDrizzleQuery, DRIZZLE_QUERY_AGGREGATION);
    const finalQuery = query === null ? { OR: [] } : query;

    return finalQuery as InferDrizzleTypes<Generics<TAbility>['conditions']>['WhereInput'][TSubjectType];
  }
}

export function accessibleBy<TAbility extends Ability<any, BaseDrizzleQuery>>(
  ability: TAbility,
  action: TAbility['rules'][number]['action'] & string = 'read',
): AccessibleRecords<TAbility> {
  return new AccessibleRecords(ability, action);
}
