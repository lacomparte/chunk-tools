import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect, afterEach } from 'vitest';

import {
  parseIgnoreFile,
  findIgnoreFile,
  shouldIgnorePackage,
  filterIgnoredPackages,
} from '../src/utils/ignore-file.util.js';

const TEST_IGNORE_FILE = resolve(process.cwd(), '.chunkgroupignore');

describe('parseIgnoreFile', () => {
  afterEach(() => {
    if (existsSync(TEST_IGNORE_FILE)) {
      unlinkSync(TEST_IGNORE_FILE);
    }
  });

  it('parses simple patterns', () => {
    writeFileSync(TEST_IGNORE_FILE, 'lodash\ndayjs\n');
    const patterns = parseIgnoreFile(TEST_IGNORE_FILE);
    expect(patterns).toEqual(['lodash', 'dayjs']);
  });

  it('ignores comments', () => {
    writeFileSync(
      TEST_IGNORE_FILE,
      '# This is a comment\nlodash\n# Another comment\ndayjs',
    );
    const patterns = parseIgnoreFile(TEST_IGNORE_FILE);
    expect(patterns).toEqual(['lodash', 'dayjs']);
  });

  it('ignores empty lines', () => {
    writeFileSync(TEST_IGNORE_FILE, 'lodash\n\n\ndayjs\n');
    const patterns = parseIgnoreFile(TEST_IGNORE_FILE);
    expect(patterns).toEqual(['lodash', 'dayjs']);
  });

  it('handles inline comments', () => {
    writeFileSync(
      TEST_IGNORE_FILE,
      'lodash # ignore lodash\n@sentry/* # all sentry packages',
    );
    const patterns = parseIgnoreFile(TEST_IGNORE_FILE);
    expect(patterns).toEqual(['lodash', '@sentry/*']);
  });

  it('preserves negation patterns', () => {
    writeFileSync(TEST_IGNORE_FILE, '@sentry/*\n!@sentry/react');
    const patterns = parseIgnoreFile(TEST_IGNORE_FILE);
    expect(patterns).toEqual(['@sentry/*', '!@sentry/react']);
  });

  it('returns empty array for non-existent file', () => {
    const patterns = parseIgnoreFile('/non/existent/file');
    expect(patterns).toEqual([]);
  });
});

describe('findIgnoreFile', () => {
  afterEach(() => {
    if (existsSync(TEST_IGNORE_FILE)) {
      unlinkSync(TEST_IGNORE_FILE);
    }
  });

  it('returns file path when .chunkgroupignore exists', () => {
    writeFileSync(TEST_IGNORE_FILE, 'lodash');
    const found = findIgnoreFile(process.cwd());
    expect(found).toBe(TEST_IGNORE_FILE);
  });

  it('returns null when .chunkgroupignore does not exist', () => {
    const found = findIgnoreFile(process.cwd());
    expect(found).toBeNull();
  });
});

describe('shouldIgnorePackage', () => {
  it('returns false when patterns is empty', () => {
    expect(shouldIgnorePackage('lodash', [])).toBe(false);
  });

  it('matches exact package name', () => {
    expect(shouldIgnorePackage('lodash', ['lodash'])).toBe(true);
    expect(shouldIgnorePackage('lodash', ['dayjs'])).toBe(false);
  });

  it('matches glob patterns with *', () => {
    expect(shouldIgnorePackage('lodash.debounce', ['lodash*'])).toBe(true);
    expect(shouldIgnorePackage('lodash.throttle', ['lodash*'])).toBe(true);
    expect(shouldIgnorePackage('dayjs', ['lodash*'])).toBe(false);
  });

  it('matches scoped packages with glob', () => {
    expect(shouldIgnorePackage('@sentry/react', ['@sentry/*'])).toBe(true);
    expect(shouldIgnorePackage('@sentry/browser', ['@sentry/*'])).toBe(true);
    expect(shouldIgnorePackage('@tanstack/react-query', ['@sentry/*'])).toBe(
      false,
    );
  });

  it('handles negation patterns', () => {
    const patterns = ['@sentry/*', '!@sentry/react'];

    // @sentry/* matches first, then !@sentry/react negates it
    expect(shouldIgnorePackage('@sentry/react', patterns)).toBe(false);
    // @sentry/* matches, no negation
    expect(shouldIgnorePackage('@sentry/browser', patterns)).toBe(true);
  });

  it('applies patterns in order (last match wins)', () => {
    // First exclude all lodash, then include lodash.debounce, then exclude it again
    const patterns = ['lodash*', '!lodash.debounce', 'lodash.debounce'];
    expect(shouldIgnorePackage('lodash.debounce', patterns)).toBe(true);
  });

  it('handles complex negation scenarios', () => {
    const patterns = ['@tanstack/*', '!@tanstack/react-query'];

    expect(shouldIgnorePackage('@tanstack/react-query', patterns)).toBe(false);
    expect(shouldIgnorePackage('@tanstack/query-core', patterns)).toBe(true);
    expect(shouldIgnorePackage('@tanstack/react-virtual', patterns)).toBe(true);
  });
});

describe('filterIgnoredPackages', () => {
  const packages = [
    { name: 'react', totalSize: 100 },
    { name: 'lodash', totalSize: 200 },
    { name: 'lodash.debounce', totalSize: 50 },
    { name: '@sentry/react', totalSize: 300 },
    { name: '@sentry/browser', totalSize: 400 },
  ];

  it('returns all packages when patterns is empty', () => {
    const filtered = filterIgnoredPackages(packages, []);
    expect(filtered).toHaveLength(5);
  });

  it('filters out matching packages', () => {
    const filtered = filterIgnoredPackages(packages, ['lodash*']);
    expect(filtered.map((p) => p.name)).toEqual([
      'react',
      '@sentry/react',
      '@sentry/browser',
    ]);
  });

  it('handles negation in filtering', () => {
    const filtered = filterIgnoredPackages(packages, [
      'lodash*',
      '!lodash.debounce',
    ]);
    expect(filtered.map((p) => p.name)).toEqual([
      'react',
      'lodash.debounce',
      '@sentry/react',
      '@sentry/browser',
    ]);
  });

  it('filters scoped packages', () => {
    const filtered = filterIgnoredPackages(packages, [
      '@sentry/*',
      '!@sentry/react',
    ]);
    expect(filtered.map((p) => p.name)).toEqual([
      'react',
      'lodash',
      'lodash.debounce',
      '@sentry/react',
    ]);
  });
});
