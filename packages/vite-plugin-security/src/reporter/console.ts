import { createColors } from 'picocolors';

// TTY가 아닌 환경에서도 컬러 강제 활성화 (Vite dev 서버 등)
const pc = createColors(true);

import type {
  ScanReport,
  ScanSummary,
  SecurityIssue,
  Severity,
  Vulnerability,
  VulnerabilityReport,
} from '../types/index.js';

/**
 * 심각도별 아이콘과 색상
 */
const SEVERITY_STYLES: Record<
  Severity,
  { icon: string; color: (s: string) => string; label: string }
> = {
  critical: { icon: '✗', color: pc.red, label: 'CRITICAL' },
  high: { icon: '⚠', color: pc.yellow, label: 'HIGH' },
  warning: { icon: '⚠', color: pc.yellow, label: 'WARNING' },
  info: { icon: 'ℹ', color: pc.blue, label: 'INFO' },
};

/**
 * 요약 정보를 문자열로 생성
 */
const createSummaryLine = (summary: ScanSummary): string => {
  const parts: string[] = [];

  if (summary.critical > 0) {
    parts.push(pc.red(`✗ CRITICAL: ${summary.critical}`));
  }
  if (summary.high > 0) {
    parts.push(pc.yellow(`⚠ HIGH: ${summary.high}`));
  }
  if (summary.warning > 0) {
    parts.push(pc.yellow(`⚠ WARNING: ${summary.warning}`));
  }
  if (summary.info > 0) {
    parts.push(pc.blue(`ℹ INFO: ${summary.info}`));
  }

  return parts.join('  ');
};

/**
 * 이슈 헤더 포맷팅 (제목, 위치, 코드)
 */
const formatIssueHeader = (issue: SecurityIssue): string[] => {
  const style = SEVERITY_STYLES[issue.severity];
  const lines: string[] = [];

  lines.push(
    `${style.color(`${style.icon} [${style.label}]`)} ${pc.bold(issue.title)}`,
  );
  lines.push(
    `  ${pc.dim('Location:')} ${issue.filePath}:${issue.line}:${issue.column}`,
  );
  if (issue.code) lines.push(`  ${pc.dim('Code:')}     ${pc.cyan(issue.code)}`);

  return lines;
};

/**
 * 이슈 상세 포맷팅 (설명, 수정방법, 참고링크)
 */
const formatIssueDetails = (issue: SecurityIssue): string[] => {
  const lines: string[] = ['', `  ${pc.dim('Why:')}      ${issue.description}`];

  if (issue.fix)
    lines.push('', `  ${pc.dim('Fix:')}      ${pc.green(issue.fix)}`);
  if (issue.ref)
    lines.push(
      '',
      `  ${pc.dim('Ref:')}      ${pc.underline(pc.blue(issue.ref))}`,
    );

  return lines;
};

/**
 * 이슈 하나를 포맷팅
 */
const formatIssue = (issue: SecurityIssue): string =>
  [...formatIssueHeader(issue), ...formatIssueDetails(issue)].join('\n');

const HEADER_LINE = '─'.repeat(65);
const BOX_WIDTH = 65;

/**
 * 박스 헤더 출력
 */
const printBoxHeader = (title: string, summaryLine: string): void => {
  console.log('');
  console.log(pc.bold('┌' + '─'.repeat(BOX_WIDTH) + '┐'));
  console.log(pc.bold('│ ' + title.padEnd(BOX_WIDTH - 2) + '│'));
  console.log(pc.bold('├' + '─'.repeat(BOX_WIDTH) + '┤'));
  console.log(pc.bold(`│ ${summaryLine.padEnd(BOX_WIDTH - 2)} │`));
  console.log(pc.bold('└' + '─'.repeat(BOX_WIDTH) + '┘'));
};

/**
 * 이슈 섹션 출력
 */
const printIssueSection = (title: string, issues: SecurityIssue[]): void => {
  if (issues.length === 0) return;

  console.log('');
  console.log(pc.bold(`${title}:`));
  console.log(pc.dim(HEADER_LINE));
  console.log('');

  for (const issue of issues) {
    console.log(formatIssue(issue));
    console.log('');
  }
};

/**
 * 리포트 요약 출력
 */
const printReportSummary = (
  summary: ScanSummary,
  scannedFiles: number,
  duration: number,
): void => {
  console.log(pc.bold('Summary:'));
  console.log(pc.dim(HEADER_LINE));
  console.log(
    `  Code Issues:        ${pc.red(`${summary.critical} critical`)}, ${pc.yellow(`${summary.high} high`)}, ${summary.warning} warnings`,
  );
  console.log(
    pc.dim(`  Scanned ${scannedFiles} files in ${duration.toFixed(0)}ms`),
  );
  console.log('');

  if (summary.critical > 0) {
    console.log(pc.red('  ✗ Build failed due to critical security issues.'));
  } else if (summary.high > 0) {
    console.log(
      pc.yellow('  ⚠ High severity issues found. Consider fixing them.'),
    );
  }
  console.log('');
};

/**
 * 전체 리포트를 콘솔에 출력
 */
export const printReport = (report: ScanReport): void => {
  const { issues, summary, scannedFiles, duration } = report;

  if (summary.total === 0) {
    console.log('');
    console.log(pc.green('✓ No security issues found!'));
    console.log(
      pc.dim(`  Scanned ${scannedFiles} files in ${duration.toFixed(0)}ms`),
    );
    console.log('');
    return;
  }

  printBoxHeader('🔒 Security Scan Report', createSummaryLine(summary));
  printIssueSection(
    'Code Issues',
    issues.filter((i) => i.scanner !== 'dependency'),
  );
  printIssueSection(
    'Dependency Vulnerabilities',
    issues.filter((i) => i.scanner === 'dependency'),
  );
  printReportSummary(summary, scannedFiles, duration);
};

const BOX_SINGLE_WIDTH = 70;

/** 박스 라인 생성 헬퍼 */
const boxLine = (
  color: (s: string) => string,
  content: string,
  width = BOX_SINGLE_WIDTH,
): string => color('║') + content.padEnd(width).slice(0, width) + color('║');

/** 박스 헤더 출력 */
const printIssueBoxHeader = (
  style: (typeof SEVERITY_STYLES)['critical'],
  issue: SecurityIssue,
): void => {
  const border = '═'.repeat(BOX_SINGLE_WIDTH);
  const emptyLine = '║' + ' '.repeat(BOX_SINGLE_WIDTH) + '║';
  console.log('');
  console.log(style.color('╔' + border + '╗'));
  console.log(style.color(emptyLine));
  console.log(
    boxLine(style.color, pc.bold(` 🔒 SECURITY ISSUE DETECTED `.padStart(40))),
  );
  console.log(
    boxLine(style.color, pc.bold(`    [${style.label}] ${issue.title}`)),
  );
  console.log(style.color(emptyLine));
  console.log(style.color('╠' + border + '╣'));
};

/** 박스 바디 출력 */
const printIssueBoxBody = (
  style: (typeof SEVERITY_STYLES)['critical'],
  issue: SecurityIssue,
): void => {
  console.log(
    boxLine(
      style.color,
      `  File: ${issue.filePath}:${issue.line}:${issue.column}`,
    ),
  );
  if (issue.code)
    console.log(
      boxLine(
        style.color,
        `  Code: ${pc.cyan(issue.code)}`,
        BOX_SINGLE_WIDTH + 10,
      ),
    );
  console.log(boxLine(style.color, `  Why:  ${issue.description}`));
  if (issue.fix)
    console.log(
      boxLine(
        style.color,
        `  Fix:  ${pc.green(issue.fix)}`,
        BOX_SINGLE_WIDTH + 10,
      ),
    );
};

/** 박스 푸터 출력 */
const printIssueBoxFooter = (
  style: (typeof SEVERITY_STYLES)['critical'],
): void => {
  const border = '═'.repeat(BOX_SINGLE_WIDTH);
  console.log(style.color('║' + ' '.repeat(BOX_SINGLE_WIDTH) + '║'));
  console.log(style.color('╚' + border + '╝'));
  console.log('');
};

/**
 * 단일 이슈를 콘솔에 출력 (HMR 모드용) - 눈에 띄는 박스 스타일
 */
export const printSingleIssue = (issue: SecurityIssue): void => {
  const style = SEVERITY_STYLES[issue.severity];
  printIssueBoxHeader(style, issue);
  printIssueBoxBody(style, issue);
  printIssueBoxFooter(style);
};

/**
 * 요약 정보 계산
 */
export const calculateSummary = (issues: SecurityIssue[]): ScanSummary => {
  const summary: ScanSummary = {
    critical: 0,
    high: 0,
    warning: 0,
    info: 0,
    total: issues.length,
  };

  for (const issue of issues) {
    summary[issue.severity]++;
  }

  return summary;
};

// ============================================
// 의존성 취약점 리포트
// ============================================

/**
 * 취약점 헤더 포맷팅
 */
const formatVulnHeader = (vuln: Vulnerability): string[] => {
  const style = SEVERITY_STYLES[vuln.severity];
  return [
    `${style.color(`${style.icon} [${style.label}]`)} ${pc.bold(vuln.packageName)}`,
    `  ${pc.dim('CVE/ID:')}   ${vuln.id}`,
    `  ${pc.dim('Title:')}    ${vuln.title}`,
    `  ${pc.dim('Range:')}    ${vuln.vulnerableRange}`,
  ];
};

/**
 * 취약점 수정 방법 포맷팅
 */
const formatVulnFix = (vuln: Vulnerability): string => {
  if (vuln.fixAvailable && vuln.fixedVersion) {
    return pc.green(`Upgrade to ${vuln.packageName}@${vuln.fixedVersion}`);
  }
  if (vuln.fixAvailable) {
    return pc.green('Update available via npm/pnpm audit fix');
  }
  return pc.yellow('No fix available yet');
};

/**
 * 단일 취약점 포맷팅
 */
const formatVulnerability = (vuln: Vulnerability): string => {
  const lines = formatVulnHeader(vuln);

  if (vuln.description && vuln.description !== vuln.title) {
    const shortDesc =
      vuln.description.length > 100
        ? vuln.description.substring(0, 97) + '...'
        : vuln.description;
    lines.push('', `  ${pc.dim('Why:')}      ${shortDesc}`);
  }

  lines.push('', `  ${pc.dim('Fix:')}      ${formatVulnFix(vuln)}`);

  if (vuln.references.length > 0) {
    lines.push(
      '',
      `  ${pc.dim('Ref:')}      ${pc.underline(pc.blue(vuln.references[0]))}`,
    );
  }

  return lines.join('\n');
};

/**
 * 취약점 요약 라인 생성
 */
const createVulnSummaryLine = (
  summary: VulnerabilityReport['summary'],
): string => {
  const parts: string[] = [];
  if (summary.critical > 0)
    parts.push(pc.red(`✗ ${summary.critical} critical`));
  if (summary.high > 0) parts.push(pc.yellow(`⚠ ${summary.high} high`));
  if (summary.moderate > 0)
    parts.push(pc.yellow(`${summary.moderate} moderate`));
  if (summary.low > 0) parts.push(pc.dim(`${summary.low} low`));
  return parts.join('  ');
};

/**
 * 취약점 목록 출력
 */
const printVulnList = (vulnerabilities: Vulnerability[]): void => {
  const severityOrder: Severity[] = ['critical', 'high', 'warning', 'info'];
  const sorted = [...vulnerabilities].sort(
    (a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity),
  );

  console.log('');
  console.log(pc.bold('Vulnerabilities:'));
  console.log(pc.dim(HEADER_LINE));
  console.log('');

  for (const vuln of sorted) {
    console.log(formatVulnerability(vuln));
    console.log('');
  }
};

/**
 * 권장 조치 출력
 */
const printRecommendedActions = (): void => {
  console.log(pc.bold('Recommended Actions:'));
  console.log(pc.dim(HEADER_LINE));
  console.log(
    `  ${pc.cyan('1.')} Run ${pc.green('npm audit fix')} or ${pc.green('pnpm audit --fix')}`,
  );
  console.log(
    `  ${pc.cyan('2.')} Review and manually update packages without auto-fix`,
  );
  console.log(
    `  ${pc.cyan('3.')} Consider alternatives for packages with no fix available`,
  );
  console.log('');
};

/**
 * 취약점 리포트 출력
 */
export const printVulnerabilityReport = (report: VulnerabilityReport): void => {
  const { vulnerabilities, summary, scannedPackages } = report;

  if (summary.total === 0) {
    console.log('');
    console.log(pc.green('✓ No dependency vulnerabilities found!'));
    console.log(pc.dim(`  Scanned ${scannedPackages} packages`));
    console.log('');
    return;
  }

  printBoxHeader(
    '📦 Dependency Vulnerability Report',
    createVulnSummaryLine(summary),
  );
  printVulnList(vulnerabilities);

  console.log(pc.bold('Summary:'));
  console.log(pc.dim(HEADER_LINE));
  console.log(`  Packages scanned:   ${scannedPackages}`);
  console.log(`  Vulnerabilities:    ${summary.total}`);
  console.log('');

  if (summary.critical > 0 || summary.high > 0) {
    printRecommendedActions();
  }
};

/**
 * 취약점 수정 방법 텍스트 생성
 */
const getVulnFixText = (vuln: Vulnerability): string => {
  if (vuln.fixAvailable && vuln.fixedVersion) {
    return `Upgrade to ${vuln.packageName}@${vuln.fixedVersion}`;
  }
  return vuln.fixAvailable ? 'Run npm/pnpm audit fix' : 'No fix available';
};

/**
 * 취약점을 SecurityIssue로 변환 (통합 리포트용)
 */
export const vulnerabilityToSecurityIssue = (
  vuln: Vulnerability,
): SecurityIssue => ({
  title: `${vuln.packageName}: ${vuln.title}`,
  description: vuln.description || vuln.title,
  severity: vuln.severity,
  filePath: 'package.json',
  line: 1,
  column: 1,
  code: `"${vuln.packageName}": "${vuln.vulnerableRange}"`,
  fix: getVulnFixText(vuln),
  ref: vuln.references[0],
  scanner: 'dependency',
});
