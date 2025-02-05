import { clone, lowerize, mapEntries, mapKeys, mapValues, omit, pick, shake, upperize } from '../src';

const NULL = null as unknown as {};

describe('object module', () => {
  describe('shake function', () => {
    test('removes all undefined values', () => {
      const result = shake({
        x: 2,
        y: null,
        z: undefined,
        o: false,
        r: 'x',
      });
      expect(result).toEqual({
        x: 2,
        y: null,
        o: false,
        r: 'x',
      });
    });
    test('removes values based on filter function input', () => {
      const result = shake(
        {
          x: 2,
          y: null,
          z: undefined,
          o: false,
          r: 'x',
        },
        (val) => val !== 'x',
      );
      expect(result).toEqual({
        r: 'x',
      });
    });
    test('handles undefined input', () => {
      const result = shake(undefined);
      expect(result).toEqual({});
    });
  });

  describe('mapKeys function', () => {
    test('runs all keys against mapper function', () => {
      const prefixWith = (prefix: string) => (str: string) => `${prefix}${str}`;
      const result = mapKeys(
        {
          x: 22,
          y: 8,
        },
        prefixWith('x'),
      );
      expect(result).toEqual({
        xx: 22,
        xy: 8,
      });
    });
  });

  describe('mapValues function', () => {
    test('runs all values against mapper function', () => {
      const prefixWith = (prefix: string) => (str: string) => `${prefix}${str}`;
      const result = mapValues(
        {
          x: 'hi',
          y: 'bye',
        },
        prefixWith('x'),
      );
      expect(result).toEqual({
        x: 'xhi',
        y: 'xbye',
      });
    });
  });

  describe('lowerize function', () => {
    test('changes all keys to lower case', () => {
      const result = lowerize({
        'X-Api-Key': 'value',
        Bearer: 'value',
      });
      expect(result).toEqual({
        'x-api-key': 'value',
        bearer: 'value',
      });
    });
  });

  describe('upperize function', () => {
    test('changes all keys to upper case', () => {
      const result = upperize({
        'x-api-key': 'value',
        bearer: 'value',
      });
      expect(result).toEqual({
        'X-API-KEY': 'value',
        BEARER: 'value',
      });
    });
  });

  describe('clone function', () => {
    test('copies the primitives', () => {
      const arr = [1.1, 'How you doin?', false, Symbol('key'), BigInt('1'), undefined, null];
      for (const elm of arr) {
        const newElm = clone(elm);
        expect(elm).toBe(newElm);
      }
    });
    test('copies arrays', () => {
      const arr = [{ a: 0 }, 1, 2, 3];
      const result = clone(arr);

      expect(arr).not.toBe(result);
      for (const i in result) {
        expect(arr[i]).toBe(result[i]);
      }
    });
    test('copies functions', () => {
      const fa = () => 0;
      const fb = clone(fa);

      expect(fa).not.toBe(fb);
      expect(fa()).toBe(fb());
    });
    test('copies objects (class instances) without losing the class type', () => {
      class Data {
        val = 0;
      }

      const obj = new Data();
      obj.val = 1;
      const result = clone(obj);

      expect(obj).not.toBe(result);
      expect(obj.constructor.name).toBe(result.constructor.name);
      expect(obj.val).toBe(result.val);
    });
    test('copies all attributes from object', () => {
      const obj = {
        x: 22,
        add: (a: number, b: number) => a + b,
        child: {
          key: 'yolo',
        },
      };
      const result = clone(obj);
      expect(result.x).toBe(obj.x);
      expect(result.add(2, 2)).toBe(obj.add(2, 2));
      expect(result.child.key).toBe(obj.child.key);
    });
    test('copies all attributes from class instance', () => {
      class Data {
        public x = 22;
        public add(a: number, b: number) {
          return a + b;
        }
        public child: any = {
          key: 'yolo',
        };
      }
      const result = clone(new Data());
      expect(result.x).toBe(22);
      // @warning will not copy functions from class instance
      // expect(result.add(2, 2)).toBe(4)
      expect(result.child.key).toBe('yolo');
    });
  });

  // describe('listify function', () => {
  //   test('handles null input', () => {
  //     const result = listify(null as any as Record<string, string>, () => 1);
  //     expect(result).toEqual([]);
  //   });
  //   test('handles empty object', () => {
  //     const result = listify({} as Record<string, string>, () => 1);
  //     expect(result).toEqual([]);
  //   });
  //   test('calls toItem to convert to list', () => {
  //     type Index = 'one' | 'two';
  //     const obj: Record<Index, any> = {
  //       one: { name: 'ray' },
  //       two: { name: 'ash' },
  //     };
  //     const result = listify(obj, (key, value) => ({
  //       index: key,
  //       name: value.name,
  //     }));
  //     expect(result).toEqual([
  //       { index: 'one', name: 'ray' },
  //       { index: 'two', name: 'ash' },
  //     ]);
  //   });
  // });

  describe('pick function', () => {
    test('handles null input', () => {
      const result = pick(null as unknown as Record<string, unknown>, []);
      expect(result).toEqual({});
    });
    test('handles empty keys', () => {
      const result = pick({ a: 2 }, []);
      expect(result).toEqual({});
    });
    test('handle key not in object', () => {
      const result = pick({ a: 2, b: 3 }, ['c'] as any);
      expect(result).toEqual({} as any);
    });
    test('handle one key not in object', () => {
      const result = pick({ a: 2, b: 3 }, ['a', 'c'] as any);
      expect(result).toEqual({ a: 2 } as any);
    });
    test('does not ignore undefined values', () => {
      const result = pick({ a: 2, b: undefined }, ['b']);
      expect(result).toEqual({ b: undefined });
    });
    test('returns picked properties only', () => {
      const result = pick({ a: 2, b: 4 }, ['a']);
      expect(result).toEqual({
        a: 2,
      });
    });
    test('type: accepts an interface', () => {
      interface SomeDeclaredType {
        a: string;
        b: Error;
        c: number[];
      }
      const x: SomeDeclaredType = {
        a: 'alpha',
        b: new Error('beta'),
        c: [3],
      };
      const result = pick(x, ['a']);
      expect(result).toEqual({
        a: 'alpha',
      });
    });
    test('works with proxified objects', () => {
      const target = {
        a: 'hello',
        b: 'everyone',
      };
      const handler1 = {
        get() {
          return 'world';
        },
      };
      const proxified = new Proxy(target, handler1);
      const result = pick(proxified, ['a']);
      expect(result).toEqual({
        a: 'world',
      });
    });
    test('works with objects created without the prototype chain of Object e.g. by `Object.create(null)`', () => {
      const obj = Object.create(null);
      obj.a = 2;
      obj.b = 4;
      const result = pick(obj, ['a']);
      expect(result).toEqual({
        a: 2,
      });
    });
    test('works with objects that have `hasOwnProperty` overwritten', () => {
      const obj = { a: 2, b: 4 };
      Object.defineProperty(obj, 'hasOwnProperty', {
        value: () => 'OVERWRITTEN',
        configurable: true,
        writable: true,
      });
      const result = pick(obj, ['a']);
      expect(result).toEqual({
        a: 2,
      });
    });
  });

  describe('omit function', () => {
    const person = {
      name: 'jay',
      age: 20,
      active: true,
    };
    test('handles null input', () => {
      const result = omit(null, []);
      expect(result).toEqual({});
    });
    test('handles empty keys', () => {
      const result = omit(person, []);
      expect(result).toEqual(person);
    });
    test('handles null keys', () => {
      const result = omit(person, null as unknown as []);
      expect(result).toEqual(person);
    });
    test('returns object without omitted properties', () => {
      const result = omit(person, ['name']);
      expect(result).toEqual({
        age: 20,
        active: true,
      });
    });
  });

  // describe('get function', () => {
  //   type Person = {
  //     name: string;
  //     age: number;
  //     friends?: Person[];
  //   };
  //   const jay: Person = {
  //     name: 'jay',
  //     age: 17,
  //     friends: [
  //       {
  //         name: 'carl',
  //         age: 17,
  //         friends: [
  //           {
  //             name: 'sara',
  //             age: 17,
  //           },
  //         ],
  //       },
  //     ],
  //   };
  //   test('handles null and undefined input', () => {
  //     expect(get(null, 'name')).toBeNull();
  //     expect(get(undefined, 'name')).toBeNull();
  //   });
  //   test('respects undefined as default value', () => {
  //     expect(get({}, 'a.b.c', undefined)).toBeUndefined();
  //   });
  //   test('returns specified value or default using path', () => {
  //     expect(get({ age: undefined }, 'age', 22)).toBe(22);
  //     expect(get(jay, 'friends[0].age')).toBe(17);
  //     expect(get(jay, 'friends["0"].age')).toBe(17);
  //     expect(get(jay, 'friends.0.age')).toBe(17);
  //     expect(get(jay, 'friends.1.age')).toBeNull();
  //     expect(get(jay, 'friends.0.friends[0].name')).toBe('sara');
  //     expect(get(jay, 'name')).toBe('jay');
  //     expect(get(jay, '[name]')).toBe('jay');
  //     expect(get(jay, '["name"]')).toBe('jay');
  //     expect(get(jay, 'friends[0][name]')).toBe('carl');
  //     expect(get(jay, 'friends[0].friends[0].friends[0].age', 22)).toBe(22);
  //   });
  // });

  describe('mapEntries function', () => {
    const peopleByRole = {
      admin: 'jay',
      user: 'fey',
      guest: 'bray',
    };
    test('handles null input', () => {
      const result = mapEntries(
        NULL,
        null as unknown as (key: never, value: never) => [string | number | symbol, unknown],
      );
      expect(result).toEqual({});
    });
    test('correctly maps keys and values', () => {
      const result = mapEntries(peopleByRole, (key, value) => [value, key.toUpperCase()]);
      expect(result.jay).toBe('ADMIN');
      expect(result.fey).toBe('USER');
      expect(result.bray).toBe('GUEST');
    });
  });

  // describe('invert function', () => {
  //   const peopleByRole = {
  //     admin: 'jay',
  //     user: 'fey',
  //     guest: 'bray',
  //   };
  //   test('handles null input', () => {
  //     const result = invert(NULL);
  //     expect(result).toEqual({});
  //   });
  //   test('correctly maps keys and values', () => {
  //     const result = invert(peopleByRole);
  //     expect(result.jay).toBe('admin');
  //     expect(result.fey).toBe('user');
  //     expect(result.bray).toBe('guest');
  //   });
  // });

  // describe('assign function', () => {
  //   const initial = {
  //     name: 'jay',
  //     cards: ['ac'],
  //     location: {
  //       street: '23 main',
  //       state: {
  //         abbrv: 'FL',
  //         name: 'Florida',
  //       },
  //     },
  //   };
  //   const override = {
  //     name: 'charles',
  //     cards: ['4c'],
  //     location: {
  //       street: '8114 capo',
  //       state: {
  //         abbrv: 'TX',
  //         name: 'Texas',
  //       },
  //     },
  //   };
  //   test('handles both null input', () => {
  //     const result = assign(NULL, NULL);
  //     expect(result).toEqual({});
  //   });
  //   test('handles null first input', () => {
  //     const result = assign({ a: 'y' }, NULL);
  //     expect(result).toEqual({ a: 'y' });
  //   });
  //   test('handles null last input', () => {
  //     const result = assign(NULL, { a: 'y' });
  //     expect(result).toEqual({ a: 'y' });
  //   });
  //   test('correctly assign a with values from b', () => {
  //     const result = assign(initial, override);
  //     expect(result).toEqual(override);
  //   });
  //   test('handles initial have unique value', () => {
  //     const result = assign({ a: 'x' }, {});
  //     expect(result).toEqual({ a: 'x' });
  //   });
  //   test('handles override have unique value', () => {
  //     const result = assign({}, { b: 'y' });
  //     expect(result).toEqual({ b: 'y' });
  //   });
  // });

  // describe('keys function', () => {
  //   test('handles bad input', () => {
  //     expect(keys({})).toEqual([]);
  //     expect(keys(null as any)).toEqual([]);
  //     expect(keys(undefined as any)).toEqual([]);
  //   });
  //   test('returns correct list of keys', () => {
  //     const ra = {
  //       name: 'ra',
  //       power: 100,
  //       friend: {
  //         name: 'loki',
  //         power: 80,
  //       },
  //       enemies: [
  //         {
  //           name: 'hathor',
  //           power: 12,
  //         },
  //       ],
  //     };
  //     expect(keys(ra)).toEqual(['name', 'power', 'friend.name', 'friend.power', 'enemies.0.name', 'enemies.0.power']);
  //   });
  // });

  // describe('set function', () => {
  //   test('handles bad input', () => {
  //     expect(set({}, '', {})).toEqual({});
  //     expect(set({}, null as any, {})).toEqual({});
  //     expect(set({}, '', null as any)).toEqual({});
  //     expect(set(null as any, '', {})).toEqual({});
  //     expect(set(null as any, null as any, null as any)).toEqual({});
  //     expect(set({ foo: true }, 'foo', false)).toEqual({ foo: false });
  //     expect(set({}, 'foo', 0)).toEqual({ foo: 0 });
  //   });
  //   test('sets deep values correctly', () => {
  //     expect(set({}, 'cards.value', 2)).toEqual({
  //       cards: { value: 2 },
  //     });
  //     expect(set({}, 'cards.0.value', 2)).toEqual({
  //       cards: [{ value: 2 }],
  //     });
  //     expect(set({}, 'cards.0.0.value', 2)).toEqual({
  //       cards: [[{ value: 2 }]],
  //     });
  //     expect(set({}, 'cards.[0].[0].value', 2)).toEqual({
  //       cards: [[{ value: 2 }]],
  //     });
  //     expect(set({}, 'cards.[1].[1].value', 2)).toEqual({
  //       cards: [, [, { value: 2 }]],
  //     });
  //   });
  // });

  // describe('crush function', () => {
  //   test('handles bad input', () => {
  //     expect(crush({})).toEqual({});
  //     expect(crush(null as any)).toEqual({});
  //     expect(crush(undefined as any)).toEqual({});
  //   });
  //   test('returns correctly crushed object', () => {
  //     const now = new Date();
  //     const ra = {
  //       name: 'ra',
  //       power: 100,
  //       friend: {
  //         name: 'loki',
  //         power: 80,
  //       },
  //       enemies: [
  //         {
  //           name: 'hathor',
  //           power: 12,
  //         },
  //       ],
  //       timestamp: now,
  //     };
  //     expect(crush(ra)).toEqual({
  //       name: 'ra',
  //       power: 100,
  //       'friend.name': 'loki',
  //       'friend.power': 80,
  //       'enemies.0.name': 'hathor',
  //       'enemies.0.power': 12,
  //       timestamp: now,
  //     });
  //   });
  // });

  // describe('construct function', () => {
  //   test('handles bad input', () => {
  //     expect(construct({})).toEqual({});
  //     expect(construct(null as any)).toEqual({});
  //     expect(construct(undefined as any)).toEqual({});
  //   });
  //   test('returns correctly constructed object', () => {
  //     const now = new Date();
  //     const ra = {
  //       name: 'ra',
  //       power: 100,
  //       friend: {
  //         name: 'loki',
  //         power: 80,
  //       },
  //       enemies: [
  //         {
  //           name: 'hathor',
  //           power: 12,
  //         },
  //         {
  //           name: 'vishnu',
  //           power: 58,
  //         },
  //       ],
  //       timestamp: now,
  //     };
  //     expect(
  //       construct({
  //         name: 'ra',
  //         power: 100,
  //         'friend.name': 'loki',
  //         'friend.power': 80,
  //         'enemies.0.name': 'hathor',
  //         'enemies.0.power': 12,
  //         'enemies.1.name': 'vishnu',
  //         'enemies.1.power': 58,
  //         timestamp: now,
  //       }),
  //     ).toEqual(ra);
  //   });
  // });
});
