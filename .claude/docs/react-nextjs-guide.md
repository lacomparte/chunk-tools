# React/Next.js 개발 가이드

## 목차

- [React/Next.js 개발 가이드](#reactnextjs-개발-가이드)
  - [목차](#목차)
  - [적용 범위](#적용-범위)
  - [개발 환경 및 기술 스택](#개발-환경-및-기술-스택)
    - [핵심 기술](#핵심-기술)
    - [프로젝트 구조](#프로젝트-구조)
  - [코드 작성 원칙](#코드-작성-원칙)
    - [TypeScript 규칙](#typescript-규칙)
    - [컴포넌트 패턴](#컴포넌트-패턴)
    - [TanStack Query 패턴](#tanstack-query-패턴)
    - [커스텀 훅 계층 구조](#커스텀-훅-계층-구조)
  - [성능 최적화 (패션 커머스 특화)](#성능-최적화-패션-커머스-특화)
    - [코드 스플리팅 기준](#코드-스플리팅-기준)
    - [이미지 최적화](#이미지-최적화)
  - [테스트 전략](#테스트-전략)
    - [테스트 범위 우선순위](#테스트-범위-우선순위)
  - [코딩 컨벤션](#코딩-컨벤션)
    - [ESLint/Prettier 주요 규칙](#eslintprettier-주요-규칙)
    - [네이밍 컨벤션](#네이밍-컨벤션)
  - [접근성 및 SEO](#접근성-및-seo)
    - [웹 접근성 필수 요소](#웹-접근성-필수-요소)
    - [SEO 최적화 (Next.js Pages Router)](#seo-최적화-nextjs-pages-router)
  - [반응형 및 모바일 최적화](#반응형-및-모바일-최적화)
  - [에러 처리](#에러-처리)
    - [ErrorBoundary 패턴](#errorboundary-패턴)
    - [Suspense Query 바운더리 규칙 (필수)](#suspense-query-바운더리-규칙-필수)
      - [검증 규칙](#검증-규칙)
      - [올바른 패턴](#올바른-패턴)
      - [금지되는 패턴](#금지되는-패턴)
      - [바운더리 계층 구조](#바운더리-계층-구조)
      - [AI 코드 리뷰 체크리스트](#ai-코드-리뷰-체크리스트)
    - [useQuery 에러/로딩 처리 규칙 (필수)](#usequery-에러로딩-처리-규칙-필수)
      - [왜 별도 처리가 필요한가?](#왜-별도-처리가-필요한가)
      - [검증 규칙](#검증-규칙-1)
      - [올바른 패턴](#올바른-패턴-1)
      - [금지되는 패턴](#금지되는-패턴-1)
      - [허용되는 예외 패턴](#허용되는-예외-패턴)
      - [AI 코드 리뷰 체크리스트](#ai-코드-리뷰-체크리스트-1)
  - [개발 시 체크리스트](#개발-시-체크리스트)
    - [코드 생성 시 확인사항](#코드-생성-시-확인사항)
    - [컴포넌트 추상화 레벨](#컴포넌트-추상화-레벨)
  - [요청 대응 가이드](#요청-대응-가이드)

---

## 적용 범위

이 가이드는 기본 개발 원칙을 React/Next.js 환경에 적용한 구체적 지침입니다.

## 개발 환경 및 기술 스택

### 핵심 기술

- Framework: Next.js (Pages Router 기반, App Router 마이그레이션 준비)
- Language: TypeScript (필수)
- Data Fetching: TanStack Query (Custom Hooks 패턴)
- Styling: Styled-components + Tailwind CSS + MDS(디자인시스템)
- State Management: Context API (기본)
- Testing: Vitest + React Testing Library
- Package Manager: 모노레포 환경

### 프로젝트 구조

- 폴더 구조: 타입별 구조 (components, pages, hooks, utils)
- API 클라이언트: 별도 api-client 패키지 사용
- 에러 처리: ErrorBoundary HOC 패턴

## 코드 작성 원칙

### TypeScript 규칙

```typescript
// 권장: Props 타입 정의 - type 사용 (override 방지)
type ProductCardProps = {
  product: Product;
  onAddToCart: (productId: string) => void;
  variant?: 'default' | 'compact';
};

// 권장: 유니온, 조건부 타입 - type 사용
type ButtonVariant = 'primary' | 'secondary' | 'outline';
type ComponentProps<T> = T extends 'button' ? ButtonProps : LinkProps;

// 허용: interface가 유리한 경우
interface Repository {
  findById(id: string): Promise<Entity>;  // 클래스 구현(implements)용
}
declare module 'next' {
  interface NextApiRequest {              // 라이브러리 타입 확장 (선언 병합)
    user?: User;
  }
}

// 권장: 타입 import - 두 가지 방식 모두 허용
import { type User, type Product } from '@/types';
import type { Order, Cart } from '@/types';
```

### 컴포넌트 패턴

```typescript
// 권장: Props 기반 + MDS 조합 패턴
type CardProps = {
  header: string;
  body: string;
  variant?: 'default' | 'outlined';
  className?: string;
};

const Card = ({ header, body, variant = 'default', className }: CardProps) => {
  return (
    <MDSCard variant={variant} className={className}>
      <Typography variant="h3">{header}</Typography>
      <Typography>{body}</Typography>
    </MDSCard>
  );
};

// 권장: MDS + Styled-components 확장
const CustomCard = styled(MDSCard)`
  /* 필요시에만 확장 */
`;
```

### TanStack Query 패턴

```typescript
// api fetch
export type ProhibitionParameters = {
  keyword: string;
};

export type ProhibitionResponse = {
  isProhibit: boolean;
};

export const prohibitionRequest = httpsClient<ProhibitionResponse, ProhibitionParameters>({
  url: '/v1/keyword/prohibition/exist',
  apiClient: displayApi.requestGet,
});

// some.factories.ts
export const sharedQueryFactory = {
  all: () => ['{서비스별 고유 key}'],
  prohibition: (params: ProhibitionParameters) =>
    queryOptions({
      queryKey: [...sharedQueryFactory.all(), 'Prohibition', params.keyword],
      queryFn: () => prohibitionRequest({ params }),
      initialData: () => {
        if (window?.__MSS_FE__?.isProhibit !== undefined) {
          return {
            data: {
              isProhibit: window.__MSS_FE__.isProhibit,
            },
          };
        }
        return null;
      },
      enabled: !!params.keyword?.trim(),
    }),
  relationKeyword: (params: RelationKeywordParameters) =>
    queryOptions({
      queryKey: [...sharedQueryFactory.all(), 'relationKeyword', ...Object.values(params)],
      queryFn: () => relationKeywordRequest({ params }),
      placeholderData: keepPreviousData,
      select: (data) => data.data,
      enabled: !!params.keyword?.trim(),
    }),
  brandList: (params: BrandListParameters) =>
    queryOptions({
      queryKey: [...sharedQueryFactory.all(), 'brandList', ...Object.values(params)],
      queryFn: ({ signal }) => brandListRequest({ signal, params }),
      select: (data) => data.data,
    }),
};

// 권장: 기본 Query Hook 패턴
import { sharedQueryFactory } from '@shared/query-factories/shared.factory';
import { useQuery } from '@tanstack/react-query';

export const useRelationKeyword = (...[params]: Parameters<typeof sharedQueryFactory.relationKeyword>) =>
  useQuery(sharedQueryFactory.relationKeyword(params));

// 권장: 옵션이 있는 Query Hook
export const useProductList = (
  filters?: ProductFilters,
  options?: {
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
  },
) => {
  return useQuery({
    queryKey: ['product', 'list', filters],
    queryFn: () => sharedQueryFactory.getProductList(filters).then(({ data }) => data),
    select: ({ data }) => data,
    ...options,
  });
};
```

### 커스텀 훅 계층 구조

```typescript
// 1. 도메인별 (비즈니스 엔티티) - 단순 CRUD + 기본 비즈니스 로직
useProduct, useUser, useOrder, useBrand, useCategory;

// 2. 기능별 (공통 기능) - 재사용성 높은 유틸리티
useForm, usePagination, useDebounce, useLocalStorage;

// 3. 페이지별 (복합 비즈니스 로직) - 여러 도메인 조합
useProductDetailPage, useCartPage, useCheckoutPage;
```

## 성능 최적화 (패션 커머스 특화)

### 코드 스플리팅 기준

```typescript
// 1. Heavy 컴포넌트 (100KB+ 번들 크기)
const ImageGallery = dynamic(() => import('../components/ImageGallery'), {
  loading: () => <Skeleton height={400} />,
  ssr: false // 클라이언트에서만 필요한 경우
});

// 2. 조건부 렌더링 컴포넌트
const ProductReviewChart = dynamic(() => import('../components/ProductReviewChart'));

// 3. 외부 라이브러리 의존성이 큰 컴포넌트
const ImageEditor = dynamic(() => import('../components/ImageEditor'), {
  loading: () => <div>이미지 에디터 로딩중...</div>
});
```

### 이미지 최적화

```typescript
// 권장: MDS Image 컴포넌트 사용
import { Image } from '{프로젝트별_MDS_패키지}';

<Image
  src="/product-image.jpg"
  alt="상품 이미지"
  width={300}
  height={400}
  priority={isAboveFold}
  placeholder="blur"
/>
```

## 테스트 전략

### 테스트 범위 우선순위

```typescript
// 1. 유틸 함수 (필수)
// utils/formatPrice.test.ts
describe('formatPrice', () => {
  it('should format price with comma separator', () => {
    expect(formatPrice(1000)).toBe('1,000원');
  });
});

// 2. 커스텀 훅 (권장)
// hooks/useProduct.test.ts
describe('useProduct', () => {
  it('should fetch product data', async () => {
    // MSW 설정하여 테스트
  });
});

// 3. 컴포넌트 (계획)
// components/ProductCard.test.tsx

// 4. E2E (향후)
// e2e/product-purchase-flow.spec.ts
```

## 코딩 컨벤션

### ESLint/Prettier 주요 규칙

```typescript
// 권장: 타입 import 일관성
import { type User } from '@/types';

// 권장: React 컴포넌트 파일 확장자
// .tsx 파일에서만 JSX 허용

// 권장: Import 순서
import React from 'react';
import { NextPage } from 'next';

import { MDSButton } from '{프로젝트별_MDS_패키지}';

import { useProduct } from '@/hooks';
import { formatPrice } from '@/utils';

// 권장: 컴포넌트 함수 정의
const ProductCard = ({ product }: ProductCardProps) => {
  // 함수형 컴포넌트 선언식 또는 화살표 함수
};

// 권장: Props 구조분해할당
const { name, price, isAvailable } = product;

// 권장: 조건부 렌더링 - 불필요한 중괄호 제거
{isAvailable && <Button>구매하기</Button>}

// 권장: Self-closing 태그
<Image src="/image.jpg" alt="설명" />
```

### 네이밍 컨벤션

```typescript
// 권장: 컴포넌트: PascalCase
const ProductCard = () => {};

// 권장: 훅: use로 시작하는 camelCase
const useProductDetail = () => {};

// 권장: 상수: UPPER_SNAKE_CASE
const API_ENDPOINTS = {};

// 권장: 변수/함수: camelCase
const isAvailable = true;
const handleClick = () => {};

// 권장: 타입: PascalCase
type ProductCardProps = {};
type ButtonVariant = 'primary' | 'secondary';

// 객체도 데이터로 사용되고 해당 key 나 value 가 type 으로 사용된다면 객체를 생성 후 생성된 객체 기반으로 type 을 생성합니다.
```

## 접근성 및 SEO

### 웹 접근성 필수 요소

```typescript
// 권장: 시맨틱 HTML 사용
<main>
  <section aria-labelledby="products-heading">
    <h2 id="products-heading">상품 목록</h2>
  </section>
</main>

// 권장: 대체 텍스트 제공
<Image src="/product.jpg" alt="나이키 에어맥스 운동화" />

// 권장: 키보드 네비게이션 지원
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  구매하기
</button>

// 권장: 적절한 색상 대비 (colorScheme 사용)
<Typography colorScheme="black">
```

### SEO 최적화 (Next.js Pages Router)

```typescript
// 권장: Head 태그 활용
import Head from 'next/head';

const ProductDetailPage: NextPage = ({ product }) => {
  return (
    <>
      <Head>
        <title>{product.name} | 무신사</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.name} />
        <meta property="og:image" content={product.imageUrl} />
      </Head>
      <main>
        {/* 페이지 내용 */}
      </main>
    </>
  );
};
```

## 반응형 및 모바일 최적화

```typescript
// 권장: Tailwind 반응형 클래스 활용
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// 권장: MDS breakpoint 토큰 사용
const ResponsiveCard = styled(MDSCard)`
  @media (max-width: ${theme.breakpoints.mobile}) {
    padding: 16px;
  }
`;

// 권장: 모바일 퍼스트 접근
const MobileProductCard = () => {
  return (
    <Card className="p-4 md:p-6">
      <Typography variant="body2" className="md:text-lg">
        {product.name}
      </Typography>
    </Card>
  );
};
```

## 에러 처리

### ErrorBoundary 패턴

```typescript
// 권장: HOC 패턴으로 페이지 래핑
const ProductPageWithErrorBoundary = withErrorBoundary(ProductPage, {
  fallback: <ErrorFallback />,
  onError: (error) => {
    console.error('Product page error:', error);
  },
});

// 권장: TanStack Query 에러 처리
const { data, error, isError } = useProductDetail(productId);

if (isError) {
  return <ErrorMessage error={error} />;
}
```

### Suspense Query 바운더리 규칙 (필수)

`useSuspenseQuery`, `useSuspenseQueries`를 사용하는 훅을 포함한 컴포넌트는 **반드시** 상위 컴포넌트에서 `Suspense`와 `ApiErrorBoundary`로 감싸야 합니다.

#### 검증 규칙

- `useSuspenseQuery` 또는 `useSuspenseQueries`를 사용하는 커스텀 훅을 호출하는 컴포넌트가 있다면:
  1. **파일 내 검색**: 해당 컴포넌트를 사용하는 부모 컴포넌트 파일에서 `<Suspense>`와 `<ApiErrorBoundary>` JSX 태그 존재 확인
  2. **임포트 확인**: `import { Suspense } from 'react'`와 `ApiErrorBoundary` 임포트 여부 확인
  3. **계층 구조 검증**: 코드 흐름상 `<ApiErrorBoundary>` → `<Suspense>` → 해당 컴포넌트 순서인지 확인
  4. 두 바운더리가 모두 없다면 **코드 리뷰 시 반드시 지적**

#### 올바른 패턴

```typescript
// 상위 컴포넌트 (Parent)
import { Suspense } from 'react';
import { ApiErrorBoundary } from '@shared/features/ErrorBoundary';

const ParentComponent = () => {
  return (
    <ApiErrorBoundary>
      <Suspense fallback={<LoadingSkeleton />}>
        <ChildComponent />
      </Suspense>
    </ApiErrorBoundary>
  );
};

// 하위 컴포넌트 (Child) - useSuspenseQuery 사용
const ChildComponent = () => {
  const { data } = useProductRanking(); // 내부에서 useSuspenseQuery 사용
  return <ProductList products={data} />;
};
```

#### 금지되는 패턴

```typescript
// ❌ 금지: Suspense 없이 useSuspenseQuery 사용
const BadComponent = () => {
  const { data } = useProductRanking(); // useSuspenseQuery 사용 훅
  return <div>{data.title}</div>;
};

// 상위에서 Suspense/ApiErrorBoundary 없이 호출
const ParentWithoutBoundary = () => {
  return <BadComponent />; // 런타임 에러 발생 가능
};
```

#### 바운더리 계층 구조

```
ApiErrorBoundary (에러 캐치)
  └── Suspense (로딩 상태 처리)
        └── Component (useSuspenseQuery 사용)
```

**주의사항:**

- `ApiErrorBoundary`는 `Suspense`보다 **상위**에 위치해야 합니다.
- 여러 Suspense Query를 사용하는 경우, 각각을 개별 `Suspense`로 감싸거나 하나의 `Suspense`로 묶을 수 있습니다.
- `ApiErrorBoundary`는 `QueryErrorResetBoundary`를 포함하므로 에러 발생 시 재시도 기능을 제공합니다.

#### AI 코드 리뷰 체크리스트

코드 생성 및 리뷰 시 다음을 **필수 확인**합니다:

- [ ] **훅 사용 식별**: 파일 내에서 `useSuspenseQuery` 또는 `useSuspenseQueries`를 직접 호출하거나, 이들을 사용하는 커스텀 훅(예: `useProductRanking`)을 호출하는 컴포넌트 식별
- [ ] **상위 Suspense 확인**: 해당 컴포넌트를 렌더링하는 부모 컴포넌트 파일에서 `<Suspense fallback={...}>` JSX 태그 존재 여부 확인
- [ ] **상위 ApiErrorBoundary 확인**: `<Suspense>` 외부(상위)에 `<ApiErrorBoundary>` 태그 존재 여부 확인
- [ ] **계층 순서 검증**: `ApiErrorBoundary > Suspense > Component` 계층 구조가 올바른지 확인
- [ ] **바운더리 누락 시 지적**: 위 바운더리 중 하나라도 없다면 인라인 코멘트로 지적하고, 올바른 패턴 예시 제공

### useQuery 에러/로딩 처리 규칙 (필수)

`useQuery`, `useQueries`를 사용하는 컴포넌트는 **반드시** 컴포넌트 내부에서 `isLoading`, `isError` 상태를 명시적으로 처리해야 합니다.

#### 왜 별도 처리가 필요한가?

- `useQuery`는 에러를 **throw하지 않고 상태로 반환**합니다 (`error`, `isError`)
- 따라서 `ErrorBoundary`가 자동으로 에러를 캐치하지 **않습니다**
- 로딩 상태도 `Suspense`가 처리하지 않으므로 직접 처리해야 합니다

#### 검증 규칙

- `useQuery` 또는 `useQueries`를 사용하는 컴포넌트가 있다면:
  1. **로딩 상태 처리 확인**: `isLoading` 또는 `isPending` 체크 후 로딩 UI 반환 여부 확인
  2. **에러 상태 처리 확인**: `isError` 또는 `error` 체크 후 에러 UI 반환 여부 확인
  3. **조기 반환 패턴**: 로딩/에러 처리가 데이터 사용 코드보다 **먼저** 위치하는지 확인
  4. 로딩 또는 에러 처리가 누락되었다면 **코드 리뷰 시 반드시 지적**

#### 올바른 패턴

```typescript
// useQuery 사용 컴포넌트 - 로딩/에러 명시적 처리
const ProductDetail = ({ productId }: { productId: string }) => {
  const { data, isLoading, isError, error } = useProductDetail(productId);

  // 1. 로딩 상태 처리 (조기 반환)
  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  // 2. 에러 상태 처리 (조기 반환)
  if (isError) {
    return <ErrorMessage error={error} />;
  }

  // 3. 데이터 사용 (타입 안전하게 data 사용 가능)
  return <ProductInfo product={data} />;
};
```

#### 금지되는 패턴

```typescript
// ❌ 금지: 로딩/에러 처리 없이 data 직접 사용
const BadComponent = ({ productId }: { productId: string }) => {
  const { data } = useProductDetail(productId);

  // data가 undefined일 수 있음 - 런타임 에러 발생 가능
  return <div>{data.name}</div>;
};

// ❌ 금지: 로딩만 처리하고 에러 미처리
const PartialHandling = ({ productId }: { productId: string }) => {
  const { data, isLoading } = useProductDetail(productId);

  if (isLoading) return <Skeleton />;

  // 에러 발생 시 data가 undefined → 런타임 에러
  return <div>{data.name}</div>;
};
```

#### 허용되는 예외 패턴

```typescript
// ✅ 허용: enabled 옵션으로 조건부 fetch 시 초기 상태 처리
const ConditionalFetch = ({ productId }: { productId: string | null }) => {
  const { data, isLoading, isError } = useProductDetail(productId ?? '', {
    enabled: !!productId,  // productId가 있을 때만 fetch
  });

  // enabled=false일 때는 isLoading=false, data=undefined
  if (!productId) {
    return <EmptyState message="상품을 선택해주세요" />;
  }

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorMessage />;

  return <ProductInfo product={data} />;
};

// ✅ 허용: placeholderData 사용 시 로딩 UI 생략 가능
const WithPlaceholder = ({ productId }: { productId: string }) => {
  const { data, isError } = useProductDetail(productId, {
    placeholderData: DEFAULT_PRODUCT,  // 로딩 중에도 placeholder 표시
  });

  if (isError) return <ErrorMessage />;

  // placeholderData 덕분에 data는 항상 존재
  return <ProductInfo product={data} />;
};
```

**주의사항:**

- `useQuery`와 `useSuspenseQuery`는 에러 처리 방식이 **완전히 다릅니다**
- `useQuery`: 컴포넌트 내부에서 `isError` 상태로 직접 처리
- `useSuspenseQuery`: 상위 `ApiErrorBoundary`에서 자동 캐치
- 두 훅을 혼용할 때는 각각의 처리 방식을 올바르게 적용해야 합니다

#### AI 코드 리뷰 체크리스트

코드 생성 및 리뷰 시 다음을 **필수 확인**합니다:

- [ ] **훅 사용 식별**: 파일 내에서 `useQuery` 또는 `useQueries`를 직접 호출하거나, 이들을 사용하는 커스텀 훅을 호출하는 컴포넌트 식별
- [ ] **로딩 처리 확인**: `isLoading` 또는 `isPending` 체크 후 로딩 UI(Skeleton, Spinner 등) 반환 여부 확인
- [ ] **에러 처리 확인**: `isError` 체크 후 에러 UI(ErrorMessage, fallback 등) 반환 여부 확인
- [ ] **조기 반환 순서**: 로딩 → 에러 → 데이터 사용 순서로 조기 반환 패턴이 적용되었는지 확인
- [ ] **처리 누락 시 지적**: 로딩 또는 에러 처리가 누락되었다면 인라인 코멘트로 지적하고, 올바른 패턴 예시 제공

## 개발 시 체크리스트

### 코드 생성 시 확인사항

- [ ] MDS 컴포넌트 우선 사용했는가?
- [ ] 하드코딩된 색상 대신 COLORS 토큰 사용했는가?
- [ ] TypeScript 타입 정의가 적절한가?
- [ ] 웹 접근성 요소를 고려했는가? (alt, aria-label 등)
- [ ] 반응형 디자인이 적용되었는가?
- [ ] 성능 최적화를 고려했는가? (lazy loading, code splitting)
- [ ] TanStack Query 패턴을 올바르게 사용했는가?
- [ ] useQuery 사용 시 isLoading, isError 상태를 명시적으로 처리했는가?
- [ ] useSuspenseQuery 사용 시 상위에 Suspense + ApiErrorBoundary가 있는가?
- [ ] ESLint 규칙을 준수했는가?
- [ ] 적절한 테스트 코드가 필요한가?

### 컴포넌트 추상화 레벨

1. 페이지 레벨: 라우팅, 데이터 페칭, SEO 메타데이터 포함
2. 비즈니스 로직: 도메인별 커스텀 훅으로 최대한 추상화
3. 재사용 가능: MDS 기반 조합으로 프로젝트 전반에서 활용

## 요청 대응 가이드

사용자가 코드 생성을 요청할 때:

1. MDS 컴포넌트 우선 검토 - 기존 디자인시스템으로 해결 가능한지 확인
2. 타입 안전성 보장 - 모든 props와 상태에 적절한 TypeScript 타입 정의
3. 성능 고려 - 패션 커머스 특성상 성능이 중요함을 항상 염두
4. 접근성 필수 - 기본적인 웹 접근성 요소는 반드시 포함
5. 테스트 가능한 구조 - 유틸 함수나 복잡한 로직의 경우 테스트 코드 제안

이 가이드를 통해 일관되고 품질 높은 React/Next.js 코드를 생성하여 팀 전체의 개발 효율성과 코드 품질을 향상시킵니다.
