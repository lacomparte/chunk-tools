import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

import pc from 'picocolors';

import { analyzePackages } from '../../core/analyzer.js';
import { checkBudgets, hasBudgetOptions } from '../../core/budget-checker.js';
import { analyzeWithDependencyGraph } from '../../core/cluster-analyzer.js';
import { buildDependencyGraph } from '../../core/dependency-graph.js';
import { parseStats, parseStatsFile } from '../../core/parser.js';
import {
  createAnalysisResult,
  formatBudgetReport,
  formatTextReport,
  generateConfigCode,
} from '../../core/reporter.js';
import type {
  AnalyzerOptions,
  BudgetOptions,
  ChunksConfig,
  PackageInfo,
  VisualizerStats,
  VisualizerStatsV2,
} from '../../types/index.js';
import { calculateLockfileHash, isCacheValid } from '../../utils/cache.util.js';
import { parseExistingConfig } from '../../utils/config-parser.util.js';
import { calculateDiff, formatDiff } from '../../utils/diff-formatter.util.js';
import { formatSize } from '../../utils/format-size.util.js';
import {
  detectFramework,
  getFrameworkDisplayName,
} from '../../utils/framework-detector.js';
import {
  generatePreservedChunksConfig,
  getConfigSummary,
  getFrameworkMessage,
} from '../../utils/framework-presets.util.js';
import {
  findIgnoreFile,
  parseIgnoreFile,
} from '../../utils/ignore-file.util.js';

type CliArgs = {
  command: 'default' | 'analyze' | 'init' | 'help' | 'version';
  input?: string;
  output?: string;
  format: 'text' | 'json' | 'config';
  threshold: number;
  ignore: string[];
  buildCommand?: string;
  configOutput?: string;
  statsOutput?: string;
  quiet: boolean;
  // Budget options
  budgetTotal?: number;
  budgetGzip?: number;
  budgetBrotli?: number;
  budgetChunk?: number;
  failOnBudget: boolean;
  // Dry-run option
  dryRun: boolean;
  // Preserved chunks & initial chunk size options
  preservedChunks?: string;
  entryChunks?: string;
  initialChunkMaxSize?: number;
};

export const runCli = (): void => {
  const args = parseArgs(process.argv.slice(2));

  try {
    executeCommand(args);
  } catch (error) {
    console.error(
      pc.red(`Error: ${error instanceof Error ? error.message : error}`),
    );
    process.exit(1);
  }
};

const executeCommand = (args: CliArgs): void => {
  switch (args.command) {
    case 'help':
      printHelp();
      break;
    case 'version':
      printVersion();
      break;
    case 'init':
      runInit(args);
      break;
    case 'analyze':
      runAnalyze(args);
      break;
    case 'default':
    default:
      runDefault(args);
  }
};

const parseArgs = (args: string[]): CliArgs => {
  const result: CliArgs = {
    command: 'default',
    format: 'text',
    threshold: 100,
    ignore: [],
    quiet: false,
    failOnBudget: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const advanced = parseArg(arg, args, i, result);
    if (advanced) i++;
  }

  return result;
};

// eslint-disable-next-line max-lines-per-function -- Complex CLI argument parsing with multiple validation steps
const parseArg = (
  arg: string,
  args: string[],
  i: number,
  result: CliArgs,
): boolean => {
  switch (arg) {
    case 'analyze':
      result.command = 'analyze';
      return false;
    case 'init':
      result.command = 'init';
      return false;
    case 'help':
    case '--help':
    case '-h':
      result.command = 'help';
      return false;
    case 'version':
    case '--version':
    case '-v':
      result.command = 'version';
      return false;
    case '-i':
    case '--input':
      result.input = args[i + 1];
      return true;
    case '-o':
    case '--output':
      result.output = args[i + 1];
      return true;
    case '-f':
    case '--format':
      result.format = args[i + 1] as 'text' | 'json' | 'config';
      return true;
    case '-t':
    case '--threshold':
      result.threshold = Number.parseInt(args[i + 1], 10);
      return true;
    case '--ignore':
      result.ignore.push(args[i + 1]);
      return true;
    case '-c':
    case '--config':
      result.configOutput = args[i + 1];
      return true;
    case '-b':
    case '--build':
      result.buildCommand = args[i + 1];
      return true;
    case '-s':
    case '--stats':
      result.statsOutput = args[i + 1];
      return true;
    case '-q':
    case '--quiet':
      result.quiet = true;
      return false;
    // Budget options
    case '--budget-total':
      result.budgetTotal = Number.parseInt(args[i + 1], 10);
      return true;
    case '--budget-gzip':
      result.budgetGzip = Number.parseInt(args[i + 1], 10);
      return true;
    case '--budget-brotli':
      result.budgetBrotli = Number.parseInt(args[i + 1], 10);
      return true;
    case '--budget-chunk':
      result.budgetChunk = Number.parseInt(args[i + 1], 10);
      return true;
    case '--fail-on-budget':
      result.failOnBudget = true;
      return false;
    // Dry-run option
    case '--dry-run':
      result.dryRun = true;
      return false;
    // Preserved chunks & initial chunk size options
    case '--preserved-chunks':
      result.preservedChunks = args[i + 1];
      return true;
    case '--entry-chunks':
      result.entryChunks = args[i + 1];
      return true;
    case '--initial-chunk-max-size':
      result.initialChunkMaxSize = Number.parseInt(args[i + 1], 10);
      return true;
    default:
      if (!arg.startsWith('-') && !result.input) {
        result.input = arg;
      }
      return false;
  }
};

// eslint-disable-next-line max-lines-per-function -- Comprehensive help text with all CLI options
const printHelp = (): void => {
  console.log(`
${pc.bold(pc.cyan('chunk-analyzer'))}

Analyze Vite/Rollup bundles and suggest optimal chunk groupings.
Uses dependency graph analysis for intelligent package clustering.

${pc.bold('Usage:')}
  chunk-analyzer init                   Generate empty config for first build
  chunk-analyzer [options]              Build → analyze → generate config
  chunk-analyzer analyze [options]      Analyze existing stats.json
  chunk-analyzer help                   Show this help message
  chunk-analyzer version                Show version number

${pc.bold('Options:')}
  -i, --input <file>      Input stats.json file (for analyze command)
  -o, --output <file>     Output file path (for analyze report)
  -c, --config <file>     Config output path (default: chunk-groups.config.ts)
  -s, --stats <file>      Stats.json output path (default: dist/stats.json)
  -b, --build <cmd>       Build command (default: vite build)
  -f, --format <type>     Output format: text, json, config (default: text)
  -t, --threshold <kb>    Large package threshold in KB (default: 100)
  -q, --quiet             Suppress analysis output, only generate config
  --ignore <pattern>      Ignore packages matching pattern (repeatable)

${pc.bold('Budget Options:')}
  --budget-total <kb>     Total bundle size limit in KB
  --budget-gzip <kb>      Gzip size limit in KB
  --budget-brotli <kb>    Brotli size limit in KB
  --budget-chunk <kb>     Single chunk size limit in KB
  --fail-on-budget        Exit with code 1 if budget exceeded (for CI)

${pc.bold('Preview Options:')}
  --dry-run               Preview changes without modifying config file
                          Shows diff between current config and new analysis

${pc.bold('TCP Slow Start Optimization:')}
  --preserved-chunks <file>    JSON config file for preserved chunks (initial HTML)
  --entry-chunks <names>       Comma-separated entry chunk names
  --initial-chunk-max-size <kb> Max size for initial chunks in KB (default: 14)

${pc.bold('.chunkgroupignore file:')}
  Create a .chunkgroupignore file to exclude packages from grouping.
  Uses .gitignore-style patterns (glob, negation with !)

  Example .chunkgroupignore:
    ${pc.dim('# Exclude all lodash packages')}
    ${pc.dim('lodash*')}
    ${pc.dim('# Exclude @sentry but keep @sentry/react')}
    ${pc.dim('@sentry/*')}
    ${pc.dim('!@sentry/react')}

${pc.bold('Examples:')}
  ${pc.dim('# Default: build with visualizer → analyze → generate config')}
  chunk-analyzer

  ${pc.dim('# Custom config output path')}
  chunk-analyzer -c src/chunk-groups.config.ts

  ${pc.dim('# Custom build command')}
  chunk-analyzer -b "pnpm build:visualizer"

  ${pc.dim('# Analyze existing stats.json')}
  chunk-analyzer analyze dist/stats.json

  ${pc.dim('# Generate JSON report')}
  chunk-analyzer analyze -f json -o report.json dist/stats.json

  ${pc.dim('# TCP slow start optimization with preserved chunks')}
  chunk-analyzer --preserved-chunks chunks-config.json --entry-chunks search

${pc.bold('Getting Started:')}
  1. Install: ${pc.dim('pnpm add -D chunk-analyzer rollup-plugin-visualizer')}

  2. Run init (creates empty config for first build):
     ${pc.dim('npx chunk-analyzer init')}

  3. Add visualizer to vite.config.ts:
     ${pc.dim('visualizer({ json: true, filename: "dist/stats.json" })')}

  4. Import generated config in vite.config.ts:
     ${pc.dim('import { CHUNK_GROUPS, createManualChunks } from "./chunk-groups.config"')}

  5. Use in manualChunks:
     ${pc.dim('manualChunks: createManualChunks(CHUNK_GROUPS)')}

  6. Add to package.json scripts:
     ${pc.dim('"build": "npx chunk-analyzer -q && vite build"')}
`);
};

const printVersion = (): void => {
  console.log('0.1.0');
};

// 빈 config 파일 생성 + 프레임워크별 chunks-config.json 생성
// eslint-disable-next-line max-lines-per-function -- Config file initialization with framework detection and preset generation
const runInit = (args: CliArgs): void => {
  const configOutput = args.configOutput ?? 'chunk-groups.config.ts';
  const chunksConfigPath = 'chunks-config.json';
  const configPath = resolve(process.cwd(), configOutput);
  const chunksPath = resolve(process.cwd(), chunksConfigPath);

  if (existsSync(configPath)) {
    console.log(pc.yellow(`Config file already exists: ${configPath}`));
    console.log(
      pc.dim('Use "npx chunk-analyzer" to regenerate based on analysis.'),
    );
    return;
  }

  // Step 1: Detect framework from package.json
  console.log();
  console.log(pc.bold(pc.cyan('🔍 package.json에서 프레임워크 감지 중...')));

  const framework = detectFrameworkFromPackageJson();
  const frameworkName = getFrameworkDisplayName(framework);
  console.log(pc.green(`✓ 감지됨: ${frameworkName}`));
  console.log();

  // Step 2: Generate config files
  console.log(pc.bold(pc.cyan('📝 설정 파일 생성 중...')));

  // 2-1. chunk-groups.config.ts (빈 설정)
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const emptyConfig = generateEmptyConfig();
  writeFileSync(configPath, emptyConfig);
  console.log(pc.green(`✓ 생성됨: ${configPath} (초기 빌드용 빈 설정)`));

  // 2-2. chunks-config.json (프레임워크 프리셋)
  const chunksConfig = generatePreservedChunksConfig(framework);
  writeFileSync(chunksPath, JSON.stringify(chunksConfig, null, 2));
  console.log(
    pc.green(`✓ 생성됨: ${chunksConfigPath} (${frameworkName} 최적화 설정)`),
  );
  console.log();

  // Step 3: Display framework-specific message
  const message = getFrameworkMessage(framework);
  console.log(message);
  console.log();

  // Step 4: Display config summary
  const summary = getConfigSummary(framework);
  console.log(summary);
  console.log();

  // Step 5: Next steps
  console.log(pc.bold('다음 단계:'));
  console.log(pc.dim('  1. vite.config.ts에 visualizer 추가:'));
  console.log(
    pc.dim('     visualizer({ json: true, filename: "dist/stats.json" })'),
  );
  console.log();
  console.log(pc.dim('  2. vite.config.ts에 import:'));
  console.log(
    pc.dim(
      `     import { CHUNK_GROUPS, createManualChunks } from "./${configOutput.replace(/\.ts$/, '')}"`,
    ),
  );
  console.log();
  console.log(pc.dim('  3. rollupOptions.output에 사용:'));
  console.log(pc.dim('     manualChunks: createManualChunks(CHUNK_GROUPS)'));
  console.log();
  console.log(pc.dim('  4. 빌드 실행:'));
  console.log(
    pc.dim(
      `     npx chunk-analyzer --preserved-chunks ${chunksConfigPath} -b "vite build"`,
    ),
  );
  console.log();
};

/**
 * package.json에서 프레임워크 감지
 */
const detectFrameworkFromPackageJson = () => {
  const packageJsonPath = resolve(process.cwd(), 'package.json');

  if (!existsSync(packageJsonPath)) {
    return 'unknown' as const;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Simulate PackageInfo Map for detectFramework
    const packageMap = new Map(
      Object.keys(deps).map((pkg) => [pkg, { name: pkg } as unknown]),
    );

    return detectFramework(packageMap as Map<string, PackageInfo>);
  } catch {
    return 'unknown' as const;
  }
};

const generateEmptyConfig = (): string => `// Auto-generated by chunk-analyzer
// Run "npx chunk-analyzer" after first build to generate optimized config

export type ChunkGroup = { name: string; patterns: string[] };

// Empty config for first build - will be populated after analysis
export const CHUNK_GROUPS: ChunkGroup[] = [];

export function createManualChunks(groups: ChunkGroup[] = CHUNK_GROUPS) {
  const includesAny = (id: string, patterns: string[]): boolean =>
    patterns.some((pattern) => id.includes(\`node_modules/\${pattern}\`));

  return (id: string): string | undefined => {
    if (!id.includes('node_modules')) return;

    // If no groups defined, use default splitting
    if (groups.length === 0) {
      const match = id.match(/node_modules\\/((?:@[^/]+\\/)?[^/]+)/);
      return match ? \`vendor/\${match[1]}\` : undefined;
    }

    const matchedGroup = groups.find((group) => includesAny(id, group.patterns));
    if (matchedGroup) return matchedGroup.name;

    const match = id.match(/node_modules\\/((?:@[^/]+\\/)?[^/]+)/);
    return match ? \`vendor/\${match[1]}\` : undefined;
  };
}
`;

const findStatsFile = (input?: string): string | null => {
  const candidates = input
    ? [input]
    : [
        'dist/stats.json',
        'dist/report.json',
        'build/stats.json',
        'out/stats.json',
        '.next/stats.json',
        'stats.json',
      ];

  for (const candidate of candidates) {
    const fullPath = resolve(process.cwd(), candidate);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
};

// v2 stats 체크
const isV2Stats = (stats: VisualizerStats): stats is VisualizerStatsV2 =>
  stats.version === 2 && 'nodeParts' in stats && 'nodeMetas' in stats;

// eslint-disable-next-line max-lines-per-function -- Stats processing with graph building and package extraction
// 의존성 그래프 기반 또는 기존 분석 실행
const runAnalysis = (
  stats: VisualizerStats,
  options: AnalyzerOptions,
  quiet: boolean,
) => {
  const packages = parseStats(stats);

  // v2 stats면 의존성 그래프 기반 분석 사용
  if (isV2Stats(stats)) {
    if (!quiet) {
      console.log(
        pc.dim('Using dependency graph analysis (v2 stats detected)\n'),
      );
    }
    const graph = buildDependencyGraph(stats);
    const suggestions = analyzeWithDependencyGraph(packages, graph, options);
    return { packages, suggestions };
  }

  // v1 stats면 기존 규칙 기반 분석
  if (!quiet) {
    console.log(pc.dim('Using rule-based analysis (v1 stats detected)\n'));
  }
  const suggestions = analyzePackages(packages, options);
  return { packages, suggestions };
};

/**
 * JSON 설정 파일 로드 및 옵션 병합
 */
// eslint-disable-next-line max-lines-per-function
const loadChunksConfig = (args: CliArgs, options: AnalyzerOptions): void => {
  if (!args.preservedChunks) return;

  const configPath = resolve(process.cwd(), args.preservedChunks);

  if (!existsSync(configPath)) {
    console.error(pc.red(`❌ Config file not found: ${configPath}`));
    process.exit(1);
  }

  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const config: ChunksConfig = JSON.parse(configContent);

    // JSON 파일에서 옵션 병합
    if (config.preservedChunks) {
      options.preservedChunks = config.preservedChunks;
    }
    if (config.entryChunks) {
      options.entryChunks = config.entryChunks;
    }
    if (config.initialChunkMaxSize) {
      options.initialChunkMaxSize = config.initialChunkMaxSize;
    }
    if (config.customGroups) {
      options.customGroups = config.customGroups;
      console.log(
        pc.dim(
          `  Loaded ${Object.keys(config.customGroups).length} custom groups`,
        ),
      );
    }

    console.log(pc.dim(`  Loaded chunks config from ${args.preservedChunks}`));
  } catch (error) {
    console.error(
      pc.red(
        `❌ Failed to parse config: ${error instanceof Error ? error.message : error}`,
      ),
    );
    process.exit(1);
  }

  // CLI 인수가 JSON 파일보다 우선순위 높음
  if (args.entryChunks) {
    options.entryChunks = args.entryChunks.split(',');
  }

  if (args.initialChunkMaxSize) {
    options.initialChunkMaxSize = args.initialChunkMaxSize * 1024; // KB to bytes
  }
};

// eslint-disable-next-line max-lines-per-function -- Default command orchestration with stats generation and analysis
const runDefault = (args: CliArgs): void => {
  const configOutput = args.configOutput ?? 'chunk-groups.config.ts';
  const statsOutput = args.statsOutput ?? 'dist/stats.json';
  const configPath = resolve(process.cwd(), configOutput);

  // 캐시 체크: lockfile이 변경되지 않았으면 빌드 + 분석 스킵
  if (isCacheValid(configPath)) {
    console.log(
      pc.green('✓ Dependencies unchanged, skipping build & analysis'),
    );
    console.log(pc.dim(`  (lockfile hash matches ${configOutput})`));
    return;
  }

  // Step 1: Build with visualizer to generate stats.json
  if (!args.quiet) {
    console.log(pc.bold(pc.cyan('\n[1/3] Building with visualizer...\n')));
  }

  const buildCommand = createVisualizerBuildCommand(
    args.buildCommand,
    statsOutput,
  );

  try {
    execSync(buildCommand, {
      stdio: args.quiet ? 'pipe' : 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        CHUNK_ANALYZER_STATS_OUTPUT: statsOutput,
      },
    });
  } catch {
    throw new Error(`Build command failed: ${buildCommand}`);
  }

  // Step 2: Analyze the generated stats.json
  if (!args.quiet) {
    console.log(pc.bold(pc.cyan('\n[2/3] Analyzing bundle...\n')));
  }

  const statsPath = findStatsFile(statsOutput);
  if (!statsPath) {
    throw new Error(
      `Stats file not found at: ${statsOutput}\n` +
        'Make sure vite.config.ts includes visualizer({ json: true, filename: "dist/stats.json" })',
    );
  }

  if (!args.quiet) {
    console.log(pc.dim(`Reading: ${statsPath}`));
  }

  const rawStats = readFileSync(statsPath, 'utf-8');
  const stats = parseStatsFile(rawStats);

  // .chunkgroupignore 파일 로드 및 CLI --ignore 옵션과 병합
  const ignorePatterns = loadIgnorePatterns(args.ignore);

  const options: AnalyzerOptions = {
    largePackageThreshold: args.threshold * 1024,
    ignore: ignorePatterns,
  };

  // Preserved chunks & entry chunks 설정 로드
  loadChunksConfig(args, options);

  const { packages, suggestions } = runAnalysis(stats, options, args.quiet);
  const result = createAnalysisResult(packages, suggestions);

  if (!args.quiet) {
    console.log(formatTextReport(result));
  }

  // Budget 검증
  const budgetFailed = runBudgetCheck(args, result);

  // Dry-run 모드: config 파일 저장하지 않고 diff만 출력
  if (args.dryRun) {
    runDryRunDiff(configPath, suggestions);
    return;
  }

  // Step 3: Generate config file with cache key
  if (!args.quiet) {
    console.log(pc.bold(pc.cyan('[3/3] Generating config file...\n')));
  }

  const configDir = dirname(configPath);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // lockfile 해시를 캐시키로 저장
  const cacheKey = calculateLockfileHash();
  const configCode = generateConfigCode(suggestions, cacheKey ?? undefined);
  writeFileSync(configPath, configCode);

  console.log(pc.green(`✓ Config saved to: ${configPath}`));

  if (!args.quiet) {
    console.log(
      pc.dim(
        `\nNext: Run your actual build command to use the generated config.`,
      ),
    );
  }

  // Budget 초과 시 exit code 1
  if (budgetFailed && args.failOnBudget) {
    process.exit(1);
  }
};

// eslint-disable-next-line max-lines-per-function -- Vite config generation with multiple build scenarios and file I/O
const createVisualizerBuildCommand = (
  customCommand?: string,
  statsOutput?: string,
): string => {
  if (customCommand) {
    return customCommand;
  }

  // Default: use vite build with visualizer plugin via CLI
  const outputPath = statsOutput ?? 'dist/stats.json';

  // Check if vite.config exists and may have visualizer configured
  const hasViteConfig =
    existsSync(resolve(process.cwd(), 'vite.config.ts')) ||
    existsSync(resolve(process.cwd(), 'vite.config.js'));

  if (hasViteConfig) {
    // Assume user has visualizer in their config, just run vite build
    // They need to configure visualizer({ json: true, filename: "dist/stats.json" })
    return `vite build`;
  }

  // No vite config, this is likely an error
  throw new Error(
    'No vite.config.ts found. Please create a vite.config.ts with visualizer plugin:\n\n' +
      `import { visualizer } from 'rollup-plugin-visualizer';\n\n` +
      `export default defineConfig({\n` +
      `  plugins: [\n` +
      `    visualizer({ json: true, filename: '${outputPath}' })\n` +
      `  ]\n` +
      `});\n`,
  );
};

// eslint-disable-next-line max-lines-per-function -- Analyze command with stats loading, analysis, and output formatting
const runAnalyze = (args: CliArgs): void => {
  const statsPath = findStatsFile(args.input);

  if (!statsPath) {
    const candidates = args.input
      ? [args.input]
      : [
          'dist/stats.json',
          'dist/report.json',
          'stats.json',
          'build/stats.json',
        ];

    throw new Error(
      `Stats file not found. Tried: ${candidates.join(', ')}\n` +
        'Run chunk-analyzer (without analyze) to build and generate stats.json first.',
    );
  }

  console.log(pc.dim(`Reading: ${statsPath}\n`));

  const rawStats = readFileSync(statsPath, 'utf-8');
  const stats = parseStatsFile(rawStats);

  // .chunkgroupignore 파일 로드 및 CLI --ignore 옵션과 병합
  const ignorePatterns = loadIgnorePatterns(args.ignore);

  const options: AnalyzerOptions = {
    largePackageThreshold: args.threshold * 1024,
    ignore: ignorePatterns,
  };

  // Preserved chunks & entry chunks 설정 로드
  loadChunksConfig(args, options);

  const { packages, suggestions } = runAnalysis(stats, options, false);
  const result = createAnalysisResult(packages, suggestions);

  // Dry-run 모드: analyze 명령에서도 지원
  if (args.dryRun) {
    const configPath = resolve(
      process.cwd(),
      args.configOutput ?? 'chunk-groups.config.ts',
    );
    runDryRunDiff(configPath, suggestions);

    // Budget 검증도 함께 실행
    runBudgetCheck(args, result);
    return;
  }

  const output = formatOutput(result, suggestions, args.format);

  if (args.output) {
    writeFileSync(args.output, output);
    console.log(pc.green(`Output saved to: ${args.output}`));
  } else {
    console.log(output);
  }

  // Budget 검증
  const budgetFailed = runBudgetCheck(args, result);

  // Budget 초과 시 exit code 1
  if (budgetFailed && args.failOnBudget) {
    process.exit(1);
  }
};

const formatOutput = (
  result: ReturnType<typeof createAnalysisResult>,
  suggestions: ReturnType<typeof analyzePackages>,
  format: CliArgs['format'],
): string => {
  switch (format) {
    case 'json':
      return JSON.stringify(result, null, 2);
    case 'config':
      return generateConfigCode(suggestions);
    case 'text':
    default:
      return formatTextReport(result);
  }
};

/**
 * .chunkgroupignore 파일과 CLI --ignore 옵션을 병합합니다.
 * 파일 패턴이 먼저 적용되고, CLI 패턴이 뒤에 추가됩니다.
 */
const loadIgnorePatterns = (cliIgnore: string[]): string[] => {
  const ignoreFilePath = findIgnoreFile();

  if (!ignoreFilePath) {
    return cliIgnore;
  }

  const filePatterns = parseIgnoreFile(ignoreFilePath);

  // 파일 패턴 + CLI 패턴 (CLI가 뒤에 와서 우선순위 높음)
  return [...filePatterns, ...cliIgnore];
};

/**
 * Budget 검증을 실행하고 결과를 출력합니다.
 * @returns budget이 초과되었으면 true, 아니면 false
 */
const runBudgetCheck = (
  args: CliArgs,
  result: ReturnType<typeof createAnalysisResult>,
): boolean => {
  if (!hasBudgetOptions(args)) {
    return false;
  }

  const budgetOptions: BudgetOptions = {
    totalSize: args.budgetTotal,
    gzipSize: args.budgetGzip,
    brotliSize: args.budgetBrotli,
    chunkSize: args.budgetChunk,
  };

  const budgetReport = checkBudgets(result, budgetOptions);
  console.log(formatBudgetReport(budgetReport));

  return !budgetReport.passed;
};

/**
 * Dry-run 모드: 기존 config와 새 분석 결과를 비교하여 diff를 출력합니다.
 */
const runDryRunDiff = (
  configPath: string,
  suggestions: ReturnType<typeof analyzePackages>,
): void => {
  const existingGroups = parseExistingConfig(configPath);

  if (!existingGroups) {
    console.log(pc.yellow('\nNo existing config file found.'));
    console.log(
      pc.dim(`Would create: ${configPath} with ${suggestions.length} groups\n`),
    );

    // 새로 생성될 그룹 목록 출력
    for (const group of suggestions) {
      const sizeInfo =
        group.estimatedSize > 0 ? ` (${formatSize(group.estimatedSize)})` : '';
      console.log(pc.green(`  + ${group.name}${sizeInfo}`));
    }
    console.log('');
    return;
  }

  const diff = calculateDiff(existingGroups, suggestions);
  console.log(formatDiff(diff));
};
