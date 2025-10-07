import { describe, it, expect, beforeEach } from 'vitest';
import { LexaOrderKey, LexaKey } from '$lib/classes/lexasort.js';

describe('LexaOrderKey', () => {
  let lexaKey;

  beforeEach(() => {
    lexaKey = new LexaOrderKey();
  });

  describe('constructor', () => {
    it('should create instance with default alphabet', () => {
      const key = new LexaOrderKey();
      expect(key.alphabet).toBe('0123456789abcdefghijklmnopqrstuvwxyz');
      expect(key.base).toBe(36);
    });

    it('should create instance with custom alphabet', () => {
      const key = new LexaOrderKey('abc');
      expect(key.alphabet).toBe('abc');
      expect(key.base).toBe(3);
    });

    it('should throw error for alphabet with duplicate characters', () => {
      expect(() => new LexaOrderKey('aab')).toThrow('Alphabet must contain unique, non-empty characters');
    });
  });

  describe('_getCharIndex', () => {
    it('should return correct index for valid characters', () => {
      expect(lexaKey._getCharIndex('0')).toBe(0);
      expect(lexaKey._getCharIndex('9')).toBe(9);
      expect(lexaKey._getCharIndex('a')).toBe(10);
      expect(lexaKey._getCharIndex('z')).toBe(35);
    });

    it('should return -1 for invalid characters', () => {
      expect(lexaKey._getCharIndex('A')).toBe(-1);
      expect(lexaKey._getCharIndex('!')).toBe(-1);
      expect(lexaKey._getCharIndex(' ')).toBe(-1);
    });
  });

  describe('_isValidKey', () => {
    it('should return true for valid keys', () => {
      expect(lexaKey._isValidKey('')).toBe(true);
      expect(lexaKey._isValidKey('0')).toBe(true);
      expect(lexaKey._isValidKey('abc123')).toBe(true);
      expect(lexaKey._isValidKey('z9a0')).toBe(true);
    });

    it('should return false for invalid keys', () => {
      expect(lexaKey._isValidKey(123)).toBe(false);
      expect(lexaKey._isValidKey(null)).toBe(false);
      expect(lexaKey._isValidKey(undefined)).toBe(false);
      expect(lexaKey._isValidKey('ABC')).toBe(false);
      expect(lexaKey._isValidKey('hello!')).toBe(false);
    });
  });

  describe('first', () => {
    it('should return first character of alphabet', () => {
      expect(lexaKey.first()).toBe('0');
      
      const customKey = new LexaOrderKey('xyz');
      expect(customKey.first()).toBe('x');
    });
  });

  describe('mid', () => {
    it('should return middle character of alphabet', () => {
      expect(lexaKey.mid()).toBe('i'); // Math.floor(36/2) = 18, alphabet[18] = 'r'
      
      const customKey = new LexaOrderKey('abc');
      expect(customKey.mid()).toBe('b'); // Math.floor(3/2) = 1, alphabet[1] = 'b' - wait, let me check
    });

    it('should handle even and odd length alphabets', () => {
      const evenKey = new LexaOrderKey('abcd'); // length 4, mid index = 2, char = 'c'
      expect(evenKey.mid()).toBe('c');
      
      const oddKey = new LexaOrderKey('abc'); // length 3, mid index = 1, char = 'b'  
      expect(oddKey.mid()).toBe('b');
    });
  });

  describe('last', () => {
    it('should return last character of alphabet', () => {
      expect(lexaKey.last()).toBe('z');
      
      const customKey = new LexaOrderKey('xyz');
      expect(customKey.last()).toBe('z');
    });
  });

  describe('between', () => {
    it('should generate key between two keys', () => {
      const result = lexaKey.between('a', 'c');
      expect(result > 'a').toBe(true);
      expect(result < 'c').toBe(true);
    });

    it('should handle null/undefined bounds', () => {
      const beforeNull = lexaKey.between(null, 'b');
      expect(beforeNull < 'b').toBe(true);
      expect(beforeNull).toBe('5');
      
      const afterNull = lexaKey.between('a', null);
      expect(afterNull > 'a').toBe(true);
      expect(afterNull).toBe('n');
    });

    it('should handle empty string bounds', () => {
      const result = lexaKey.between('', 'b');
      expect(result < 'b').toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toBe('5');
    });

    it('should throw error for invalid before key', () => {
      expect(() => lexaKey.between('INVALID', 'b')).toThrow('Invalid before key: INVALID');
    });

    it('should throw error for invalid after key', () => {
      expect(() => lexaKey.between('a', 'INVALID')).toThrow('Invalid after key: INVALID');
    });

    it('should throw error when before >= after', () => {
      expect(() => lexaKey.between('b', 'a')).toThrow('Before key must be < after key: b >= a');
      expect(() => lexaKey.between('a', 'a')).toThrow('Before key must be < after key: a >= a');
    });

    it('should handle adjacent keys that have no space between them', () => {
      // This tests the edge case where there's no lexicographic space
      expect(() => lexaKey.between('0', '00')).toThrow('No lexicographic space between "0" and "00"');
    });

    it('should generate keys that maintain sort order', () => {
      const keys = [];
      keys.push('a');
      keys.push(lexaKey.between('a', 'z'));
      keys.push('z');
      
      const sorted = [...keys].sort();
      expect(keys).toEqual(sorted);
    });

    it('should work with multi-character keys', () => {
      const result = lexaKey.between('aa', 'ab');
      expect(result > 'aa').toBe(true);
      expect(result < 'ab').toBe(true);
    });
  });

  describe('generateKeys', () => {
    it('should generate single key when count is 1', () => {
      const keys = lexaKey.generateKeys('a', 'c', 1);
      expect(keys).toHaveLength(1);
      expect(keys[0] > 'a').toBe(true);
      expect(keys[0] < 'c').toBe(true);
    });

    it('should generate multiple keys in order', () => {
      const keys = lexaKey.generateKeys('a', 'z', 3);
      expect(keys).toHaveLength(3);
      
      // Check that all keys are in order
      for (let i = 0; i < keys.length - 1; i++) {
        expect(keys[i] < keys[i + 1]).toBe(true);
      }
      
      // Check bounds
      expect(keys[0] > 'a').toBe(true);
      expect(keys[keys.length - 1] < 'z').toBe(true);
    });

    it('should throw error for invalid count', () => {
      expect(() => lexaKey.generateKeys('a', 'z', 0)).toThrow('Count must be a positive integer');
      expect(() => lexaKey.generateKeys('a', 'z', -1)).toThrow('Count must be a positive integer');
      expect(() => lexaKey.generateKeys('a', 'z', 1.5)).toThrow('Count must be a positive integer');
      expect(() => lexaKey.generateKeys('a', 'z', 'invalid')).toThrow('Count must be a positive integer');
    });

    it('should work with null bounds', () => {
      const keys = lexaKey.generateKeys(null, null, 2);
      expect(keys).toHaveLength(2);
      expect(keys[0] < keys[1]).toBe(true);
    });

    it('should generate keys that are properly spaced', () => {
      const keys = lexaKey.generateKeys('a', 'z', 5);
      
      // Verify all generated keys maintain order with original bounds
      expect('a' < keys[0]).toBe(true);
      for (let i = 0; i < keys.length - 1; i++) {
        expect(keys[i] < keys[i + 1]).toBe(true);
      }
      expect(keys[keys.length - 1] < 'z').toBe(true);
    });
  });

  describe('sortByOrderKey', () => {
    it('should sort items by orderKey property', () => {
      const items = [
        { id: 1, orderKey: 'c' },
        { id: 2, orderKey: 'a' },
        { id: 3, orderKey: 'b' }
      ];
      
      const sorted = LexaOrderKey.sortByOrderKey(items);
      expect(sorted.map(item => item.id)).toEqual([2, 3, 1]);
    });

    it('should handle missing orderKey properties', () => {
      const items = [
        { id: 1, orderKey: 'b' },
        { id: 2 }, // missing orderKey
        { id: 3, orderKey: 'a' }
      ];
      
      const sorted = LexaOrderKey.sortByOrderKey(items);
      // Items without orderKey should be treated as empty string and come first
      expect(sorted.map(item => item.id)).toEqual([2, 3, 1]);
    });

    it('should use custom key property', () => {
      const items = [
        { id: 1, position: 'c' },
        { id: 2, position: 'a' },
        { id: 3, position: 'b' }
      ];
      
      const sorted = LexaOrderKey.sortByOrderKey(items, 'position');
      expect(sorted.map(item => item.id)).toEqual([2, 3, 1]);
    });

    it('should not mutate original array', () => {
      const items = [
        { id: 1, orderKey: 'c' },
        { id: 2, orderKey: 'a' }
      ];
      const original = [...items];
      
      LexaOrderKey.sortByOrderKey(items);
      expect(items).toEqual(original);
    });

    it('should handle empty arrays', () => {
      const sorted = LexaOrderKey.sortByOrderKey([]);
      expect(sorted).toEqual([]);
    });
  });

  describe('exported LexaKey instance', () => {
    it('should be an instance of LexaOrderKey', () => {
      expect(LexaKey).toBeInstanceOf(LexaOrderKey);
    });

    it('should use default alphabet', () => {
      expect(LexaKey.alphabet).toBe(LexaOrderKey.DEFAULT_ALPHABET);
    });

    it('should be usable for basic operations', () => {
      const key = LexaKey.between('a', 'z');
      expect(typeof key).toBe('string');
      expect(key > 'a').toBe(true);
      expect(key < 'z').toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should maintain sort order with complex operations', () => {
      const keys = [];
      
      // Start with initial keys
      keys.push('a');
      keys.push('z');
      
      // Insert between them
      const middle = lexaKey.between('a', 'z');
      keys.splice(1, 0, middle);
      
      // Insert more keys
      const leftMiddle = lexaKey.between('a', middle);
      keys.splice(1, 0, leftMiddle);
      
      const rightMiddle = lexaKey.between(middle, 'z');
      keys.splice(3, 0, rightMiddle);
      
      // Verify order is maintained
      const sorted = [...keys].sort();
      expect(keys).toEqual(sorted);
    });

    it('should work with real-world use case of reordering items', () => {
      // Simulate a todo list with items that can be reordered
      let items = [
        { id: 1, text: 'First task', orderKey: lexaKey.first() },
        { id: 2, text: 'Last task', orderKey: lexaKey.last() }
      ];
      
      // Add item between them
      const betweenKey = lexaKey.between(items[0].orderKey, items[1].orderKey);
      items.push({ id: 3, text: 'Middle task', orderKey: betweenKey });
      
      // Sort and verify order
      const sorted = LexaOrderKey.sortByOrderKey(items);
      expect(sorted.map(item => item.id)).toEqual([1, 3, 2]);
    });
  });
});