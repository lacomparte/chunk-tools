import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import pc from 'picocolors';

import {
  calculateSummary,
  printReport,
  printVulnerabilityReport,
  vulnerabilityToSecurityIssue,
} from '../reporter/console.js';
import { runScanners } from '../scanners/index.js';
import type { ScanReport, SecurityIssue, Severity } from '../types/index.js';
import { scanVulnerabilities } from '../vulnerability/fetcher.js';

type ScanOptions = {
  json: boolean;
  failOn: 'critical' | 'high' | 'medium' | null;
  useOsv: boolean;
  includeDevDeps: boolean;
};

const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * 지원하는 파일인지 확인
 */
const isSupportedFile = (path: string): boolean =>
  SUPPORTED_EXTENSIONS.some((ext) => path.endsWith(ext));

/**
 * 제외 패턴 매칭
 */
const matchesExcludePattern = (path: string, pattern: string): boolean => {
  if (pattern.includes('**')) {
    const regexPattern = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
    return new RegExp(regexPattern).test(path);
  }
  return path.includes(pattern);
};

/**
 * 디렉토리 재귀 탐색
 */
const walkDir = (dir: string, excludePatterns: string[]): string[] => {
  const files: string[] = [];
  const isExcluded = (path: string): boolean =>
    excludePatterns.some((p) => matchesExcludePattern(path, p));

  const walk = (currentDir: string): void => {
    try {
      for (const entry of readdirSync(currentDir)) {
        const fullPath = join(currentDir, entry);
        if (isExcluded(fullPath)) continue;

        const stat = statSync(fullPath);
        if (stat.isDirectory()) walk(fullPath);
        else if (stat.isFile() && isSupportedFile(fullPath))
          files.push(fullPath);
      }
    } catch {
      // 디렉토리 접근 실패 무시
    }
  };

  walk(dir);
  return files;
};

/**
 * JSON 리포트 출력
 */
const printJsonReport = (
  report: ScanReport,
  vulnSummary?: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  },
): void => {
  const output = {
    summary: {
      code: report.summary,
      dependencies: vulnSummary ?? null,
    },
    issues: report.issues,
    scannedFiles: report.scannedFiles,
    duration: report.duration,
  };

  console.log(JSON.stringify(output, null, 2));
};

/**
 * 빌드 실패 조건 확인
 */
const shouldFail = (
  issues: SecurityIssue[],
  failOn: ScanOptions['failOn'],
): boolean => {
  if (!failOn) return false;

  const severityOrder: Severity[] = ['critical', 'high', 'warning', 'info'];
  const failOnIndex = severityOrder.indexOf(
    failOn === 'medium' ? 'warning' : failOn,
  );

  return issues.some((issue) => {
    const issueIndex = severityOrder.indexOf(issue.severity);
    return issueIndex <= failOnIndex;
  });
};

const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  '.git',
  'coverage',
  '.next',
  '.nuxt',
  'build',
  '__tests__',
  '__mocks__',
  '*.test.*',
  '*.spec.*',
];

/**
 * 코드 파일 스캔
 */
const scanCodeFiles = (
  cwd: string,
  excludePatterns: string[],
): { files: string[]; issues: SecurityIssue[] } => {
  const files = walkDir(cwd, excludePatterns);
  const issues: SecurityIssue[] = [];

  for (const file of files) {
    try {
      const code = readFileSync(file, 'utf-8');
      const relativePath = file.replace(cwd + '/', '');
      issues.push(...runScanners(code, relativePath));
    } catch {
      // 파일 읽기 실패 무시
    }
  }

  return { files, issues };
};

/**
 * 의존성 취약점 스캔
 */
const scanDependencies = async (
  cwd: string,
  options: ScanOptions,
  issues: SecurityIssue[],
) => {
  try {
    const vulnReport = await scanVulnerabilities(cwd, {
      useOsv: options.useOsv,
      includeDevDeps: options.includeDevDeps,
    });

    for (const vuln of vulnReport.vulnerabilities) {
      issues.push(vulnerabilityToSecurityIssue(vuln));
    }
    return vulnReport;
  } catch {
    if (!options.json)
      console.warn(pc.yellow('⚠️ Failed to run dependency audit'));
    return null;
  }
};

/**
 * 스캔 시작 메시지 출력
 */
const printScanStart = (json: boolean): void => {
  if (json) return;
  console.log('');
  console.log(pc.bold(pc.cyan('🔒 Running security scan...')));
  console.log('');
};

/**
 * 스캔 결과 출력
 */
const printScanResult = (
  report: ScanReport,
  vulnReport: Awaited<ReturnType<typeof scanDependencies>>,
  options: ScanOptions,
): void => {
  if (options.json) {
    printJsonReport(report, vulnReport?.summary);
  } else {
    printReport(report);
    if (vulnReport?.vulnerabilities.length)
      printVulnerabilityReport(vulnReport);
  }
};

/**
 * scan 명령어 실행
 */
export const scanCommand = async (options: ScanOptions): Promise<void> => {
  const startTime = performance.now();
  const cwd = process.cwd();

  printScanStart(options.json);

  const { files, issues: allIssues } = scanCodeFiles(
    cwd,
    DEFAULT_EXCLUDE_PATTERNS,
  );
  const vulnReport = await scanDependencies(cwd, options, allIssues);

  const report: ScanReport = {
    issues: allIssues,
    summary: calculateSummary(allIssues),
    scannedFiles: files.length,
    duration: performance.now() - startTime,
  };

  printScanResult(report, vulnReport, options);

  if (shouldFail(allIssues, options.failOn)) {
    if (!options.json) console.error(pc.red('\n✗ Security scan failed!\n'));
    process.exit(1);
  }

  if (!options.json && allIssues.length === 0) {
    console.log(pc.green('✓ No security issues found!\n'));
  }
};
