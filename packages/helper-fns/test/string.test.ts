import { camel, capitalize, kebab, normalizeEmail, pascal, snake, template, title, trim } from '../src';

describe('string module', () => {
  describe('capitalize function', () => {
    test('capitalizes the first letter of a single word', () => {
      const result = capitalize('hello');
      expect(result).toBe('Hello');
    });

    test('capitalizes the first letter of the first word in a sentence', () => {
      const result = capitalize('va va voom');
      expect(result).toBe('Va va voom');
    });

    test('returns an empty string if input is empty', () => {
      const result = capitalize('');
      expect(result).toBe('');
    });
  });

  describe('camel function', () => {
    test('returns correctly cased string', () => {
      const result = camel('hello world');
      expect(result).toBe('helloWorld');
    });

    test('returns single word', () => {
      const result = camel('hello');
      expect(result).toBe('hello');
    });

    test('returns empty string for empty input', () => {
      const result = camel('');
      expect(result).toBe('');
    });

    test('a word in camel case should remain in camel case', () => {
      const result = camel('helloWorld');
      expect(result).toBe('helloWorld');
    });

    test('returns non alphanumerics with -space and capital', () => {
      const result = camel('Exobase Starter_flash AND-go');
      expect(result).toBe('exobaseStarterFlashAndGo');
    });
  });

  describe('snake function', () => {
    test('returns correctly cased string', () => {
      const result = snake('hello world');
      expect(result).toBe('hello_world');
    });

    test('must handle strings that are camelCase', () => {
      const result = snake('helloWorld');
      expect(result).toBe('hello_world');
    });

    test('must handle strings that are dash', () => {
      const result = snake('hello-world');
      expect(result).toBe('hello_world');
    });

    test('splits numbers that are next to letters', () => {
      const result = snake('hello-world12_19-bye');
      expect(result).toBe('hello_world_12_19_bye');
    });

    test('does not split numbers when flag is set to false', () => {
      const result = snake('hello-world12_19-bye', {
        splitOnNumber: false,
      });
      expect(result).toBe('hello_world12_19_bye');
    });

    test('returns single word', () => {
      const result = snake('hello');
      expect(result).toBe('hello');
    });

    test('returns empty string for empty input', () => {
      const result = snake('');
      expect(result).toBe('');
    });

    test('returns non alphanumerics with _', () => {
      const result = snake('Exobase Starter_flash AND-go');
      expect(result).toBe('exobase_starter_flash_and_go');
    });
  });

  describe('kebab function', () => {
    test('returns correctly cased string', () => {
      const result = kebab('hello world');
      expect(result).toBe('hello-world');
    });

    test('returns non alphanumerics with -', () => {
      const result = kebab('Exobase Starter_flash AND-go');
      expect(result).toBe('exobase-starter-flash-and-go');
    });

    test('returns single word', () => {
      const result = kebab('hello');
      expect(result).toBe('hello');
    });

    test('returns empty string for empty input', () => {
      const result = kebab('');
      expect(result).toBe('');
    });
  });

  describe('pascal function', () => {
    test('returns correctly cased string', () => {
      const result = pascal('hello world');
      expect(result).toBe('HelloWorld');
    });

    test('returns single word', () => {
      const result = pascal('hello');
      expect(result).toBe('Hello');
    });

    test('returns empty string for empty input', () => {
      const result = pascal('');
      expect(result).toBe('');
    });

    test('returns non alphanumerics with capital', () => {
      const result = pascal('Exobase Starter_flash AND-go');
      expect(result).toBe('ExobaseStarterFlashAndGo');
    });
  });

  describe('title function', () => {
    test('returns correctly cased string', () => {
      const result = title('hello world');
      expect(result).toBe('Hello World');
    });

    test('returns single word', () => {
      const result = title('hello');
      expect(result).toBe('Hello');
    });

    test('returns empty string for empty input', () => {
      const result = title('');
      expect(result).toBe('');
    });

    test('returns non alphanumerics with space and capital', () => {
      const result = title('Exobase Starter_flash AND-go');
      expect(result).toBe('Exobase Starter Flash And Go');
    });
  });

  describe('template function', () => {
    test('replaces placeholders with data', () => {
      const result = template('Hello, {{name}}', { name: 'ray' });
      expect(result).toBe('Hello, ray');
    });

    test('replaces multiple placeholders with data', () => {
      const result = template('Hello, {{name}}. Welcome to {{place}}.', { name: 'ray', place: 'Earth' });
      expect(result).toBe('Hello, ray. Welcome to Earth.');
    });

    test('returns the original string if no placeholders are found', () => {
      const result = template('Hello, world', { name: 'ray' });
      expect(result).toBe('Hello, world');
    });
  });

  describe('trim function', () => {
    test('trims spaces from the beginning and end of the string', () => {
      const result = trim('  hello ');
      expect(result).toBe('hello');
    });

    test('trims specified characters from the beginning and end of the string', () => {
      const result = trim('__hello__', '_');
      expect(result).toBe('hello');
    });

    test('trims multiple specified characters from the beginning and end of the string', () => {
      const result = trim('222222__hello__1111111', '12_');
      expect(result).toBe('hello');
    });

    test('returns empty string for empty input', () => {
      const result = trim('');
      expect(result).toBe('');
    });
  });

  describe('normalizeEmail function', () => {
    test('normalizes email by converting to lowercase and removing dots from the local part', () => {
      const result = normalizeEmail('Test.Email+foo@Example.com');
      expect(result).toBe('testemail@example.com');
    });

    test('normalizes email by ignoring characters after a plus sign in the local part', () => {
      const result = normalizeEmail('Test.Email+foo@Example.com');
      expect(result).toBe('testemail@example.com');
    });

    test('returns the original email if no normalization is needed', () => {
      const result = normalizeEmail('testemail@example.com');
      expect(result).toBe('testemail@example.com');
    });
  });
});
