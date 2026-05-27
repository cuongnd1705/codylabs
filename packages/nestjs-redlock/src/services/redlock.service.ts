import { Redlock } from '@codylabs/redlock';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RedlockService extends Redlock {}
