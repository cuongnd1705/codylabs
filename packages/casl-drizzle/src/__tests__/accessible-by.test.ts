import { type Ability, subject } from '@casl/ability';
import { describe, it, expect } from 'vitest';

import type { DrizzleQuery, Subjects } from '../index';

import { accessibleBy, createDrizzleAbility } from '../index';

interface Post {
  id: number;
  title: string;
  authorId: number;
  status: string;
  private: boolean;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  verified: boolean;
}

type AppSubjects = Subjects<{ User: User; Post: Post }>;
type AppAbility = Ability<[string, 'all' | AppSubjects], DrizzleQuery<{ User: User; Post: Post }>>;

describe('accessibleBy', () => {
  it('returns { OR: [] } when there are no rules for the subject/action', () => {
    const ability = createDrizzleAbility<AppAbility>([
      { action: 'read', subject: 'Post', conditions: { authorId: 1 } },
    ]);

    const query = accessibleBy(ability, 'update').ofType('Post');
    expect(query).toEqual({ OR: [] });
  });

  it('returns conditions from a single rule', () => {
    const ability = createDrizzleAbility<AppAbility>([
      { action: 'read', subject: 'Post', conditions: { authorId: 1 } },
    ]);

    const query = accessibleBy(ability).ofType('Post');
    expect(query).toEqual({ OR: [{ authorId: 1 }] });
  });

  it('OR-es conditions from multiple allowed rules', () => {
    const ability = createDrizzleAbility<AppAbility>([
      { action: 'read', subject: 'Post', conditions: { authorId: 1 } },
      {
        action: 'read',
        subject: 'Post',
        conditions: { status: { in: ['published'] } },
      },
    ]);

    const query = accessibleBy(ability).ofType('Post');
    expect(query).toEqual({
      OR: [{ status: { in: ['published'] } }, { authorId: 1 }],
    });
  });

  it('wraps inverted rules in NOT', () => {
    const ability = createDrizzleAbility<AppAbility>([
      { action: 'read', subject: 'Post', conditions: { authorId: 1 } },
      {
        action: 'read',
        subject: 'Post',
        conditions: { title: { like: '[WIP]:%' } },
        inverted: true,
      },
    ]);

    const query = accessibleBy(ability).ofType('Post');
    expect(query).toEqual({
      OR: [
        {
          AND: [{ authorId: 1 }, { NOT: { title: { like: '[WIP]:%' } } }],
        },
      ],
    });
  });

  it('handles multiple inverted rules', () => {
    const ability = createDrizzleAbility<AppAbility>([
      { action: 'read', subject: 'Post', conditions: { authorId: 1 } },
      { action: 'read', subject: 'Post', conditions: { status: 'draft' } },
      {
        action: 'read',
        subject: 'Post',
        conditions: { private: true },
        inverted: true,
      },
      {
        action: 'read',
        subject: 'Post',
        conditions: { status: 'archived' },
        inverted: true,
      },
    ]);

    const query = accessibleBy(ability).ofType('Post');
    expect(query).toEqual({
      OR: [
        {
          AND: [{ status: 'draft' }, { NOT: { status: 'archived' } }, { NOT: { private: true } }],
        },
        {
          AND: [{ authorId: 1 }, { NOT: { status: 'archived' } }, { NOT: { private: true } }],
        },
      ],
    });
  });

  it('returns empty object when a rule has no conditions', () => {
    const ability = createDrizzleAbility<AppAbility>([{ action: 'read', subject: 'Post' }]);

    const query = accessibleBy(ability).ofType('Post');
    expect(query).toEqual({});
  });

  it('defaults action to "read"', () => {
    const ability = createDrizzleAbility<AppAbility>([
      {
        action: 'update',
        subject: 'Post',
        conditions: { authorId: 1 },
      },
    ]);

    const readQuery = accessibleBy(ability).ofType('Post');
    expect(readQuery).toEqual({ OR: [] });

    const updateQuery = accessibleBy(ability, 'update').ofType('Post');
    expect(updateQuery).toEqual({ OR: [{ authorId: 1 }] });
  });
});

describe('createDrizzleAbility', () => {
  it('creates an Ability instance', () => {
    const ability = createDrizzleAbility<AppAbility>([
      { action: 'read', subject: 'Post', conditions: { authorId: 1 } },
    ]);

    expect(ability).toBeDefined();
    expect(ability.can('read', 'Post')).toBe(true);
  });

  it('evaluates conditions with drizzleQuery at runtime', () => {
    const ability = createDrizzleAbility<AppAbility>([
      { action: 'read', subject: 'Post', conditions: { authorId: 1 } },
    ]);

    expect(
      ability.can('read', subject('Post', { id: 1, title: 'Test', authorId: 1, status: 'draft', private: false })),
    ).toBe(true);
    expect(
      ability.can('read', subject('Post', { id: 2, title: 'Other', authorId: 2, status: 'draft', private: false })),
    ).toBe(false);
  });

  it('evaluates complex conditions (in, like, etc.)', () => {
    const ability = createDrizzleAbility<AppAbility>([
      {
        action: 'read',
        subject: 'Post',
        conditions: { status: { in: ['published', 'draft'] } },
      },
    ]);

    expect(
      ability.can(
        'read',
        subject('Post', {
          id: 1,
          title: 'Test',
          authorId: 1,
          status: 'published',
          private: false,
        }),
      ),
    ).toBe(true);
    expect(
      ability.can(
        'read',
        subject('Post', {
          id: 2,
          title: 'Test',
          authorId: 1,
          status: 'archived',
          private: false,
        }),
      ),
    ).toBe(false);
  });

  it('handles cannot rules (inverted)', () => {
    const ability = createDrizzleAbility<AppAbility>([
      { action: 'read', subject: 'Post' },
      {
        action: 'read',
        subject: 'Post',
        conditions: { private: true },
        inverted: true,
      },
    ]);

    expect(
      ability.can(
        'read',
        subject('Post', {
          id: 1,
          title: 'Public',
          authorId: 1,
          status: 'published',
          private: false,
        }),
      ),
    ).toBe(true);
    expect(
      ability.can(
        'read',
        subject('Post', {
          id: 2,
          title: 'Secret',
          authorId: 1,
          status: 'draft',
          private: true,
        }),
      ),
    ).toBe(false);
  });

  it('works with like operator for runtime evaluation', () => {
    const ability = createDrizzleAbility<AppAbility>([
      {
        action: 'read',
        subject: 'Post',
        conditions: { title: { like: 'Hello%' } },
      },
    ]);

    expect(
      ability.can(
        'read',
        subject('Post', {
          id: 1,
          title: 'Hello World',
          authorId: 1,
          status: 'draft',
          private: false,
        }),
      ),
    ).toBe(true);
    expect(
      ability.can(
        'read',
        subject('Post', {
          id: 2,
          title: 'Goodbye',
          authorId: 1,
          status: 'draft',
          private: false,
        }),
      ),
    ).toBe(false);
  });
});
