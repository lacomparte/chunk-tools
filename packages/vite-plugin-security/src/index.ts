import type { Plugin, ViteDevServer } from 'vite';

import type { OverlayData } from './client/overlay.js';
import { OVERLAY_CLIENT_SCRIPT } from './client/overlay.js';
import {
  calculateSummary,
  printReport,
  printSingleIssue,
  printVulnerabilityReport,
  vulnerabilityToSecurityIssue,
} from './reporter/console.js';
import { runScanners } from './scanners/index.js';
import type {
  RulesOptions,
  ScanReport,
  SecurityIssue,
  SecurityScannerOptions,
  Severity,
  VulnerabilityReport,
} from './types/index.js';
import { loadIgnoreRules } from './utils/ignore-file.util.js';
import { scanVulnerabilities } from './vulnerability/fetcher.js';

export type { SecurityScannerOptions, SecurityIssue, ScanReport, Severity };

/**
 * 기본 옵션
 */
const DEFAULT_OPTIONS: SecurityScannerOptions = {
  mode: 'dry-run',
  rules: {
    hardcodedSecrets: true,
    rscLeaks: true,
    dangerousPatterns: true,
    dependencyAudit: 'never',
  },
  failOn: false,
  overlay: {
    enabled: true,
    showOn: 'critical',
    position: 'top',
    autoHide: false,
  },
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/coverage/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
    '**/__mocks__/**',
  ],
};

/**
 * glob 패턴을 RegExp로 변환
 */
const globToRegex = (pattern: string): RegExp => {
  const regexPattern = pattern
    .replace(/\*\*/g, '<<GLOBSTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<GLOBSTAR>>/g, '.*');
  return new RegExp(regexPattern);
};

/**
 * 파일이 제외 패턴에 매칭되는지 확인
 */
const isExcluded = (filePath: string, patterns: string[]): boolean =>
  patterns.some((pattern) => globToRegex(pattern).test(filePath));

/**
 * showOn 옵션을 Severity로 변환
 */
const showOnToSeverity = (showOn: 'critical' | 'high' | 'all'): Severity => {
  if (showOn === 'all') return 'info';
  return showOn;
};

/** 심각도 순서 (높을수록 심각) */
const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'warning', 'info'];

/**
 * 빌드 실패 조건 확인
 */
const shouldFailBuild = (
  issues: SecurityIssue[],
  failOn: SecurityScannerOptions['failOn'],
): boolean => {
  if (!failOn) return false;

  const failOnIndex = SEVERITY_ORDER.indexOf(
    failOn === 'medium' ? 'warning' : failOn,
  );

  return issues.some((issue) => {
    const issueIndex = SEVERITY_ORDER.indexOf(issue.severity);
    return issueIndex <= failOnIndex;
  });
};

/**
 * 사용자 옵션과 기본 옵션 병합
 */
const mergeOptions = (
  userOptions: SecurityScannerOptions,
  fileIgnoreRules: string[],
): SecurityScannerOptions => {
  const mergedIgnoreRules = [
    ...(userOptions.ignoreRules ?? []),
    ...fileIgnoreRules,
  ];

  return {
    ...DEFAULT_OPTIONS,
    ...userOptions,
    rules: {
      ...DEFAULT_OPTIONS.rules,
      ...userOptions.rules,
      ignoreRules: mergedIgnoreRules,
    } as RulesOptions,
    overlay: { ...DEFAULT_OPTIONS.overlay, ...userOptions.overlay },
    exclude: [
      ...(DEFAULT_OPTIONS.exclude ?? []),
      ...(userOptions.exclude ?? []),
    ],
  };
};

/**
 * 지원하는 파일 확장자인지 확인
 */
const SUPPORTED_EXT = ['.ts', '.tsx', '.js', '.jsx'];

const isSupportedFile = (id: string): boolean =>
  SUPPORTED_EXT.some((ext) => id.endsWith(ext));

/**
 * 스캔 대상 파일인지 확인
 */
const shouldScanFile = (id: string, excludePatterns: string[]): boolean => {
  if (id.includes('node_modules') || id.startsWith('\0')) return false;
  if (isExcluded(id, excludePatterns)) return false;
  if (!isSupportedFile(id)) return false;
  return true;
};

/**
 * SecurityIssue를 OverlayData로 변환
 */
const issueToOverlayData = (issue: SecurityIssue): OverlayData => ({
  title: issue.title,
  severity: issue.severity,
  description: issue.description,
  filePath: issue.filePath,
  line: issue.line,
  column: issue.column,
  code: issue.code,
});

/**
 * 의존성 취약점 검사 실행
 */
const runDependencyAudit = async (
  options: SecurityScannerOptions,
): Promise<VulnerabilityReport | null> => {
  const shouldRunAudit =
    options.rules?.dependencyAudit === 'always' ||
    (options.rules?.dependencyAudit === 'ci' && process.env.CI);

  if (!shouldRunAudit) return null;

  try {
    return await scanVulnerabilities(process.cwd(), {
      useOsv: options.mode === 'full',
      includeDevDeps: false,
    });
  } catch (error) {
    console.warn(
      '\n⚠️ Failed to run dependency audit:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return null;
  }
};

type ScannerContext = {
  options: SecurityScannerOptions;
  scannedFiles: Set<string>;
  allIssues: SecurityIssue[];
  server: ViteDevServer | null;
};

/**
 * WebSocket으로 이슈 전송
 */
const sendIssueToOverlay = (
  server: ViteDevServer,
  issue: SecurityIssue,
): void => {
  const data = issueToOverlayData(issue);
  server.ws.send({
    type: 'custom',
    event: 'vite-security:issue',
    data,
  });
};

/**
 * 심각도 기준 필터링 (콘솔 출력용)
 */
const shouldReportIssue = (
  issue: SecurityIssue,
  showOn: 'critical' | 'high' | 'all' = 'critical',
): boolean => {
  const showOnSeverity = showOnToSeverity(showOn);
  const showOnIndex = SEVERITY_ORDER.indexOf(showOnSeverity);
  const issueIndex = SEVERITY_ORDER.indexOf(issue.severity);
  return issueIndex <= showOnIndex;
};

/**
 * incremental 모드에서 이슈 처리
 */
const handleIncrementalIssue = (
  issues: SecurityIssue[],
  scannerCtx: ScannerContext,
): void => {
  const showOn = scannerCtx.options.overlay?.showOn ?? 'critical';
  const reportableIssues = issues.filter((i) => shouldReportIssue(i, showOn));

  if (reportableIssues.length === 0) return;

  // 모든 이슈를 콘솔에 출력
  for (const issue of reportableIssues) {
    printSingleIssue(issue);
  }

  // 오버레이는 enabled일 때만 - 모든 이슈 전송
  if (scannerCtx.server && scannerCtx.options.overlay?.enabled) {
    for (const issue of reportableIssues) {
      sendIssueToOverlay(scannerCtx.server, issue);
    }
  }
};

/**
 * 리포트 생성
 */
const createReport = (ctx: ScannerContext, duration: number): ScanReport => ({
  issues: ctx.allIssues,
  summary: calculateSummary(ctx.allIssues),
  scannedFiles: ctx.scannedFiles.size,
  duration,
});

/**
 * 리포트 출력
 */
const printReports = (
  report: ScanReport,
  vulnReport: VulnerabilityReport | null,
  mode: string,
): void => {
  if (mode === 'incremental') return;
  printReport(report);
  if (vulnReport?.vulnerabilities.length) printVulnerabilityReport(vulnReport);
};

/**
 * 빌드 완료 후 리포트 생성 및 출력
 */
const generateAndPrintReport = async (
  ctx: ScannerContext,
  duration: number,
): Promise<void> => {
  const vulnReport = await runDependencyAudit(ctx.options);
  if (vulnReport) {
    ctx.allIssues.push(
      ...vulnReport.vulnerabilities.map(vulnerabilityToSecurityIssue),
    );
  }

  const report = createReport(ctx, duration);
  printReports(report, vulnReport, ctx.options.mode ?? 'dry-run');

  if (shouldFailBuild(ctx.allIssues, ctx.options.failOn)) {
    console.error('\n🔒 Build failed due to security issues.\n');
    process.exit(1);
  }
};

/**
 * ScannerContext 초기화
 */
const createScannerContext = (
  userOptions: SecurityScannerOptions,
): ScannerContext => ({
  options: mergeOptions(userOptions, loadIgnoreRules()),
  scannedFiles: new Set<string>(),
  allIssues: [],
  server: null,
});

/**
 * transform 훅 로직
 */
const transformFile = (code: string, id: string, ctx: ScannerContext): null => {
  if (!shouldScanFile(id, ctx.options.exclude ?? [])) return null;
  ctx.scannedFiles.add(id);
  const issues = runScanners(code, id, ctx.options.rules);
  if (issues.length > 0) {
    ctx.allIssues.push(...issues);
    if (ctx.options.mode === 'incremental') handleIncrementalIssue(issues, ctx);
  }
  return null;
};

/**
 * 플러그인 상태 초기화
 */
const createBuildStartHandler =
  (ctx: ScannerContext, setStartTime: (t: number) => void) => () => {
    setStartTime(performance.now());
    ctx.scannedFiles.clear();
    ctx.allIssues.length = 0;
  };

/**
 * HTML 변환 핸들러 (오버레이 스크립트 삽입)
 */
const createTransformIndexHtmlHandler =
  (ctx: ScannerContext) =>
  (html: string): string => {
    if (!ctx.options.overlay?.enabled || ctx.options.mode !== 'incremental') {
      return html;
    }
    return injectOverlayScript(html);
  };

/**
 * WebSocket 연결 시 캐시된 이슈 전송
 */
const setupWebSocketHandler = (ctx: ScannerContext): void => {
  if (!ctx.server || !ctx.options.overlay?.enabled) return;

  ctx.server.ws.on('connection', () => {
    // 연결 후 약간의 딜레이를 주어 클라이언트가 준비될 시간 확보
    setTimeout(() => {
      const showOn = ctx.options.overlay?.showOn ?? 'critical';
      const reportableIssues = ctx.allIssues.filter((i) =>
        shouldReportIssue(i, showOn),
      );
      for (const issue of reportableIssues) {
        sendIssueToOverlay(ctx.server!, issue);
      }
    }, 100);
  });
};

/**
 * Vite 보안 스캐너 플러그인
 */
export const securityScanner = (
  userOptions: SecurityScannerOptions = {},
): Plugin => {
  const ctx = createScannerContext(userOptions);
  let startTime = 0;
  const setStartTime = (t: number) => {
    startTime = t;
  };

  return {
    name: 'vite-plugin-security',
    enforce: 'pre', // 다른 플러그인보다 먼저 실행
    buildStart: createBuildStartHandler(ctx, setStartTime),
    configureServer(s) {
      ctx.server = s;
      setupWebSocketHandler(ctx);
    },
    transformIndexHtml: createTransformIndexHtmlHandler(ctx),
    transform(code, id) {
      return transformFile(code, id, ctx);
    },
    async closeBundle() {
      await generateAndPrintReport(ctx, performance.now() - startTime);
    },
  };
};

/**
 * HTML head에 오버레이 스크립트 삽입 (Vite 클라이언트보다 먼저 로드되어야 함)
 */
const injectOverlayScript = (html: string): string => {
  // </head> 앞에 삽입하여 Vite 클라이언트보다 먼저 WebSocket을 패치
  if (html.includes('</head>')) {
    return html.replace(
      '</head>',
      `<script>${OVERLAY_CLIENT_SCRIPT}</script></head>`,
    );
  }
  // </head>가 없으면 </body> 앞에 삽입 (fallback)
  if (html.includes('</body>')) {
    return html.replace(
      '</body>',
      `<script>${OVERLAY_CLIENT_SCRIPT}</script></body>`,
    );
  }
  return html;
};

// 기본 내보내기
export default securityScanner;
