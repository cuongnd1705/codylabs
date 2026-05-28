import {
  buildAnd,
  type Comparable,
  CompoundCondition,
  type CompoundInstruction,
  type Condition,
  FieldCondition,
  type FieldInstruction,
  type ObjectQueryFieldParsingContext,
  ObjectQueryParser,
} from '@ucast/core';

import { ParsingQueryError } from '../errors';

const isPlainObject = (value: any): value is Record<string, unknown> => {
  return value && (value.constructor === Object || !value.constructor);
};

/** Default operator: direct value comparison (`{ id: 1 }` → equals) */
const equals: FieldInstruction = {
  type: 'field',
  validate(instruction, value) {
    if (Array.isArray(value) || isPlainObject(value)) {
      throw new ParsingQueryError(`"${instruction.name}" does not support comparison of arrays and objects`);
    }
  },
};

/** `{ field: { ne: value } }` — not equal */
const ne: FieldInstruction<unknown, ObjectQueryFieldParsingContext> = {
  type: 'field',
  parse(instruction, value, { hasOperators, field, parse }) {
    if ((isPlainObject(value) && !hasOperators(value)) || Array.isArray(value)) {
      throw new ParsingQueryError(`"${instruction.name}" does not support comparison of arrays and objects`);
    }

    if (!isPlainObject(value)) {
      return new FieldCondition('ne', field, value);
    }

    return new CompoundCondition('NOT', [parse(value, { field })]);
  },
};

/** `{ field: { in: [1, 2] } }` — value in array */
const within: FieldInstruction<unknown[]> = {
  type: 'field',
  validate(instruction, value) {
    if (!Array.isArray(value)) {
      throw ParsingQueryError.invalidArgument(instruction.name, value, 'an array');
    }
  },
};

/** `{ field: { gt: 5 } }` — also used for gte, lt, lte (same validation) */
const comparable: FieldInstruction<Comparable> = {
  type: 'field',
  validate(instruction, value) {
    const type = typeof value;
    const isComparable = type === 'string' || (type === 'number' && Number.isFinite(value)) || value instanceof Date;

    if (!isComparable) {
      throw ParsingQueryError.invalidArgument(instruction.name, value, 'comparable value');
    }
  },
};

const stringField: FieldInstruction<string> = {
  type: 'field',
  validate(instruction, value) {
    if (typeof value !== 'string') {
      throw ParsingQueryError.invalidArgument(instruction.name, value, 'string');
    }
  },
};

const booleanField: FieldInstruction<boolean> = {
  type: 'field',
  validate(instruction, value) {
    if (typeof value !== 'boolean') {
      throw ParsingQueryError.invalidArgument(instruction.name, value, 'a boolean');
    }
  },
};

const arrayField: FieldInstruction<unknown[]> = {
  type: 'field',
  validate(instruction, value) {
    if (!Array.isArray(value)) {
      throw ParsingQueryError.invalidArgument(instruction.name, value, 'an array');
    }
  },
};

const compound: CompoundInstruction = {
  type: 'compound',
  validate(instruction, value) {
    if (!value || typeof value !== 'object') {
      throw ParsingQueryError.invalidArgument(instruction.name, value, 'an array or object');
    }
  },
  parse(instruction, arrayOrObject, { parse }) {
    const value = Array.isArray(arrayOrObject) ? arrayOrObject : [arrayOrObject];
    const conditions = value.map((v) => parse(v));
    return new CompoundCondition(instruction.name, conditions);
  },
};

const inverted = (name: string, baseInstruction: FieldInstruction): FieldInstruction => {
  const baseParse = baseInstruction.parse;

  if (!baseParse) {
    return {
      ...baseInstruction,
      parse(_, value, ctx) {
        return new CompoundCondition('NOT', [new FieldCondition(name, ctx.field, value)]);
      },
    };
  }

  return {
    ...baseInstruction,
    parse(instruction, value, ctx) {
      const condition = baseParse(instruction, value, ctx);
      if (condition.operator !== instruction.name) {
        throw new Error(`Cannot invert "${name}" operator parser because it returns a complex Condition`);
      }
      (condition as { operator: string }).operator = name;
      return new CompoundCondition('NOT', [condition]);
    },
  };
};

const instructions = {
  equals,
  eq: equals,
  ne,
  in: within,
  notIn: inverted('in', within),
  gt: comparable,
  gte: comparable,
  lt: comparable,
  lte: comparable,
  like: stringField,
  ilike: stringField,
  notLike: stringField,
  notIlike: stringField,
  isNull: booleanField,
  isNotNull: booleanField,
  arrayContains: arrayField,
  arrayContained: arrayField,
  arrayOverlaps: arrayField,
  NOT: compound,
  AND: compound,
  OR: compound,
};

export interface ParseOptions {
  field: string;
}

type Query = Record<string, any>;

export class DrizzleQueryParser extends ObjectQueryParser<Query> {
  constructor() {
    super(instructions, {
      defaultOperatorName: 'equals',
    });
  }

  override parse(query: Query, options?: ParseOptions): Condition {
    if (options && options.field) {
      return buildAnd(this.parseFieldOperators(options.field, query));
    }

    return super.parse(query);
  }
}
