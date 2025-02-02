export interface AndGuardOptions {
  throwOnFirstError?: boolean;
  sequential?: boolean;
}

export interface OrGuardOptions {
  throwOnFirstError?: boolean;
}

export interface SequentialGuardOptions {
  throwOnError?: boolean;
}
