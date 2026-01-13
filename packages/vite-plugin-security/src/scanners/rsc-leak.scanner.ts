import type { Scanner, SecurityIssue } from '../types/index.js';

/**
 * 서버 전용 모듈 정의
 */
type ServerOnlyModule = {
  /** ignore 옵션에서 사용할 고유 식별자 */
  key: string;
  /** 표시 이름 */
  name: string;
  /** 매칭 패턴 */
  pattern: RegExp;
};

/**
 * 서버 전용으로 간주되는 모듈 패턴들
 * 이러한 모듈이 'use client' 컴포넌트에서 import되면 보안 문제
 */
const SERVER_ONLY_MODULES: ServerOnlyModule[] = [
  // ORM / Database
  { key: 'rsc-prisma', pattern: /from\s+['"]prisma['"]/, name: 'Prisma' },
  {
    key: 'rsc-prisma-client',
    pattern: /from\s+['"]@prisma\/client['"]/,
    name: '@prisma/client',
  },
  {
    key: 'rsc-drizzle',
    pattern: /from\s+['"]drizzle-orm['"]/,
    name: 'drizzle-orm',
  },
  { key: 'rsc-typeorm', pattern: /from\s+['"]typeorm['"]/, name: 'typeorm' },
  {
    key: 'rsc-sequelize',
    pattern: /from\s+['"]sequelize['"]/,
    name: 'sequelize',
  },
  { key: 'rsc-mongoose', pattern: /from\s+['"]mongoose['"]/, name: 'mongoose' },
  { key: 'rsc-knex', pattern: /from\s+['"]knex['"]/, name: 'knex' },

  // Database drivers
  { key: 'rsc-pg', pattern: /from\s+['"]pg['"]/, name: 'pg (PostgreSQL)' },
  { key: 'rsc-mysql', pattern: /from\s+['"]mysql2?['"]/, name: 'mysql' },
  { key: 'rsc-mongodb', pattern: /from\s+['"]mongodb['"]/, name: 'mongodb' },
  { key: 'rsc-redis', pattern: /from\s+['"]redis['"]/, name: 'redis' },
  { key: 'rsc-ioredis', pattern: /from\s+['"]ioredis['"]/, name: 'ioredis' },

  // File system
  { key: 'rsc-fs', pattern: /from\s+['"]fs['"]/, name: 'fs' },
  { key: 'rsc-node-fs', pattern: /from\s+['"]node:fs['"]/, name: 'node:fs' },
  {
    key: 'rsc-fs-promises',
    pattern: /from\s+['"]fs\/promises['"]/,
    name: 'fs/promises',
  },
  {
    key: 'rsc-node-fs-promises',
    pattern: /from\s+['"]node:fs\/promises['"]/,
    name: 'node:fs/promises',
  },

  // Server utilities
  { key: 'rsc-bcrypt', pattern: /from\s+['"]bcrypt['"]/, name: 'bcrypt' },
  { key: 'rsc-bcryptjs', pattern: /from\s+['"]bcryptjs['"]/, name: 'bcryptjs' },
  {
    key: 'rsc-jsonwebtoken',
    pattern: /from\s+['"]jsonwebtoken['"]/,
    name: 'jsonwebtoken',
  },
  { key: 'rsc-crypto', pattern: /from\s+['"]crypto['"]/, name: 'crypto' },
  {
    key: 'rsc-node-crypto',
    pattern: /from\s+['"]node:crypto['"]/,
    name: 'node:crypto',
  },

  // Custom server modules (common patterns)
  { key: 'rsc-lib-db', pattern: /from\s+['"]@\/lib\/db['"]/, name: '@/lib/db' },
  {
    key: 'rsc-server-import',
    pattern: /from\s+['"]@\/server['"]/,
    name: '@/server',
  },
  {
    key: 'rsc-server-module',
    pattern: /from\s+['"]\.\.?\/.*server['"]/,
    name: 'server module',
  },
  {
    key: 'rsc-dot-server',
    pattern: /from\s+['"]\.\.?\/.*\.server['"]/,
    name: '.server module',
  },
];

/**
 * 'use client' 디렉티브가 있는지 확인
 */
const hasUseClientDirective = (code: string): boolean => {
  // 파일 시작 부분에서 'use client' 확인
  const lines = code.split('\n').slice(0, 10);
  return lines.some((line) => {
    const trimmed = line.trim();
    return (
      trimmed === "'use client'" ||
      trimmed === '"use client"' ||
      trimmed === "'use client';" ||
      trimmed === '"use client";'
    );
  });
};

/**
 * 'server-only' 패키지를 import하는지 확인
 * 이 패키지를 import하면 서버 전용임을 명시적으로 표시한 것
 */
const hasServerOnlyImport = (code: string): boolean =>
  /import\s+['"]server-only['"]/.test(code);

/**
 * 코드에서 라인 번호와 컬럼을 계산합니다.
 */
const getLocation = (
  code: string,
  index: number,
): { line: number; column: number } => {
  const lines = code.substring(0, index).split('\n');
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  };
};

/**
 * 해당 라인의 코드를 추출합니다.
 */
const getCodeSnippet = (code: string, line: number): string => {
  const lines = code.split('\n');
  const targetLine = lines[line - 1];
  if (!targetLine) return '';

  if (targetLine.length > 80) {
    return targetLine.substring(0, 77) + '...';
  }
  return targetLine.trim();
};

const SUPPORTED_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'];

/**
 * 지원 파일인지 확인
 */
const isSupportedFile = (filePath: string): boolean =>
  SUPPORTED_EXTENSIONS.some((ext) => filePath.endsWith(ext));

/**
 * 스캔 대상인지 확인 (early return 조건)
 */
const shouldSkipScan = (code: string, filePath: string): boolean => {
  if (!isSupportedFile(filePath)) return true;
  if (!hasUseClientDirective(code)) return true;
  if (hasServerOnlyImport(code)) return true;
  return false;
};

/**
 * 서버 모듈 import에 대한 이슈 생성
 */
const createServerModuleIssue = (
  serverModule: ServerOnlyModule,
  code: string,
  filePath: string,
  matchIndex: number,
): SecurityIssue => {
  const { line, column } = getLocation(code, matchIndex);
  return {
    key: serverModule.key,
    title: 'Server-only code exposed to client',
    description: `'use client' 컴포넌트에서 서버 전용 모듈 "${serverModule.name}"을(를) import하고 있습니다. 이 코드는 클라이언트 번들에 포함되어 보안 문제를 일으킬 수 있습니다.`,
    severity: 'critical',
    filePath,
    line,
    column,
    code: getCodeSnippet(code, line),
    fix: `서버 액션(Server Actions)이나 API 라우트를 통해 데이터를 가져오세요. 또는 'use client' 디렉티브를 제거하고 서버 컴포넌트로 변경하세요.`,
    ref: 'https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns',
    scanner: 'rsc-leak',
  };
};

/**
 * 서버 모듈 import 스캔
 */
const scanServerModuleImports = (
  code: string,
  filePath: string,
): SecurityIssue[] => {
  const issues: SecurityIssue[] = [];
  for (const serverModule of SERVER_ONLY_MODULES) {
    const matches = code.matchAll(new RegExp(serverModule.pattern, 'g'));
    for (const match of matches) {
      issues.push(
        createServerModuleIssue(serverModule, code, filePath, match.index ?? 0),
      );
    }
  }
  return issues;
};

/**
 * RSC 누출 스캐너
 *
 * 'use client' 컴포넌트에서 서버 전용 모듈을 import하는 경우를 탐지합니다.
 * 이런 코드는 서버 코드가 클라이언트 번들에 포함되어 보안 문제를 일으킬 수 있습니다.
 */
export const rscLeakScanner: Scanner = {
  name: 'rsc-leak',
  scan: (code: string, filePath: string): SecurityIssue[] => {
    if (shouldSkipScan(code, filePath)) return [];
    return scanServerModuleImports(code, filePath);
  },
};
