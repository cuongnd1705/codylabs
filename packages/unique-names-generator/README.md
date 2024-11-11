# case-converter

A lightweight TypeScript utility for converting between different case styles (camelCase, snake_case, PascalCase) in strings and object keys.

## Features

- 🚀 Convert between camelCase, snake_case, and PascalCase
- 🔄 Deep conversion of nested objects and arrays
- ⚡ Lightweight with minimal dependencies
- 🎯 TypeScript support out of the box
- 🛡️ Preserves special types (Date, RegExp, etc.)
- 🔧 Customizable separator and processing options

## Installation

```bash
npm install case-converter
```

or

```bash
yarn add case-converter
```

## Usage

### Basic String Conversion

```typescript
import { camelize, decamelize, pascalize } from 'case-converter';

// Convert to camelCase
camelize('hello_world');  // => 'helloWorld'
camelize('hello-world');  // => 'helloWorld'

// Convert to snake_case
decamelize('helloWorld');  // => 'hello_world'

// Convert to PascalCase
pascalize('hello_world');  // => 'HelloWorld'
```

### Object Key Conversion

```typescript
import { camelizeKeys, decamelizeKeys, pascalizeKeys } from 'case-converter';

const snakeCaseObj = {
  user_name: 'John',
  email_address: 'john@example.com',
  nested_object: {
    phone_number: '123456789'
  }
};

// Convert to camelCase keys
const camelCaseObj = camelizeKeys(snakeCaseObj);
// Result:
// {
//   userName: 'John',
//   emailAddress: 'john@example.com',
//   nestedObject: {
//     phoneNumber: '123456789'
//   }
// }

// Convert back to snake_case keys
const backToSnakeCase = decamelizeKeys(camelCaseObj);

// Convert to PascalCase keys
const pascalCaseObj = pascalizeKeys(snakeCaseObj);
// Result:
// {
//   UserName: 'John',
//   EmailAddress: 'john@example.com',
//   NestedObject: {
//     PhoneNumber: '123456789'
//   }
// }
```

### Custom Options

You can customize the conversion process using options:

```typescript
import { decamelize, decamelizeKeys } from 'case-converter';

// Custom separator
decamelize('helloWorld', { separator: '-' });  // => 'hello-world'

// Custom processing function
const customProcess = (key: string, convert: Function) => {
  return `prefix_${convert(key)}`;
};

const result = camelizeKeys(obj, { 
  process: customProcess,
  separator: '-'  // Custom separator
});
```

## API

### String Conversion Functions

- `camelize(str: string): string` - Converts string to camelCase
- `decamelize(str: string, options?: ProcessOptions): string` - Converts string to snake_case
- `pascalize(str: string): string` - Converts string to PascalCase

### Object Key Conversion Functions

- `camelizeKeys(object: any, options?: ProcessOptions): any` - Converts object keys to camelCase
- `decamelizeKeys(object: any, options?: ProcessOptions): any` - Converts object keys to snake_case
- `pascalizeKeys(object: any, options?: ProcessOptions): any` - Converts object keys to PascalCase
- `depascalizeKeys(object: any, options?: ProcessOptions): any` - Converts object keys from PascalCase to snake_case

### ProcessOptions

```typescript
type ProcessOptions = {
  separator?: string;  // Custom separator (default: '_')
  split?: RegExp;     // Custom split pattern
  process?: (         // Custom processing function
    key: string,
    convert: (key: string, options?: ProcessOptions) => string,
    options?: ProcessOptions,
  ) => string;
};
```

## Special Cases

- Numerical values are preserved as-is
- Special types (Date, RegExp, Boolean, Function) are preserved
- Arrays are processed recursively
- Nested objects are processed recursively

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage
npm run test:coverage
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

If you have any questions or run into issues, please open an issue in the GitHub repository.