export interface BaseValidator {
  required?: boolean;
  message?: string;
}

export interface BaseArrayValidator {
  arrayMaxSize?: number;
  arrayMinSize?: number;
  each?: boolean;
}

export interface DateFieldOptions extends BaseValidator, BaseArrayValidator {
  greaterThan?: boolean;
  lessThan?: boolean;
  date?: Date;
}

export interface NumberFieldOptions extends BaseValidator, BaseArrayValidator {
  min?: number;
  max?: number;
  int?: boolean;
  positive?: boolean;
}

export interface StringFieldOptions extends BaseValidator, BaseArrayValidator {
  trim?: boolean;
  regex?: RegExp;
  minLength?: number;
  maxLength?: number;
  sanitize?: boolean;
  numberString?: boolean;
  base64?: boolean;
  url?: boolean;
  email?: boolean;
  case?: 'upper' | 'lower' | 'constant' | 'camel' | 'kebab' | 'pascal' | 'snake' | 'title';
}

export interface MinMaxLengthOptions extends Pick<StringFieldOptions, 'each' | 'minLength' | 'maxLength'> {}

export interface EnumFieldOptions extends BaseValidator, BaseArrayValidator {}

export interface BooleanFieldOptions extends BaseValidator, BaseArrayValidator {}

export interface NestedFieldOptions extends BaseValidator, BaseArrayValidator {}

export interface ObjectFieldOptions extends BaseValidator, BaseArrayValidator {}
