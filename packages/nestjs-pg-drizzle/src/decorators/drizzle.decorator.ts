import { Inject } from '@nestjs/common';

import { getDrizzleInstanceToken } from '../constants';

export const InjectDrizzle = () => Inject(getDrizzleInstanceToken());
