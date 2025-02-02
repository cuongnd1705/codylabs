import { getFromSeed } from './seed';

type Style = 'lowerCase' | 'upperCase' | 'capital';

export interface Config {
  dictionaries: string[][];
  separator?: string;
  length?: number;
  style?: Style;
  seed?: number | string;
}

export class UniqueNamesGeneratorHandler {
  private readonly dictionaries: string[][];
  private readonly length: number;
  private readonly separator: string;
  private readonly style: Style;
  private readonly seed: number;
  private tmpSeed: number;

  constructor(config: Config) {
    const { length, separator, dictionaries, style, seed } = config;

    this.dictionaries = dictionaries;
    this.separator = separator;
    this.length = length;
    this.style = style;
    this.seed = this.convertSeed(seed);
    this.tmpSeed = this.seed;
  }

  private convertSeed(seed: number | string): number {
    if (typeof seed === 'string') {
      const numberFromString = seed.split('').reduce((acc, curr) => acc + curr.charCodeAt(0), 1);

      const numericSeed = Math.floor(Number(numberFromString));

      return numericSeed;
    }

    return seed;
  }

  private verify() {
    if (!this.dictionaries) {
      throw new Error(
        `Cannot find any dictionary. Please provide at least one, or leave the "dictionary" field empty in the config object`,
      );
    }

    if (this.length <= 0) {
      throw new Error('Invalid length provided');
    }

    if (this.length > this.dictionaries.length) {
      throw new Error(
        `The length cannot be bigger than the number of dictionaries.\n Length provided: ${this.length}. Number of dictionaries provided: ${this.dictionaries.length}`,
      );
    }
  }

  private format(word: string): string {
    if (this.style === 'lowerCase') {
      return word.toLowerCase();
    }
    if (this.style === 'capital') {
      const [firstLetter, ...rest] = word.split('');

      return firstLetter.toUpperCase() + rest.join('');
    }
    if (this.style === 'upperCase') {
      return word.toUpperCase();
    }

    return word;
  }

  getRandomFloat(): number {
    if (this.seed) {
      const res = getFromSeed(this.tmpSeed);

      this.tmpSeed = res * 4294967296;

      return res;
    }

    return Math.random();
  }

  resetTmpSeed() {
    this.tmpSeed = this.seed;
  }

  generate(): string {
    this.verify();
    this.resetTmpSeed();

    return this.dictionaries.slice(0, this.length).reduce((acc: string, curr: string[]) => {
      const randomFloat = this.getRandomFloat();
      const rnd = Math.floor(randomFloat * curr.length);
      const word = this.format(curr[rnd] || '');

      return acc ? `${acc}${this.separator}${word}` : `${word}`;
    }, '');
  }
}
