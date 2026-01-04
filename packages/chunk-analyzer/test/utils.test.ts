import { describe, it, expect } from 'vitest';
import { formatSize } from '../src/utils/format-size.util.js';
import { extractPackageName } from '../src/utils/extract-package.util.js';

describe('formatSize', () => {
  it('formats bytes to KB', () => {
    expect(formatSize(1024)).toBe('1.0KB');
    expect(formatSize(51200)).toBe('50.0KB');
  });

  it('formats bytes to MB', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0MB');
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5MB');
  });
});

describe('extractPackageName', () => {
  it('extracts package name from node_modules path', () => {
    expect(extractPackageName('/node_modules/react/index.js')).toBe('react');
    expect(extractPackageName('/node_modules/lodash/debounce.js')).toBe('lodash');
  });

  it('extracts scoped package name', () => {
    expect(extractPackageName('/node_modules/@tanstack/react-query/index.js')).toBe('@tanstack/react-query');
    expect(extractPackageName('/node_modules/@emotion/react/dist/index.js')).toBe('@emotion/react');
  });

  it('extracts from pnpm path', () => {
    expect(extractPackageName('/node_modules/.pnpm/react@18.2.0/node_modules/react/index.js')).toBe('react');
    expect(extractPackageName('/node_modules/.pnpm/@tanstack+react-query@5.0.0/node_modules/@tanstack/react-query/index.js')).toBe('@tanstack/react-query');
  });

  it('returns null for non-node_modules path', () => {
    expect(extractPackageName('/src/components/Button.tsx')).toBeNull();
  });
});
