type WorkflowOptions = {
  timezone: string;
  time: string;
  cronExpression: string;
  useSlack: boolean;
  useIssue: boolean;
};

/**
 * 워크플로우 트리거 설정 생성
 */
const createTriggerSection = (
  options: WorkflowOptions,
): string => `name: Security Scan & Report

on:
  schedule:
    # Runs at ${options.time} ${options.timezone} (UTC cron: ${options.cronExpression})
    - cron: '${options.cronExpression}'
  workflow_dispatch:
    inputs:
      force_report:
        description: 'Generate report even if no issues'
        required: false
        default: 'false'
`;

/**
 * Job 설정 및 setup 스텝 생성
 */
const createJobSetupSection = (): string => `
jobs:
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
`;

/**
 * 기본 워크플로우 헤더 생성
 */
const createWorkflowHeader = (options: WorkflowOptions): string =>
  createTriggerSection(options) + createJobSetupSection();

/**
 * 보안 스캔 스텝 생성
 */
const createScanStep = (): string => `
      - name: Run Security Scan
        id: scan
        run: |
          npx vite-plugin-security scan --json > security-report.json || true

          CRITICAL=$(jq '.summary.code.critical // 0' security-report.json)
          HIGH=$(jq '.summary.code.high // 0' security-report.json)
          DEP_CRITICAL=$(jq '.summary.dependencies.critical // 0' security-report.json)
          DEP_HIGH=$(jq '.summary.dependencies.high // 0' security-report.json)

          TOTAL_CRITICAL=$((CRITICAL + DEP_CRITICAL))
          TOTAL_HIGH=$((HIGH + DEP_HIGH))

          echo "critical=$TOTAL_CRITICAL" >> $GITHUB_OUTPUT
          echo "high=$TOTAL_HIGH" >> $GITHUB_OUTPUT

          if [ "$TOTAL_CRITICAL" -gt 0 ] || [ "$TOTAL_HIGH" -gt 0 ]; then
            echo "has_issues=true" >> $GITHUB_OUTPUT
          else
            echo "has_issues=false" >> $GITHUB_OUTPUT
          fi
`;

/**
 * Issue body 생성 스크립트
 */
const createIssueBodyScript = (timezone: string): string => `
          # Generate issue body
          cat > issue-body.md << 'EOF'
          ## 📊 Scan Summary

          | Severity | Count |
          |----------|-------|
          | 🔴 Critical | CRITICAL_PLACEHOLDER |
          | 🟠 High | HIGH_PLACEHOLDER |

          ## 🔍 Top Issues

          EOF

          # Replace placeholders and append issues
          sed -i "s/CRITICAL_PLACEHOLDER/$CRITICAL/g" issue-body.md
          sed -i "s/HIGH_PLACEHOLDER/$HIGH/g" issue-body.md
          jq -r '.issues[:10] | .[] | "- **[\\(.severity)]** \\(.title) in \\\`\\(.filePath):\\(.line)\\\`"' security-report.json >> issue-body.md

          # Add footer
          cat >> issue-body.md << 'EOF'

          ---
          📅 **Generated:** TIMESTAMP_PLACEHOLDER ${timezone}
          🤖 *Automated by [vite-plugin-security](https://github.com/lacomparte/chunk-tools)*
          EOF

          sed -i "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" issue-body.md`;

/**
 * Issue 라벨 및 생성 스크립트
 */
const createIssueLabelScript = (): string => `
          # Determine labels based on severity
          LABELS="security"
          if [ "$CRITICAL" -gt 0 ]; then
            LABELS="$LABELS,critical"
          elif [ "$HIGH" -gt 0 ]; then
            LABELS="$LABELS,high"
          fi

          # Create issue
          gh issue create \\
            --title "🔒 Security Scan: $CRITICAL critical, $HIGH high issues found" \\
            --body-file issue-body.md \\
            --label "$LABELS"`;

/**
 * GitHub Issue 생성 스텝
 */
const createIssueStep = (options: WorkflowOptions): string => `
      - name: Create GitHub Issue
        if: steps.scan.outputs.has_issues == 'true' || github.event.inputs.force_report == 'true'
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          TIMESTAMP=$(TZ='${options.timezone}' date '+%Y-%m-%d %H:%M')
          CRITICAL=\${{ steps.scan.outputs.critical }}
          HIGH=\${{ steps.scan.outputs.high }}
${createIssueBodyScript(options.timezone)}
${createIssueLabelScript()}
`;

/**
 * Slack 메시지 블록 생성
 */
const createSlackBlocks = (): string => `\\"blocks\\": [
                {
                  \\"type\\": \\"header\\",
                  \\"text\\": {\\"type\\": \\"plain_text\\", \\"text\\": \\"🔒 Security Issues Found\\"}
                },
                {
                  \\"type\\": \\"section\\",
                  \\"fields\\": [
                    {\\"type\\": \\"mrkdwn\\", \\"text\\": \\"*Critical:* \${{ steps.scan.outputs.critical }}\\"},
                    {\\"type\\": \\"mrkdwn\\", \\"text\\": \\"*High:* \${{ steps.scan.outputs.high }}\\"}
                  ]
                },
                {
                  \\"type\\": \\"section\\",
                  \\"text\\": {\\"type\\": \\"mrkdwn\\", \\"text\\": \\"*Top Issues:*\\\\n$TOP_ISSUES\\"}
                },
                {
                  \\"type\\": \\"section\\",
                  \\"text\\": {\\"type\\": \\"mrkdwn\\", \\"text\\": \\"<https://github.com/\${{ github.repository }}/issues?q=label:security|📋 View Security Issues>\\"}
                }
              ]`;

/**
 * Slack 알림 스텝 생성
 */
const createSlackStep = (): string => `
      - name: Slack Notification
        if: steps.scan.outputs.has_issues == 'true' && env.SLACK_WEBHOOK_URL != ''
        env:
          SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}
        run: |
          TOP_ISSUES=$(jq -r '.issues[:5] | .[] | "• *[\\(.severity)]* \\(.title)"' security-report.json)

          curl -X POST -H 'Content-type: application/json' \\
            --data "{
              \\"text\\": \\"🔒 Security Scan Alert\\",
              ${createSlackBlocks()}
            }" \\
            "$SLACK_WEBHOOK_URL"
`;

/**
 * GitHub Step Summary 생성
 */
const createSummaryStep = (): string => `
      - name: Generate Summary
        if: always()
        run: |
          cat >> $GITHUB_STEP_SUMMARY << 'EOF'
          ## 🔒 Security Scan Results

          | Severity | Count |
          |----------|-------|
          | Critical | $\{{ steps.scan.outputs.critical }} |
          | High | $\{{ steps.scan.outputs.high }} |

          EOF

          if [ "$\{{ steps.scan.outputs.has_issues }}" == "true" ]; then
            echo "⚠️ **Security issues found!** Check Issues tab for details." >> $GITHUB_STEP_SUMMARY
          else
            echo "✅ **No security issues found.**" >> $GITHUB_STEP_SUMMARY
          fi
`;

/**
 * 전체 워크플로우 템플릿 생성
 */
export const createWorkflowTemplate = (options: WorkflowOptions): string => {
  const parts = [createWorkflowHeader(options), createScanStep()];

  if (options.useIssue) {
    parts.push(createIssueStep(options));
  }

  if (options.useSlack) {
    parts.push(createSlackStep());
  }

  parts.push(createSummaryStep());

  return parts.join('');
};
