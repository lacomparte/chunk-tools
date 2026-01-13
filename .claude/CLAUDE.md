# Discovery Frontend Development Guidelines

> **주요 문서 참조:** 상세 가이드라인은 `.claude/docs/` 폴더의 개별 문서를 참조하세요.

## 문서 구조

이 모노레포 저장소는 계층화된 문서 구조를 사용합니다. 작업 유형에 따라 필요한 문서를 참조하세요.

### 📚 문서 탐색 가이드

| 작업 유형                             | 참조 문서                           | 언제 읽어야 하나요?                             |
| ------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| **프로젝트 구조 파악**                | @.claude/docs/core-principles.md    | 모노레포 구조, 폴더 구조, 패키지 의존성 이해 시 |
| **코드 작성/리뷰**                    | @.claude/docs/coding-conventions.md | 컴포넌트 작성, 네이밍, 스타일링 규칙 확인 시    |
| **React/Next.js/TanStack Query 패턴** | @.claude/docs/react-nextjs-guide.md | TanStack Query, ErrorBoundary, Suspense 사용 시 |
| **UI 컴포넌트 구현**                  | @.claude/docs/mds-design-system.md  | MDS 컴포넌트, COLORS 토큰, Typography 사용 시   |
| **테스트 코드 작성**                  | @.claude/docs/test-code.md          | E2E(Playwright), 유닛(Vitest) 테스트 작성 시    |

---

## 핵심 규칙 요약

### 1. MDS 디자인 시스템 (필수)

```typescript
// 금지: @musinsa/mds 직접 import
import { Button } from '@musinsa/mds'; // ❌

// 권장: 프로젝트별 MDS 래핑 패키지 사용
import { Typography, Button, COLORS } from '{프로젝트_MDS_패키지}'; // ✅

// 모든 텍스트는 Typography 필수, colorScheme으로 색상 지정
<Typography variant="body13pxMed" colorScheme="black">텍스트</Typography>
```

### 2. TanStack Query 패턴

```typescript
// Query Factory 패턴 사용
export const sharedQueryFactory = {
  all: () => ['{서비스별 고유 key}'],
  product: (id: string) =>
    queryOptions({
      queryKey: [...sharedQueryFactory.all(), 'product', id],
      queryFn: () => fetchProduct(id),
    }),
};

// Custom Hook으로 래핑
export const useProduct = (id: string) =>
  useQuery(sharedQueryFactory.product(id));
```

### 3. 에러/로딩 처리 (필수)

**useSuspenseQuery 사용 시:**

```typescript
// 상위 컴포넌트에 Suspense + ApiErrorBoundary 필수
<ApiErrorBoundary>
  <Suspense fallback={<Skeleton />}>
    <ChildComponent /> {/* useSuspenseQuery 사용 */}
  </Suspense>
</ApiErrorBoundary>
```

**useQuery 사용 시:**

```typescript
// 컴포넌트 내부에서 isLoading, isError 명시적 처리 필수
const { data, isLoading, isError } = useProductDetail(id);

if (isLoading) return <Skeleton />;
if (isError) return <ErrorMessage />;

return <ProductInfo product={data} />;
```

### 4. 네이밍 컨벤션

| 구분          | 케이스         | 예시                  |
| ------------- | -------------- | --------------------- |
| 컴포넌트      | `PascalCase`   | `ProductCard.tsx`     |
| Hook          | `camelCase`    | `useProductDetail.ts` |
| Query Factory | `*.factory.ts` | `product.factory.ts`  |
| 유틸/상수     | `kebab-case`   | `format-price.ts`     |
| 폴더          | `kebab-case`   | `page-modules`        |

### 5. 컴포넌트 작성 순서

```typescript
// 1. Props 타입 정의
type ComponentProps = { id: string };

// 2. 컴포넌트 시그니처
export const Component = ({ id }: ComponentProps) => {
  // 3. State/Refs
  const [state, setState] = useState();

  // 4. 함수 (useCallback)
  const handleClick = useCallback(() => {}, []);

  // 5. Effects
  useEffect(() => {}, []);

  // 6. JSX 반환
  return <div />;
};
```

### 6. 스타일링 규칙

```typescript
// styled-components만 사용, style prop 금지
const S = {
  Button: styled.button<{ $isActive: boolean }>`
    color: ${({ $isActive }) => $isActive ? COLORS.black : COLORS.gray['500']};
  `,
};

// transient props는 $ 접두사 필수
<S.Button $isActive={true}>클릭</S.Button>
```

### 7. 함수 길이 제한

- **모든 함수는 25줄을 초과할 수 없음** (빈 줄, 주석 제외)
- ESLint `max-lines-per-function` 규칙 적용됨
- 25줄 초과 시 헬퍼 함수로 분리하여 단일 책임 원칙(SRP) 준수
- 코드 작성 완료 후 lint 검사로 확인 권장

---

## 프로젝트 구조

```
discovery-frontend/
├── apps/                # 독립 실행 가능한 애플리케이션
│   ├── home/           # 홈 페이지 (mobile/, pc/, shared/)
│   ├── search/         # 검색 페이지
│   ├── pdp/            # 상품 상세 페이지
│   └── ...
├── packages/           # 공유 라이브러리
│   ├── api-client/     # API 클라이언트
│   ├── hooks/          # 공통 훅
│   └── utils/          # 공통 유틸리티
└── libs/               # 특수 목적 라이브러리
```

**앱별 폴더 구조:**

```
apps/{app-name}/shared/src/
├── @types/           # 타입 정의
├── apis/             # API 엔드포인트
├── hooks/apis/       # TanStack Query 훅
├── query-factories/  # *.factory.ts 파일만
├── features/         # 기능별 컴포넌트
├── ui/               # 순수 styled 컴포넌트
└── utils/            # 유틸리티 함수
```

---

## 주요 스크립트

```bash
# 개발 서버
pnpm home:dev          # 홈 앱
pnpm search:dev        # 검색 앱

# 빌드
pnpm home:build
pnpm search:build:pc

# 린트
pnpm lint:fixAll
```

---

> **상세 내용이 필요하면** `.claude/docs/` 폴더의 해당 문서를 참조하세요.
