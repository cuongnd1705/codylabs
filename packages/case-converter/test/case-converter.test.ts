import { camelize, camelizeKeys, decamelize, decamelizeKeys, depascalizeKeys, pascalize, pascalizeKeys } from '../src';

describe('case-converter', () => {
  describe('camelize', () => {
    it('should convert snake_case to camelCase', () => {
      expect(camelize('hello_world')).toBe('helloWorld');
    });

    it('should convert kebab-case to camelCase', () => {
      expect(camelize('hello-world')).toBe('helloWorld');
    });

    it('should handle numerical values', () => {
      expect(camelize('123')).toBe('123');
    });

    it('should handle multiple separators', () => {
      expect(camelize('hello_world-and_universe')).toBe('helloWorldAndUniverse');
    });
  });

  describe('pascalize', () => {
    it('should convert snake_case to PascalCase', () => {
      expect(pascalize('hello_world')).toBe('HelloWorld');
    });

    it('should convert camelCase to PascalCase', () => {
      expect(pascalize('helloWorld')).toBe('HelloWorld');
    });
  });

  describe('decamelize', () => {
    it('should convert camelCase to snake_case', () => {
      expect(decamelize('helloWorld')).toBe('hello_world');
    });

    it('should handle custom separator', () => {
      expect(decamelize('helloWorld', { separator: '-' })).toBe('hello-world');
    });
  });

  describe('camelizeKeys', () => {
    it('should convert object keys from snake_case to camelCase', () => {
      const input = {
        user_name: 'John',
        email_address: 'john@example.com',
        nested_object: {
          phone_number: '123456789',
        },
      };

      const expected = {
        userName: 'John',
        emailAddress: 'john@example.com',
        nestedObject: {
          phoneNumber: '123456789',
        },
      };

      expect(camelizeKeys(input)).toEqual(expected);
    });

    it('should handle arrays', () => {
      const input = [{ user_name: 'John' }, { user_name: 'Jane' }];

      const expected = [{ userName: 'John' }, { userName: 'Jane' }];

      expect(camelizeKeys(input)).toEqual(expected);
    });

    it('should not modify special types', () => {
      const date = new Date();
      const regex = /test/;
      const input = {
        date_value: date,
        regex_value: regex,
        boolean_value: true,
      };

      const expected = {
        dateValue: date,
        regexValue: regex,
        booleanValue: true,
      };

      expect(camelizeKeys(input)).toEqual(expected);
    });
  });

  describe('decamelizeKeys', () => {
    it('should convert object keys from camelCase to snake_case', () => {
      const input = {
        userName: 'John',
        emailAddress: 'john@example.com',
        nestedObject: {
          phoneNumber: '123456789',
        },
      };

      const expected = {
        user_name: 'John',
        email_address: 'john@example.com',
        nested_object: {
          phone_number: '123456789',
        },
      };

      expect(decamelizeKeys(input)).toEqual(expected);
    });
  });

  describe('pascalizeKeys', () => {
    it('should convert object keys to PascalCase', () => {
      const input = {
        user_name: 'John',
        email_address: 'john@example.com',
      };

      const expected = {
        UserName: 'John',
        EmailAddress: 'john@example.com',
      };

      expect(pascalizeKeys(input)).toEqual(expected);
    });
  });

  describe('depascalizeKeys', () => {
    it('should convert object keys from PascalCase to snake_case', () => {
      const input = {
        UserName: 'John',
        EmailAddress: 'john@example.com',
      };

      const expected = {
        user_name: 'John',
        email_address: 'john@example.com',
      };

      expect(depascalizeKeys(input)).toEqual(expected);
    });
  });

  describe('custom processing', () => {
    it('should support custom processing function', () => {
      const input = {
        user_name: 'John',
        email_address: 'john@example.com',
      };

      const customProcess = (key: string, convert: Function) => `prefix_${convert(key)}`;

      const expected = {
        prefix_userName: 'John',
        prefix_emailAddress: 'john@example.com',
      };

      expect(camelizeKeys(input, { process: customProcess })).toEqual(expected);
    });
  });
});
