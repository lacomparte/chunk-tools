import { describe, expect, it } from 'vitest';

import { runScanners } from '../src/scanners/index.js';

describe('secrets scanner', () => {
  it('should detect OpenAI API keys', () => {
    const code = `const apiKey = "sk-1234567890abcdef1234567890abcdef1234567890abcdef";`;
    const issues = runScanners(code, 'test.ts', { hardcodedSecrets: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('OpenAI API Key');
    expect(issues[0].severity).toBe('critical');
  });

  it('should detect AWS Access Keys', () => {
    const code = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;
    const issues = runScanners(code, 'test.ts', { hardcodedSecrets: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('AWS Access Key');
    expect(issues[0].severity).toBe('critical');
  });

  it('should detect Stripe keys', () => {
    const code = `const stripeKey = "pk_live_XXXXXXXXXXXXXXXXXXXXXXXX";`;
    const issues = runScanners(code, 'test.ts', { hardcodedSecrets: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('Stripe API Key');
    expect(issues[0].severity).toBe('critical');
  });

  it('should detect GitHub tokens', () => {
    const code = `const token = "ghp_1234567890abcdef1234567890abcdef1234";`;
    const issues = runScanners(code, 'test.ts', { hardcodedSecrets: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('GitHub Token');
    expect(issues[0].severity).toBe('critical');
  });

  it('should not detect secrets in test files', () => {
    const code = `const apiKey = "sk-1234567890abcdef1234567890abcdef1234567890abcdef";`;
    const issues = runScanners(code, 'test.spec.ts', {
      hardcodedSecrets: true,
    });

    expect(issues.length).toBe(0);
  });
});

describe('RSC leak scanner', () => {
  it('should detect server module imports in use client components', () => {
    const code = `'use client';
import { db } from '@/lib/db';

export function UserProfile() {
  return <div>User</div>;
}`;
    const issues = runScanners(code, 'component.tsx', { rscLeaks: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('Server-only code exposed to client');
    expect(issues[0].severity).toBe('critical');
  });

  it('should detect Prisma imports in use client components', () => {
    const code = `'use client';
import { PrismaClient } from '@prisma/client';

export function Admin() {
  return <div>Admin</div>;
}`;
    const issues = runScanners(code, 'admin.tsx', { rscLeaks: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('critical');
  });

  it('should not flag server components', () => {
    const code = `import { db } from '@/lib/db';

export function ServerComponent() {
  return <div>Server</div>;
}`;
    const issues = runScanners(code, 'server.tsx', { rscLeaks: true });

    expect(issues.length).toBe(0);
  });
});

describe('dangerous patterns scanner', () => {
  it('should detect eval usage', () => {
    const code = `const result = eval(userInput);`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('eval() Usage');
    expect(issues[0].severity).toBe('critical');
  });

  it('should detect new Function usage', () => {
    const code = `const fn = new Function('return ' + userInput);`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('new Function() Usage');
    expect(issues[0].severity).toBe('critical');
  });

  it('should detect dangerouslySetInnerHTML', () => {
    const code = `<div dangerouslySetInnerHTML={{ __html: content }} />`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('dangerouslySetInnerHTML');
    expect(issues[0].severity).toBe('warning');
  });

  it('should detect innerHTML assignment', () => {
    const code = `element.innerHTML = userContent;`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('innerHTML Assignment');
    expect(issues[0].severity).toBe('warning');
  });

  it('should detect javascript: URLs', () => {
    const code = `<a href="javascript:alert(1)">Click</a>`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('javascript: URL');
    expect(issues[0].severity).toBe('critical');
  });

  it('should not flag code in test files', () => {
    const code = `const result = eval(input);`;
    const issues = runScanners(code, '__tests__/code.test.ts', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBe(0);
  });
});

describe('sanitizer detection', () => {
  it('should not warn on dangerouslySetInnerHTML with DOMPurify.sanitize', () => {
    const code = `<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBe(0);
  });

  it('should not warn on dangerouslySetInnerHTML with sanitize()', () => {
    const code = `<div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBe(0);
  });

  it('should not warn on dangerouslySetInnerHTML with purify()', () => {
    const code = `<div dangerouslySetInnerHTML={{ __html: purify(data) }} />`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBe(0);
  });

  it('should warn on dangerouslySetInnerHTML without sanitizer', () => {
    const code = `<div dangerouslySetInnerHTML={{ __html: content }} />`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('warning');
  });

  it('should not warn on innerHTML with DOMPurify.sanitize', () => {
    const code = `element.innerHTML = DOMPurify.sanitize(content);`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBe(0);
  });

  it('should not warn on innerHTML with sanitizeHtml()', () => {
    const code = `element.innerHTML = sanitizeHtml(userInput);`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBe(0);
  });

  it('should warn on innerHTML without sanitizer', () => {
    const code = `element.innerHTML = userContent;`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('warning');
  });
});

describe('variable tracking sanitizer detection', () => {
  it('should not warn when variable is assigned from DOMPurify.sanitize', () => {
    const code = `
const a = DOMPurify.sanitize(stringHTML);
<div dangerouslySetInnerHTML={{ __html: a }} />
`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBe(0);
  });

  it('should not warn when variable is assigned from sanitize()', () => {
    const code = `
const cleaned = sanitize(userInput);
<div dangerouslySetInnerHTML={{ __html: cleaned }} />
`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBe(0);
  });

  it('should not warn when variable is assigned from purify()', () => {
    const code = `
let safe = purify(content);
<div dangerouslySetInnerHTML={{ __html: safe }} />
`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBe(0);
  });

  it('should warn when variable is NOT from sanitizer', () => {
    const code = `
const content = getUserInput();
<div dangerouslySetInnerHTML={{ __html: content }} />
`;
    const issues = runScanners(code, 'component.tsx', {
      dangerousPatterns: true,
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe('warning');
  });

  it('should not warn on innerHTML with sanitized variable', () => {
    const code = `
const safeHTML = DOMPurify.sanitize(userInput);
element.innerHTML = safeHTML;
`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBe(0);
  });

  it('should warn on innerHTML with non-sanitized variable', () => {
    const code = `
const html = fetchData();
element.innerHTML = html;
`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBeGreaterThan(0);
  });

  it('should handle reassigned sanitizer variable', () => {
    const code = `
let output;
output = sanitizeHtml(rawInput);
element.innerHTML = output;
`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBe(0);
  });
});

describe('ignoreRules functionality', () => {
  it('should ignore issues when key is in ignoreRules', () => {
    const code = `const result = eval(userInput);`;
    const issues = runScanners(code, 'code.ts', {
      dangerousPatterns: true,
      ignoreRules: ['eval'],
    });

    expect(issues.length).toBe(0);
  });

  it('should not ignore issues when key is not in ignoreRules', () => {
    const code = `const result = eval(userInput);`;
    const issues = runScanners(code, 'code.ts', {
      dangerousPatterns: true,
      ignoreRules: ['innerHTML'],
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('eval() Usage');
  });

  it('should ignore multiple rules', () => {
    const code = `
const result = eval(userInput);
element.innerHTML = content;
`;
    const issues = runScanners(code, 'code.ts', {
      dangerousPatterns: true,
      ignoreRules: ['eval', 'innerHTML'],
    });

    expect(issues.length).toBe(0);
  });

  it('should ignore RSC leak issues', () => {
    const code = `'use client';
import { db } from '@/lib/db';

export function UserProfile() {
  return <div>User</div>;
}`;
    const issues = runScanners(code, 'component.tsx', {
      rscLeaks: true,
      ignoreRules: ['rsc-lib-db'],
    });

    expect(issues.length).toBe(0);
  });

  it('should ignore secret detection issues', () => {
    // Use AWS Access Key pattern - only matches aws-access-key key
    const code = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;

    const issues = runScanners(code, 'config.ts', {
      hardcodedSecrets: true,
      ignoreRules: ['aws-access-key'],
    });

    expect(issues.length).toBe(0);
  });

  it('should include issue key in result', () => {
    const code = `const result = eval(userInput);`;
    const issues = runScanners(code, 'code.ts', { dangerousPatterns: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].key).toBe('eval');
  });

  it('should include correct key for RSC issues', () => {
    const code = `'use client';
import { PrismaClient } from '@prisma/client';

export function Admin() {
  return <div>Admin</div>;
}`;
    const issues = runScanners(code, 'admin.tsx', { rscLeaks: true });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].key).toBe('rsc-prisma-client');
  });
});
