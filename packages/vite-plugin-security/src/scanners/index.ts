import type { RulesOptions, Scanner, SecurityIssue } from '../types/index.js';

import { dangerousScanner } from './dangerous.scanner.js';
import { rscLeakScanner } from './rsc-leak.scanner.js';
import { secretsScanner } from './secrets.scanner.js';

/**
 * 무시할 규칙에 해당하는지 확인
 */
const shouldIgnore = (issue: SecurityIssue, ignoreRules: string[]): boolean => {
  if (!issue.key) return false;
  return ignoreRules.includes(issue.key);
};

/**
 * 활성화된 스캐너 목록 생성
 */
const getActiveScanners = (rules: RulesOptions): Scanner[] => {
  const scanners: Scanner[] = [];
  if (rules.hardcodedSecrets !== false) scanners.push(secretsScanner);
  if (rules.rscLeaks !== false) scanners.push(rscLeakScanner);
  if (rules.dangerousPatterns !== false) scanners.push(dangerousScanner);
  return scanners;
};

/**
 * 스캐너 실행 및 이슈 수집
 */
const collectIssues = (
  scanners: Scanner[],
  code: string,
  filePath: string,
): SecurityIssue[] => {
  const issues: SecurityIssue[] = [];
  for (const scanner of scanners) {
    issues.push(...scanner.scan(code, filePath));
  }
  return issues;
};

/**
 * ignoreRules 기반 이슈 필터링
 */
const filterIgnoredIssues = (
  issues: SecurityIssue[],
  ignoreRules: string[],
): SecurityIssue[] => {
  if (ignoreRules.length === 0) return issues;
  return issues.filter((issue) => !shouldIgnore(issue, ignoreRules));
};

/**
 * 활성화된 스캐너들로 코드를 검사합니다.
 */
export const runScanners = (
  code: string,
  filePath: string,
  rules: RulesOptions = {},
): SecurityIssue[] => {
  const scanners = getActiveScanners(rules);
  const issues = collectIssues(scanners, code, filePath);
  return filterIgnoredIssues(issues, rules.ignoreRules ?? []);
};

/**
 * 스캐너 목록 내보내기
 */
export { dangerousScanner, rscLeakScanner, secretsScanner };
