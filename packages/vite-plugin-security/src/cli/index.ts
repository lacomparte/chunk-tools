#!/usr/bin/env node
import pc from 'picocolors';

import { initCommand } from './init.command.js';
import { scanCommand } from './scan.command.js';
import { SUPPORTED_TIMEZONES } from './utils/timezone.js';

const VERSION = '0.1.0';

/**
 * 헤더 섹션 생성
 */
const createHeader = () =>
  `${pc.bold(pc.cyan('vite-plugin-security'))} v${VERSION}\n${pc.dim('Build-time security scanner for Vite projects')}`;

/**
 * 명령어 섹션 생성
 */
const createCommandsSection = () => `${pc.bold('Commands:')}
  ${pc.green('scan')}        Run security scan on the current project
  ${pc.green('init')}        Initialize GitHub Action workflow for scheduled scans
  ${pc.green('help')}        Show this help message
  ${pc.green('version')}     Show version number`;

/**
 * 옵션 섹션 생성
 */
const createOptionsSection = () => `${pc.bold('Scan Options:')}
  ${pc.cyan('--json')}       Output results as JSON
  ${pc.cyan('--fail-on')}    Fail on severity level (critical, high, medium)
  ${pc.cyan('--no-osv')}     Skip OSV API queries
  ${pc.cyan('--include-dev')} Include devDependencies in audit

${pc.bold('Init Options:')}
  ${pc.cyan('--timezone')}   IANA timezone (e.g., Asia/Seoul, America/New_York)
  ${pc.cyan('--time')}       Time in HH:mm format (default: 04:00)
  ${pc.cyan('--slack')}      Enable Slack notifications (requires SLACK_WEBHOOK_URL secret)
  ${pc.cyan('--force')}      Overwrite existing workflow file`;

/**
 * 예제 섹션 생성
 */
const createExamplesSection = () => `${pc.bold('Examples:')}
  ${pc.dim('# Run security scan')}
  npx vite-plugin-security scan

  ${pc.dim('# Run scan and fail on critical issues (CI)')}
  npx vite-plugin-security scan --fail-on critical

  ${pc.dim('# Output as JSON for CI integration')}
  npx vite-plugin-security scan --json > security-report.json

  ${pc.dim('# Initialize scheduled scan (Seoul time, 4 AM)')}
  npx vite-plugin-security init --timezone Asia/Seoul

  ${pc.dim('# Initialize with custom time and Slack')}
  npx vite-plugin-security init --timezone Asia/Seoul --time 09:30 --slack`;

/**
 * 도움말 출력
 */
const printHelp = (): void => {
  const sections = [
    createHeader(),
    `\n${pc.bold('Usage:')}\n  vite-plugin-security <command> [options]\n`,
    createCommandsSection(),
    createOptionsSection(),
    createExamplesSection(),
    `\n${pc.bold('Documentation:')}\n  ${pc.blue('https://github.com/lacomparte/chunk-tools')}`,
  ];
  console.log(`\n${sections.join('\n\n')}\n`);
};

/**
 * 버전 출력
 */
const printVersion = (): void => {
  console.log(`vite-plugin-security v${VERSION}`);
};

/**
 * CLI 인자 타입
 */
type CliArgs = {
  command: string;
  // scan options
  json: boolean;
  failOn: 'critical' | 'high' | 'medium' | null;
  useOsv: boolean;
  includeDevDeps: boolean;
  // init options
  timezone: string;
  time: string;
  useSlack: boolean;
  force: boolean;
};

/**
 * 기본 CLI 인자 생성
 */
const createDefaultArgs = (command: string): CliArgs => ({
  command,
  // scan options
  json: false,
  failOn: null,
  useOsv: true,
  includeDevDeps: false,
  // init options
  timezone: '',
  time: '04:00',
  useSlack: false,
  force: false,
});

/**
 * --fail-on 인자 파싱
 */
const parseFailOnLevel = (
  level: string,
): 'critical' | 'high' | 'medium' | null => {
  if (level === 'critical' || level === 'high' || level === 'medium') {
    return level;
  }
  return null;
};

/**
 * CLI 인자 파싱
 */
const parseArgs = (args: string[]): CliArgs => {
  const result = createDefaultArgs(args[0] ?? 'help');

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    // scan options
    if (arg === '--json') result.json = true;
    else if (arg === '--fail-on') result.failOn = parseFailOnLevel(args[++i]);
    else if (arg === '--no-osv') result.useOsv = false;
    else if (arg === '--include-dev') result.includeDevDeps = true;
    // init options
    else if (arg === '--timezone') result.timezone = args[++i] ?? '';
    else if (arg === '--time') result.time = args[++i] ?? '04:00';
    else if (arg === '--slack') result.useSlack = true;
    else if (arg === '--force') result.force = true;
  }

  return result;
};

/**
 * scan 명령어 실행
 */
const runScanCommand = async (args: CliArgs): Promise<void> => {
  await scanCommand({
    json: args.json,
    failOn: args.failOn,
    useOsv: args.useOsv,
    includeDevDeps: args.includeDevDeps,
  });
};

/**
 * init 명령어 실행
 */
const runInitCommand = (args: CliArgs): void => {
  if (!args.timezone) {
    console.error(pc.red('\n✗ --timezone is required'));
    console.log(
      pc.dim(`Supported timezones:\n  ${SUPPORTED_TIMEZONES.join('\n  ')}`),
    );
    console.log('');
    console.log(
      pc.dim('Example: npx vite-plugin-security init --timezone Asia/Seoul'),
    );
    console.log('');
    process.exit(1);
  }

  initCommand({
    timezone: args.timezone,
    time: args.time,
    useSlack: args.useSlack,
    force: args.force,
  });
};

/**
 * 명령어 라우팅
 */
const routeCommand = async (args: CliArgs): Promise<void> => {
  switch (args.command) {
    case 'scan':
      return runScanCommand(args);
    case 'init':
      return runInitCommand(args);
    case 'version':
    case '-v':
    case '--version':
      return printVersion();
    default:
      return printHelp();
  }
};

/**
 * 메인 함수
 */
const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  await routeCommand(args);
};

// 실행
main().catch((error) => {
  console.error(
    pc.red('Error:'),
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
