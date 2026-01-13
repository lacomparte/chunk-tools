import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import pc from 'picocolors';

import { createWorkflowTemplate } from './templates/security-workflow.js';
import {
  isValidTime,
  isValidTimezone,
  localTimeToCron,
  SUPPORTED_TIMEZONES,
} from './utils/timezone.js';

type InitOptions = {
  timezone: string;
  time: string;
  useSlack: boolean;
  force: boolean;
};

/**
 * 설정 정보 출력
 */
const printConfiguration = (
  options: InitOptions,
  cronExpression: string,
): void => {
  console.log(pc.bold('Configuration:'));
  console.log(`  ${pc.cyan('Timezone:')} ${options.timezone}`);
  console.log(`  ${pc.cyan('Time:')} ${options.time}`);
  console.log(`  ${pc.cyan('UTC Cron:')} ${cronExpression}`);
  console.log(
    `  ${pc.cyan('Slack:')} ${options.useSlack ? 'Enabled' : 'Disabled'}`,
  );
};

/**
 * 다음 단계 안내 출력
 */
const printNextSteps = (useSlack: boolean): void => {
  console.log(pc.bold('Next steps:'));
  console.log(`  ${pc.cyan('1.')} Push to GitHub to enable the workflow`);
  console.log(
    `  ${pc.cyan('2.')} Security issues will be created automatically with labels`,
  );
  if (useSlack) {
    console.log(
      `  ${pc.cyan('3.')} Add ${pc.yellow('SLACK_WEBHOOK_URL')} to repository secrets`,
    );
  }
};

/**
 * 성공 메시지 출력
 */
const printSuccessMessage = (
  options: InitOptions,
  cronExpression: string,
): void => {
  console.log('');
  console.log(pc.green('✓ Created GitHub Action workflow!'));
  console.log('');
  printConfiguration(options, cronExpression);
  console.log('');
  console.log(pc.bold('Files created:'));
  console.log(`  ${pc.cyan('.github/workflows/security-scan.yml')}`);
  console.log('');
  printNextSteps(options.useSlack);
  console.log('');
  console.log(pc.dim('To test locally:'));
  console.log(`  ${pc.green('npx vite-plugin-security scan')}`);
  console.log('');
};

/**
 * 유효성 검사
 */
const validateOptions = (options: InitOptions): boolean => {
  if (!isValidTimezone(options.timezone)) {
    console.error(pc.red(`\n✗ Invalid timezone: ${options.timezone}`));
    console.log(
      pc.dim(`Supported timezones:\n  ${SUPPORTED_TIMEZONES.join('\n  ')}`),
    );
    console.log('');
    return false;
  }

  if (!isValidTime(options.time)) {
    console.error(pc.red(`\n✗ Invalid time format: ${options.time}`));
    console.log(pc.dim('Use HH:mm format (e.g., 04:00, 09:30)'));
    console.log('');
    return false;
  }

  return true;
};

/**
 * 워크플로우 파일 존재 여부 확인
 */
const checkExistingWorkflow = (
  workflowPath: string,
  force: boolean,
): boolean => {
  if (existsSync(workflowPath) && !force) {
    console.log('');
    console.log(pc.yellow('⚠️  Workflow file already exists:'));
    console.log(pc.dim(`   ${workflowPath}`));
    console.log('');
    console.log(pc.dim('   Use --force to overwrite.'));
    console.log('');
    return false;
  }
  return true;
};

/**
 * init 명령어 실행
 */
export const initCommand = (options: InitOptions): void => {
  // 1. 유효성 검사
  if (!validateOptions(options)) {
    process.exit(1);
  }

  // 2. 경로 설정
  const cwd = process.cwd();
  const workflowDir = resolve(cwd, '.github', 'workflows');
  const workflowPath = resolve(workflowDir, 'security-scan.yml');

  // 3. 기존 파일 확인
  if (!checkExistingWorkflow(workflowPath, options.force)) {
    return;
  }

  // 4. Cron 표현식 생성
  const cronExpression = localTimeToCron(options.timezone, options.time);

  // 5. 디렉토리 생성
  if (!existsSync(workflowDir)) {
    mkdirSync(workflowDir, { recursive: true });
    console.log(pc.dim(`  Created ${workflowDir}`));
  }

  // 6. 워크플로우 파일 생성
  const template = createWorkflowTemplate({
    timezone: options.timezone,
    time: options.time,
    cronExpression,
    useSlack: options.useSlack,
    useIssue: true, // 기본적으로 GitHub Issue 생성 활성화
  });

  writeFileSync(workflowPath, template);

  // 7. 성공 메시지
  printSuccessMessage(options, cronExpression);
};
