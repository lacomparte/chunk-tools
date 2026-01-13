import type { PatternDef, Scanner, SecurityIssue } from '../types/index.js';

/**
 * 위험한 코드 패턴 정의
 * XSS, 코드 인젝션 등 보안 취약점을 일으킬 수 있는 패턴들
 *
 * key: 무시 옵션에서 사용할 고유 식별자
 */
const DANGEROUS_PATTERNS: PatternDef[] = [
  // 코드 인젝션
  {
    key: 'eval',
    name: 'eval() Usage',
    pattern: /\beval\s*\(/g,
    severity: 'critical',
    description:
      'eval()은 문자열을 코드로 실행합니다. 사용자 입력이 포함되면 코드 인젝션 공격이 가능합니다.',
    fix: 'eval() 대신 JSON.parse(), Function constructor를 사용하거나, 로직을 리팩토링하세요.',
    ref: 'https://owasp.org/Top10/A03_2021-Injection/',
  },
  {
    key: 'new-function',
    name: 'new Function() Usage',
    pattern: /new\s+Function\s*\(/g,
    severity: 'critical',
    description:
      'new Function()은 문자열을 코드로 실행합니다. eval()과 동일한 보안 위험이 있습니다.',
    fix: '동적 코드 실행이 필요한 경우, 안전한 대안을 찾거나 입력을 철저히 검증하세요.',
    ref: 'https://owasp.org/Top10/A03_2021-Injection/',
  },
  {
    key: 'setTimeout-string',
    name: 'setTimeout/setInterval with string',
    pattern: /(?:setTimeout|setInterval)\s*\(\s*['"`][^'"`]+['"`]/g,
    severity: 'high',
    description:
      'setTimeout/setInterval에 문자열을 전달하면 eval()처럼 동작합니다.',
    fix: '문자열 대신 함수를 전달하세요: setTimeout(() => { ... }, 1000)',
    ref: 'https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#security',
  },

  // XSS 취약점
  {
    key: 'dangerouslySetInnerHTML',
    name: 'dangerouslySetInnerHTML',
    pattern: /dangerouslySetInnerHTML\s*=/g,
    severity: 'warning',
    description:
      'dangerouslySetInnerHTML은 XSS 공격에 취약합니다. 신뢰할 수 없는 데이터를 사용하면 안 됩니다.',
    fix: '가능하면 텍스트 노드를 사용하세요. 필요한 경우 DOMPurify 등으로 HTML을 정화하세요.',
    ref: 'https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html',
  },
  {
    key: 'innerHTML',
    name: 'innerHTML Assignment',
    pattern: /\.innerHTML\s*=/g,
    severity: 'warning',
    description: 'innerHTML에 직접 값을 할당하면 XSS 공격에 취약합니다.',
    fix: 'textContent를 사용하거나, DOM API (createElement, appendChild)를 사용하세요.',
    ref: 'https://owasp.org/Top10/A03_2021-Injection/',
  },
  {
    key: 'outerHTML',
    name: 'outerHTML Assignment',
    pattern: /\.outerHTML\s*=/g,
    severity: 'warning',
    description: 'outerHTML에 직접 값을 할당하면 XSS 공격에 취약합니다.',
    fix: 'DOM API를 사용하여 요소를 안전하게 교체하세요.',
    ref: 'https://owasp.org/Top10/A03_2021-Injection/',
  },
  {
    key: 'document-write',
    name: 'document.write()',
    pattern: /document\.write\s*\(/g,
    severity: 'high',
    description:
      'document.write()는 XSS 공격에 취약하고, 페이지 전체를 덮어쓸 수 있습니다.',
    fix: 'DOM API를 사용하세요: document.getElementById(), createElement() 등',
    ref: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/write#security',
  },

  // 위험한 URL 패턴
  {
    key: 'javascript-url',
    name: 'javascript: URL',
    pattern: /(?:href|src)\s*=\s*['"`]javascript:/gi,
    severity: 'critical',
    description: 'javascript: URL은 코드 인젝션에 사용될 수 있습니다.',
    fix: '실제 URL을 사용하거나, 이벤트 핸들러를 사용하세요.',
    ref: 'https://owasp.org/Top10/A03_2021-Injection/',
  },
  {
    key: 'data-url-script',
    name: 'data: URL in script/iframe',
    pattern: /(?:<script|<iframe)[^>]*src\s*=\s*['"`]data:/gi,
    severity: 'critical',
    description:
      'data: URL은 script/iframe에서 악성 코드 실행에 사용될 수 있습니다.',
    fix: '외부 URL을 사용하거나, 인라인 스크립트가 필요하면 CSP를 설정하세요.',
    ref: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
  },

  // SQL 인젝션 가능성
  {
    key: 'sql-injection',
    name: 'String Concatenation in SQL',
    pattern: /(?:query|execute|raw)\s*\(\s*['"`].*?\$\{/g,
    severity: 'high',
    description:
      'SQL 쿼리에서 문자열 연결/템플릿 리터럴 사용은 SQL 인젝션에 취약합니다.',
    fix: '파라미터화된 쿼리(Prepared Statement)를 사용하세요.',
    ref: 'https://owasp.org/Top10/A03_2021-Injection/',
  },

  // 보안 헤더 미설정
  {
    key: 'fetch-credentials',
    name: 'Fetch without credentials',
    pattern: /fetch\s*\([^)]*\)\s*(?!.*credentials)/g,
    severity: 'info',
    description:
      'fetch() 호출에 credentials 옵션이 설정되지 않았습니다. CORS 요청 시 쿠키가 전송되지 않을 수 있습니다.',
    fix: '필요한 경우 credentials: "include" 또는 "same-origin"을 설정하세요.',
    ref: 'https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials',
  },

  // 안전하지 않은 랜덤
  {
    key: 'math-random-security',
    name: 'Math.random() for security',
    pattern: /Math\.random\(\).*(?:token|secret|key|password|id|uuid)/gi,
    severity: 'high',
    description:
      'Math.random()은 암호학적으로 안전하지 않습니다. 보안 목적으로 사용하면 안 됩니다.',
    fix: 'crypto.getRandomValues() 또는 crypto.randomUUID()를 사용하세요.',
    ref: 'https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues',
  },

  // 하드코딩된 보안 설정
  {
    key: 'disabled-security-check',
    name: 'Disabled Security Check',
    pattern:
      /(?:verify|validate|check|secure|auth)(?:Token|SSL|TLS|Certificate|Signature)?\s*[=:]\s*false/gi,
    severity: 'high',
    description: '보안 검증이 비활성화되어 있습니다.',
    fix: '프로덕션 환경에서는 보안 검증을 활성화하세요.',
    ref: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
  },
  {
    key: 'tls-reject-unauthorized',
    name: 'NODE_TLS_REJECT_UNAUTHORIZED',
    pattern: /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"`]?0['"`]?/g,
    severity: 'critical',
    description:
      'TLS 인증서 검증이 비활성화되어 있습니다. MITM 공격에 취약합니다.',
    fix: '이 설정을 제거하고, 올바른 인증서를 사용하세요.',
    ref: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
  },

  // Prototype Pollution
  {
    key: 'prototype-pollution',
    name: 'Prototype Pollution Risk',
    pattern: /\[.*\]\s*=.*(?:__proto__|constructor\.prototype|prototype)/g,
    severity: 'high',
    description: 'Prototype Pollution 공격에 취약한 코드 패턴입니다.',
    fix: 'Object.create(null) 또는 Map을 사용하고, 사용자 입력을 객체 키로 직접 사용하지 마세요.',
    ref: 'https://portswigger.net/web-security/prototype-pollution',
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

  if (targetLine.length > 80) {
    return targetLine.substring(0, 77) + '...';
  }
  return targetLine.trim();
};

/**
 * 주석 내 코드인지 확인
 */
const isInComment = (code: string, index: number): boolean => {
  // 해당 위치까지의 코드에서 주석 여부 확인
  const beforeIndex = code.substring(0, index);
  const currentLineStart = beforeIndex.lastIndexOf('\n') + 1;
  const currentLine = code.substring(currentLineStart).split('\n')[0] ?? '';

  // 한 줄 주석 체크
  const lineCommentIndex = currentLine.indexOf('//');
  if (lineCommentIndex !== -1 && lineCommentIndex < index - currentLineStart) {
    return true;
  }

  // 블록 주석 체크 (간단한 버전)
  const lastBlockCommentStart = beforeIndex.lastIndexOf('/*');
  const lastBlockCommentEnd = beforeIndex.lastIndexOf('*/');
  if (lastBlockCommentStart > lastBlockCommentEnd) {
    return true;
  }

  return false;
};

/**
 * Sanitizer 함수 패턴 목록
 * 이 패턴이 같은 라인에 있으면 dangerouslySetInnerHTML/innerHTML 경고를 제외
 */
const SANITIZER_PATTERNS = [
  /DOMPurify\.sanitize/i,
  /\bsanitize\s*\(/i,
  /\bpurify\s*\(/i,
  /\bsanitizeHtml\s*\(/i,
  /\bxss\s*\(/i,
  /\bescapeHtml\s*\(/i,
];

/**
 * 라인에 sanitizer 함수가 포함되어 있는지 확인 (인라인 체크)
 */
const hasSanitizerInline = (line: string): boolean =>
  SANITIZER_PATTERNS.some((p) => p.test(line));

/**
 * 주어진 인덱스가 포함된 전체 라인을 추출
 */
const getFullLine = (code: string, index: number): string => {
  const start = code.lastIndexOf('\n', index) + 1;
  const end = code.indexOf('\n', index);
  return code.substring(start, end === -1 ? code.length : end);
};

/**
 * 코드에서 sanitizer로 할당된 변수명들을 추출
 *
 * 예시:
 * const a = DOMPurify.sanitize(html);  → 'a'
 * let cleaned = sanitize(content);     → 'cleaned'
 * const { __html: safe } = { __html: purify(data) };  → 'safe'
 */
const extractSanitizedVariables = (code: string): Set<string> => {
  const variables = new Set<string>();

  // 패턴 1: const/let/var name = sanitizer(...)
  const assignmentPattern =
    /(?:const|let|var)\s+(\w+)\s*=\s*(?:DOMPurify\.sanitize|sanitize|purify|sanitizeHtml|xss|escapeHtml)\s*\(/gi;

  let match;
  while ((match = assignmentPattern.exec(code)) !== null) {
    if (match[1]) {
      variables.add(match[1]);
    }
  }

  // 패턴 2: 재할당 name = sanitizer(...)
  const reassignPattern =
    /(\w+)\s*=\s*(?:DOMPurify\.sanitize|sanitize|purify|sanitizeHtml|xss|escapeHtml)\s*\(/gi;

  while ((match = reassignPattern.exec(code)) !== null) {
    if (match[1] && !['const', 'let', 'var'].includes(match[1])) {
      variables.add(match[1]);
    }
  }

  return variables;
};

/**
 * dangerouslySetInnerHTML={{ __html: variable }} 에서 variable 추출
 */
const extractInnerHTMLVariable = (line: string): string | null => {
  // dangerouslySetInnerHTML={{ __html: varName }}
  const dangerousMatch = line.match(
    /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(\w+)\s*\}\s*\}/,
  );
  if (dangerousMatch?.[1]) {
    return dangerousMatch[1];
  }

  // .innerHTML = varName
  const innerHTMLMatch = line.match(/\.innerHTML\s*=\s*(\w+)\s*[;,\n]/);
  if (innerHTMLMatch?.[1]) {
    return innerHTMLMatch[1];
  }

  return null;
};

/**
 * 변수가 sanitizer로 생성된 것인지 확인
 */
const isSanitizedVariable = (
  variableName: string,
  sanitizedVars: Set<string>,
): boolean => sanitizedVars.has(variableName);

/**
 * Sanitizer 체크가 필요한 패턴인지 확인
 */
const SANITIZER_CHECK_PATTERNS = [
  'dangerouslySetInnerHTML',
  'innerHTML Assignment',
];

/**
 * 스캔 제외 패턴 목록
 */
const SKIP_PATTERNS = [
  '.test.',
  '.spec.',
  '__tests__',
  '__mocks__',
  '/scanners/',
  '\\scanners\\',
  '/client/',
  '\\client\\',
  '/vulnerability/',
  '\\vulnerability\\',
];

/**
 * 스캔 제외 대상 파일인지 확인
 */
const shouldSkipFile = (filePath: string): boolean =>
  SKIP_PATTERNS.some((p) => filePath.includes(p)) || filePath.endsWith('.d.ts');

/**
 * 패턴 매칭 결과를 SecurityIssue로 변환
 */
const createIssue = (
  patternDef: PatternDef,
  code: string,
  filePath: string,
  matchIndex: number,
): SecurityIssue => {
  const { line, column } = getLocation(code, matchIndex);
  return {
    key: patternDef.key,
    title: patternDef.name,
    description: patternDef.description,
    severity: patternDef.severity,
    filePath,
    line,
    column,
    code: getCodeSnippet(code, line),
    fix: patternDef.fix,
    ref: patternDef.ref,
    scanner: 'dangerous',
  };
};

/**
 * 단일 패턴에 대해 코드 스캔 (sanitizedVars: 미리 추출된 sanitizer 변수 목록)
 */
const scanPattern = (
  patternDef: PatternDef,
  code: string,
  filePath: string,
  sanitizedVars: Set<string>,
): SecurityIssue[] => {
  const issues: SecurityIssue[] = [];
  const regex = new RegExp(patternDef.pattern.source, patternDef.pattern.flags);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (isInComment(code, match.index)) continue;

    // dangerouslySetInnerHTML, innerHTML 패턴에서 sanitizer 사용 시 스킵
    if (SANITIZER_CHECK_PATTERNS.includes(patternDef.name)) {
      const line = getFullLine(code, match.index);

      // 1. 인라인 sanitizer 체크 (같은 라인에 sanitizer 호출)
      if (hasSanitizerInline(line)) continue;

      // 2. 변수 추적 체크 (변수가 sanitizer로 생성된 경우)
      const varName = extractInnerHTMLVariable(line);
      if (varName && isSanitizedVariable(varName, sanitizedVars)) continue;
    }

    issues.push(createIssue(patternDef, code, filePath, match.index));
  }

  return issues;
};

/**
 * 위험 패턴 스캔 실행
 */
function scanDangerousPatterns(
  code: string,
  filePath: string,
): SecurityIssue[] {
  if (shouldSkipFile(filePath)) {
    return [];
  }

  // 파일 전체에서 sanitizer로 할당된 변수들을 미리 추출
  const sanitizedVars = extractSanitizedVariables(code);

  return DANGEROUS_PATTERNS.flatMap((pattern) =>
    scanPattern(pattern, code, filePath, sanitizedVars),
  );
}

/**
 * 위험 패턴 스캐너
 *
 * eval(), innerHTML, document.write() 등 보안 취약점을 일으킬 수 있는
 * 코드 패턴을 탐지합니다.
 */
export const dangerousScanner: Scanner = {
  name: 'dangerous',
  scan: scanDangerousPatterns,
};
