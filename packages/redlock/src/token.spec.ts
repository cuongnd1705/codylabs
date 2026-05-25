import { generateToken } from './token.js';

describe('generateToken', () => {
  it('should generate a base64-encoded token', () => {
    const token = generateToken();

    // Should be a string
    expect(typeof token).toBe('string');

    // Should be base64 encoded (only contains valid base64 characters)
    expect(token).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('should generate tokens of exact specified lengths', () => {
    const token8 = generateToken(8);
    const token16 = generateToken(16);
    const token32 = generateToken(32);

    // Should generate tokens of exact length requested
    expect(token8.length).toBe(8);
    expect(token16.length).toBe(16);
    expect(token32.length).toBe(32);
  });

  it('should generate unique tokens', () => {
    const tokens = new Set();
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      const token = generateToken();
      expect(tokens.has(token)).toBe(false);
      tokens.add(token);
    }

    expect(tokens.size).toBe(iterations);
  });

  it('should use default length when no parameter provided', () => {
    const token = generateToken();

    // Default is 22 characters
    expect(token.length).toBe(22);
  });

  it('should throw error for invalid token length', () => {
    expect(() => generateToken(0)).toThrow('Token length must be positive');
    expect(() => generateToken(-1)).toThrow('Token length must be positive');
  });
});
