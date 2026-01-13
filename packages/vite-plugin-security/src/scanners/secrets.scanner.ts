import type { PatternDef, Scanner, SecurityIssue } from '../types/index.js';

/**
 * 하드코딩된 시크릿을 탐지하는 패턴들
 *
 * 주요 탐지 대상:
 * - 클라우드 서비스 API 키 (AWS, GCP, Azure)
 * - AI 서비스 API 키 (OpenAI, Anthropic)
 * - 결제 서비스 키 (Stripe)
 * - 인증 관련 시크릿 (JWT, OAuth)
 * - 개인 키 (RSA, EC)
 *
 * key: 무시 옵션에서 사용할 고유 식별자
 */
const SECRET_PATTERNS: PatternDef[] = [
  {
    key: 'aws-access-key',
    name: 'AWS Access Key',
    pattern: /(?<=['"`])AKIA[0-9A-Z]{16}(?=['"`])/g,
    severity: 'critical',
    description:
      'AWS Access Key가 하드코딩되어 있습니다. 클라이언트에 노출되면 AWS 리소스에 무단 접근이 가능합니다.',
    fix: '환경변수를 사용하세요: import.meta.env.VITE_AWS_ACCESS_KEY',
    ref: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
  },
  {
    key: 'aws-secret-key',
    name: 'AWS Secret Key',
    pattern: /(?<=['"`])[A-Za-z0-9/+=]{40}(?=['"`])(?=.*(?:aws|secret|key))/gi,
    severity: 'critical',
    description: 'AWS Secret Key가 하드코딩되어 있습니다.',
    fix: '환경변수를 사용하세요: import.meta.env.VITE_AWS_SECRET_KEY',
    ref: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
  },
  {
    key: 'openai-api-key',
    name: 'OpenAI API Key',
    pattern: /(?<=['"`])sk-[a-zA-Z0-9]{48,}(?=['"`])/g,
    severity: 'critical',
    description:
      'OpenAI API 키가 하드코딩되어 있습니다. 클라이언트에 노출되면 API 사용량이 도용될 수 있습니다.',
    fix: '환경변수를 사용하세요: import.meta.env.VITE_OPENAI_API_KEY (서버에서만 사용 권장)',
    ref: 'https://platform.openai.com/docs/api-reference/authentication',
  },
  {
    key: 'anthropic-api-key',
    name: 'Anthropic API Key',
    pattern: /(?<=['"`])sk-ant-[a-zA-Z0-9-]{40,}(?=['"`])/g,
    severity: 'critical',
    description: 'Anthropic API 키가 하드코딩되어 있습니다.',
    fix: '환경변수를 사용하세요 (서버에서만 사용 권장)',
    ref: 'https://docs.anthropic.com/en/api/getting-started',
  },
  {
    key: 'stripe-api-key',
    name: 'Stripe API Key',
    pattern: /(?<=['"`])(sk|pk|rk)_(test|live)_[a-zA-Z0-9]{24,}(?=['"`])/g,
    severity: 'critical',
    description:
      'Stripe API 키가 하드코딩되어 있습니다. Secret Key(sk_)는 절대 클라이언트에 노출되면 안 됩니다.',
    fix: 'Secret Key는 서버에서만 사용하세요. Publishable Key(pk_)만 클라이언트에 사용 가능합니다.',
    ref: 'https://stripe.com/docs/keys',
  },
  {
    key: 'github-token',
    name: 'GitHub Token',
    pattern: /(?<=['"`])(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}(?=['"`])/g,
    severity: 'critical',
    description: 'GitHub 토큰이 하드코딩되어 있습니다.',
    fix: '환경변수를 사용하세요. GitHub Actions에서는 secrets를 사용하세요.',
    ref: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
  },
  {
    key: 'google-api-key',
    name: 'Google API Key',
    pattern: /(?<=['"`])AIza[0-9A-Za-z_-]{35}(?=['"`])/g,
    severity: 'high',
    description:
      'Google API 키가 하드코딩되어 있습니다. 제한 없이 사용되면 비용이 발생할 수 있습니다.',
    fix: 'Google Cloud Console에서 API 키 제한을 설정하고, 가능하면 서버에서 사용하세요.',
    ref: 'https://cloud.google.com/docs/authentication/api-keys',
  },
  {
    key: 'private-key',
    name: 'Private Key',
    pattern:
      /-----BEGIN\s+(RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/g,
    severity: 'critical',
    description: '개인 키(Private Key)가 코드에 포함되어 있습니다.',
    fix: '개인 키는 절대 소스코드에 포함하지 마세요. 환경변수나 시크릿 관리 서비스를 사용하세요.',
    ref: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
  },
  {
    key: 'jwt-secret',
    name: 'JWT Secret',
    pattern:
      /(?:jwt|JWT|token|TOKEN|secret|SECRET)(?:_?(?:key|KEY|secret|SECRET))?\s*[=:]\s*['"`]([a-zA-Z0-9_-]{32,})['"`]/g,
    severity: 'high',
    description: 'JWT 시크릿이 하드코딩되어 있습니다.',
    fix: '환경변수를 사용하세요: process.env.JWT_SECRET',
    ref: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
  },
  {
    key: 'database-url',
    name: 'Database Connection String',
    pattern:
      /(?:mongodb|postgres|mysql|redis):\/\/[^'"`\s]+:[^'"`\s]+@[^'"`\s]+/g,
    severity: 'critical',
    description:
      '데이터베이스 연결 문자열이 하드코딩되어 있습니다. 인증 정보가 노출됩니다.',
    fix: '환경변수를 사용하세요: process.env.DATABASE_URL',
    ref: 'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
  },
  {
    key: 'generic-api-key',
    name: 'Generic API Key Assignment',
    pattern:
      /(?:api[_-]?key|API[_-]?KEY|apiKey|ApiKey)\s*[=:]\s*['"`]([a-zA-Z0-9_-]{20,})['"`]/g,
    severity: 'warning',
    description: 'API 키로 보이는 값이 하드코딩되어 있습니다.',
    fix: '환경변수를 사용하세요: import.meta.env.VITE_API_KEY',
    ref: 'https://owasp.org/Top10/A01_2021-Broken_Access_Control/',
  },
  {
    key: 'password',
    name: 'Password Assignment',
    pattern:
      /(?:password|PASSWORD|pwd|PWD|passwd)\s*[=:]\s*['"`]([^'"`]{8,})['"`]/g,
    severity: 'high',
    description: '비밀번호가 하드코딩되어 있습니다.',
    fix: '절대 비밀번호를 코드에 포함하지 마세요. 환경변수나 시크릿 관리 서비스를 사용하세요.',
    ref: 'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
  },
];

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

  // 80자 이상이면 잘라서 표시
  if (targetLine.length > 80) {
    return targetLine.substring(0, 77) + '...';
  }
  return targetLine.trim();
};

const SKIP_FILE_PATTERNS = [
  '.test.',
  '.spec.',
  '.example.',
  '__tests__',
  '__mocks__',
];

/**
 * 테스트/예시 파일인지 확인
 */
const isTestOrExampleFile = (filePath: string): boolean =>
  SKIP_FILE_PATTERNS.some((pattern) => filePath.includes(pattern));

/**
 * 시크릿 값 마스킹
 */
const maskSecret = (code: string, match: string): string =>
  code.replace(match, match.substring(0, 8) + '****');

/**
 * 패턴에 대한 이슈 생성
 */
const createSecretIssue = (
  patternDef: PatternDef,
  code: string,
  filePath: string,
  match: RegExpExecArray,
): SecurityIssue => {
  const { line, column } = getLocation(code, match.index);
  const codeSnippet = getCodeSnippet(code, line);
  return {
    key: patternDef.key,
    title: patternDef.name,
    description: patternDef.description,
    severity: patternDef.severity,
    filePath,
    line,
    column,
    code: maskSecret(codeSnippet, match[0]),
    fix: patternDef.fix,
    ref: patternDef.ref,
    scanner: 'secrets',
  };
};

/**
 * 단일 패턴으로 코드 스캔
 */
const scanPattern = (
  patternDef: PatternDef,
  code: string,
  filePath: string,
): SecurityIssue[] => {
  const issues: SecurityIssue[] = [];
  const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    issues.push(createSecretIssue(patternDef, code, filePath, match));
  }
  return issues;
};

/**
 * 시크릿 스캐너
 * 하드코딩된 API 키, 토큰, 비밀번호 등을 탐지합니다.
 */
export const secretsScanner: Scanner = {
  name: 'secrets',
  scan: (code: string, filePath: string): SecurityIssue[] => {
    if (isTestOrExampleFile(filePath)) return [];
    return SECRET_PATTERNS.flatMap((pattern) =>
      scanPattern(pattern, code, filePath),
    );
  },
};
