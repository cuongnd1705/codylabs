import type { ForcedSubject } from '@casl/ability';

import { type AnyInterpreter, createTranslatorFactory } from '@ucast/core';

import { DrizzleQueryParser } from './DrizzleQueryParser';
import { interpretDrizzleQuery } from './interpretDrizzleQuery';

const parser = new DrizzleQueryParser();

export const drizzleQuery = createTranslatorFactory(parser.parse, interpretDrizzleQuery as AnyInterpreter);

export type Model<T, TName extends string> = T & ForcedSubject<TName>;

export type Subjects<T extends Partial<Record<string, object>>> =
  | keyof T
  | { [K in keyof T]: Model<T[K], K & string> }[keyof T];
