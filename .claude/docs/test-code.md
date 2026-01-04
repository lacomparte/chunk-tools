# 테스트 코드 작성 가이드

## 목차

- [테스트 코드 작성 가이드](#테스트-코드-작성-가이드)
  - [목차](#목차)
  - [테스트 종류 선택 가이드](#테스트-종류-선택-가이드)
    - [선택 기준](#선택-기준)
  - [E2E 테스트 (Playwright)](#e2e-테스트-playwright)
    - [핵심 원칙](#핵심-원칙)
    - [파일 구조](#파일-구조)
    - [Fixture 패턴](#fixture-패턴)
    - [Page Object Model (POM) 패턴](#page-object-model-pom-패턴)
    - [테스트 작성 패턴](#테스트-작성-패턴)
    - [Mock 데이터 패턴](#mock-데이터-패턴)
    - [Dialog / Alert 처리](#dialog--alert-처리)
    - [실행 명령어](#실행-명령어)
    - [체크리스트](#체크리스트)
  - [유닛 테스트 (Vitest)](#유닛-테스트-vitest)
    - [설정](#설정)
    - [테스트 파일 위치](#테스트-파일-위치)
    - [컴포넌트 테스트 패턴](#컴포넌트-테스트-패턴)
    - [Custom Hook 테스트 패턴](#custom-hook-테스트-패턴)
    - [유틸 함수 테스트 패턴](#유틸-함수-테스트-패턴)
    - [모킹 전략](#모킹-전략)
    - [실행 명령어](#실행-명령어-1)
    - [체크리스트](#체크리스트-1)
  - [공통 원칙](#공통-원칙)
    - [1. 테스트 이름은 명확하게](#1-테스트-이름은-명확하게)
    - [2. AAA 패턴 준수](#2-aaa-패턴-준수)
    - [3. 테스트 격리](#3-테스트-격리)
    - [4. 테스트 데이터 팩토리 활용](#4-테스트-데이터-팩토리-활용)
    - [5. 쿼리 우선순위 (Testing Library 공식 가이드)](#5-쿼리-우선순위-testing-library-공식-가이드)

---

## 테스트 종류 선택 가이드

| 테스트 대상              | 테스트 종류 | 도구                | 예시                       |
| ------------------------ | ----------- | ------------------- | -------------------------- |
| 사용자 플로우 전체       | E2E         | Playwright          | 상품 구매, 장바구니 담기   |
| 컴포넌트 렌더링/인터랙션 | 통합/유닛   | Vitest + RTL        | 페이지 컴포넌트, 버튼 동작 |
| API 훅 (TanStack Query)  | 통합        | Vitest + MSW        | Query/Mutation 동작        |
| 유틸 함수, 순수 로직     | 유닛        | Vitest              | 가격 포맷팅, 데이터 변환   |
| Custom Hooks             | 유닛        | Vitest + renderHook | useProductDetail, useCart  |

### 선택 기준

```
사용자의 행동을 브라우저에서 직접 테스트해야 하는가?
├── YES -> E2E 테스트 (Playwright)
└── NO -> 유닛/통합 테스트 (Vitest)
         ├── React 컴포넌트인가? -> RTL 통합 테스트
         ├── 순수 함수인가? -> 유닛 테스트
         └── Custom Hook인가? -> 유닛 테스트
```

---

## E2E 테스트 (Playwright)

### 핵심 원칙

1. **BDD 스타일**: 사용자 관점의 시나리오로 작성
2. **Given-When-Then**: 명확한 구조로 테스트 단계 분리
3. **Fixtures + POM**: 재사용 가능한 테스트 구조 활용

### 파일 구조

```
apps/{app-name}/e2e/
├── fixtures/
│   └── {app}-fixtures.ts     # 커스텀 Fixture 정의
├── mock/
│   └── api/                  # API 경로 기반 Mock 데이터
│       ├── {domain}.ts       # 기본 Factory 함수
│       └── {domain}-states.ts # 상태별 프리셋 함수
├── page/
│   ├── {Page}Page.ts         # 메인 Page Object Model
│   └── components/           # 컴포넌트별 POM (선택)
└── {platform}/
    └── {feature}.test.ts     # 테스트 파일
```

### Fixture 패턴

> https://playwright.dev/docs/test-fixtures

```typescript
// fixtures/{app}-fixtures.ts
import { test as base } from '@playwright/test';
import { PageHelper } from '@/e2e/page/PageHelper';

type AppFixtures = {
  pageHelper: PageHelper;
  appPage: Page; // 앱 환경 시뮬레이션
};

export const test = base.extend<AppFixtures>({
  // 기본 page에 공통 모킹 적용 (GTM, 팝업 등)
  page: async ({ page }, use) => {
    await page.route('**/www.googletagmanager.com/**', (route) =>
      route.fulfill({ status: 200, body: 'window.dataLayer=[];' }),
    );
    await use(page);
  },

  // Page Object Model 헬퍼
  pageHelper: async ({ page }, use) => {
    await use(new PageHelper(page));
  },

  // 앱 환경 (User-Agent, viewport 설정)
  appPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 ... device=app;device_kind=ios;',
      viewport: { width: 375, height: 667 },
    });
    await use(await context.newPage());
    await context.close();
  },
});

/**
 * expect를 재 export하여 동일한 파일에서 import 가능하도록 함
 */
export { expect } from '@playwright/test';
```

### Page Object Model (POM) 패턴

> https://playwright.dev/docs/pom

```typescript
// page/PageHelper.ts
export class PageHelper {
  constructor(readonly page: Page) {}

  // Locator는 getter로 정의
  get submitButton() {
    return this.page.getByRole('button', { name: '확인' });
  }

  // 복잡한 인터랙션은 메서드로 추출
  async login(email: string, password: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.submitButton.click();
  }

  // 정적 헬퍼 (쿠키 설정 등)
  static async setAuthCookie(page: Page) {
    await page.context().addCookies([{ name: 'token', value: 'test', domain: 'local.musinsa.com', path: '/' }]);
  }
}
```

### 테스트 작성 패턴

```typescript
import { expect, test } from '@/e2e/fixtures/{app}-fixtures';
import { createMockData, soldOutState } from '@/e2e/mock/api/{domain}';

test.describe('사용자는 상품을 구매한다', () => {
  test('정상 상품의 구매 버튼이 활성화된다', async ({ page, pageHelper }) => {
    // Given: API 모킹
    await page.route('**/api/products/*', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify(createMockData()) }),
    );

    // When: 페이지 접속
    await page.goto('https://local.musinsa.com:3000/products/123');

    // Then: 버튼 상태 확인
    await expect(pageHelper.buyButton).toBeEnabled();
  });

  test('품절 상품은 구매할 수 없다', async ({ page, pageHelper }) => {
    // Given: 품절 상태 모킹
    await page.route('**/api/products/*', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify(soldOutState()) }),
    );

    await page.goto('https://local.musinsa.com:3000/products/123');

    // Then
    await expect(pageHelper.soldoutButton).toBeVisible();
    await expect(pageHelper.soldoutButton).toBeDisabled();
  });
});
```

### Mock 데이터 패턴

```typescript
// mock/api/{domain}.ts - 기본 Factory
export const createMockData = (overrides = {}) => ({
  data: {
    id: 123,
    name: '테스트 상품',
    status: 'SALE',
    ...overrides,
  },
});

// mock/api/{domain}-states.ts - 상태별 프리셋
export const soldOutState = () => createMockData({ status: 'SOLDOUT' });
export const memberOnlyState = () => createMockData({ isMemberOnly: true });
```

### Dialog / Alert 처리

```typescript
test('에러 시 알림이 표시된다', async ({ page }) => {
  let alertMessage = '';
  page.on('dialog', async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });

  // ... 에러 유발 액션

  expect(alertMessage).toContain('오류가 발생했습니다');
});
```

### 실행 명령어

```bash
pnpm test:e2e {path}              # 특정 파일 실행
pnpm test:e2e:ui                  # UI 모드 (디버깅)
pnpm test:e2e --headed            # 브라우저 표시
```

### 체크리스트

- [ ] `import { expect, test } from '@/e2e/fixtures/{app}-fixtures'`
- [ ] describe: "사용자는 ~한다" 형식
- [ ] test: 구체적 행동 + 기대 결과 (한글)
- [ ] Given-When-Then 주석
- [ ] API 모킹: `page.route()` + Factory 함수
- [ ] POM 활용: `pageHelper.{element/method}`
- [ ] 파일명: `*.test.ts`

---

## 유닛 테스트 (Vitest)

### 설정

```
apps/pdp/
├── vitest.config.ts          # Vitest 설정
└── test/
    ├── setup.ts              # 테스트 환경 설정
    ├── utils/
    │   └── test-utils.tsx    # 테스트 유틸리티
    └── mocks/
        └── detail.mock.ts    # Mock 데이터 팩토리
```

### 테스트 파일 위치

```
# 컴포넌트: 같은 디렉토리 (권장)
apps/pdp/pc/src/pages/components/
├── UsedProducts.tsx
└── UsedProducts.test.tsx

# 유틸 함수: 같은 디렉토리 (권장)
apps/pdp/shared/src/utils/
├── format-price.ts
└── format-price.test.ts

# 또는: test 폴더 내 미러링
apps/pdp/test/
├── pc/pages/components/UsedProducts.test.tsx
└── shared/utils/format-price.test.ts
```

### 컴포넌트 테스트 패턴

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/utils/test-utils';
import { createMockDetailData, createMockSoldOutProduct } from '@/test/mocks/detail.mock';

import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('렌더링', () => {
    it('상품명이 올바르게 표시되어야 한다', () => {
      const mockData = createMockDetailData({ goodsNm: '테스트 상품' });

      renderWithProviders(<ProductCard product={mockData} />);

      expect(screen.getByText('테스트 상품')).toBeInTheDocument();
    });

    it('가격이 포맷팅되어 표시되어야 한다', () => {
      const mockData = createMockDetailData({
        goodsPrice: { salePrice: 35000, normalPrice: 50000 },
      });

      renderWithProviders(<ProductCard product={mockData} />);

      expect(screen.getByText('35,000원')).toBeInTheDocument();
    });
  });

  describe('인터랙션', () => {
    it('장바구니 버튼 클릭 시 handleAddCart가 호출되어야 한다', async () => {
      const handleAddCart = vi.fn();
      const user = userEvent.setup();

      renderWithProviders(<ProductCard onAddCart={handleAddCart} />);

      await user.click(screen.getByRole('button', { name: '장바구니' }));

      expect(handleAddCart).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Custom Hook 테스트 패턴

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useProductDetail } from './useProductDetail';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useProductDetail', () => {
  it('상품 상세 정보를 반환해야 한다', async () => {
    const { result } = renderHook(() => useProductDetail('12345'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.goodsNo).toBe(12345);
  });

  it('로딩 상태를 올바르게 반영해야 한다', () => {
    const { result } = renderHook(() => useProductDetail('12345'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});
```

### 유틸 함수 테스트 패턴

```typescript
import { describe, it, expect } from 'vitest';

import { formatPrice, calculateDiscount } from './price-utils';

describe('formatPrice', () => {
  it('숫자를 천단위 콤마가 있는 문자열로 변환해야 한다', () => {
    expect(formatPrice(1000)).toBe('1,000');
    expect(formatPrice(1234567)).toBe('1,234,567');
  });

  it('0은 "0"으로 반환해야 한다', () => {
    expect(formatPrice(0)).toBe('0');
  });

  it('음수도 포맷팅해야 한다', () => {
    expect(formatPrice(-1000)).toBe('-1,000');
  });
});

describe('calculateDiscount', () => {
  it.each([
    [100000, 70000, 30],
    [50000, 45000, 10],
    [10000, 10000, 0],
  ])('정상가 %d, 판매가 %d일 때 할인율 %d%%를 반환해야 한다', (normal, sale, expected) => {
    expect(calculateDiscount(normal, sale)).toBe(expected);
  });
});
```

### 모킹 전략

**1. 훅 모킹**

```typescript
vi.mock('@/shared/hooks/api/useDetail', () => ({
  useDetail: () => ({ data: createMockDetailData() }),
}));
```

**2. API 모킹 (MSW 권장)**

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/goods/:goodsNo', () => {
    return HttpResponse.json({ data: createMockDetailData() });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**3. 하위 컴포넌트 모킹 (단위 테스트 시)**

```typescript
vi.mock('@/shared/modules/price/PriceDisplay', () => ({
  PriceDisplay: ({ price }: { price: number }) => (
    <span data-testid="price-display">{price.toLocaleString()}원</span>
  ),
}));
```

### 실행 명령어

```bash
# 전체 테스트 실행
pnpm test

# 특정 파일 테스트
pnpm test UsedProducts.test.tsx

# Watch 모드
pnpm test:watch

# 커버리지 리포트
pnpm test:coverage
```

### 체크리스트

- [ ] `describe` 블록으로 테스트 그룹화
- [ ] `beforeEach`에서 `vi.clearAllMocks()`
- [ ] `afterEach`에서 `vi.restoreAllMocks()`
- [ ] `renderWithProviders` 사용 (컴포넌트 테스트)
- [ ] `userEvent.setup()` 사용 (인터랙션 테스트)
- [ ] Mock 데이터는 팩토리 함수로 생성

---

## 공통 원칙

### 1. 테스트 이름은 명확하게

```typescript
// 좋은 예: 행동과 결과가 명확
it('장바구니 버튼 클릭 시 상품이 장바구니에 추가되어야 한다', () => {});
it('품절 상품은 구매 버튼이 비활성화되어야 한다', () => {});

// 나쁜 예: 모호하거나 기술적
it('버튼 클릭', () => {});
it('handleClick 호출됨', () => {});
```

### 2. AAA 패턴 준수

```typescript
it('할인 적용 시 할인가가 표시되어야 한다', () => {
  // Arrange (준비)
  const mockData = createMockDetailData({ discountRate: 30 });

  // Act (실행)
  renderWithProviders(<PriceDisplay data={mockData} />);

  // Assert (검증)
  expect(screen.getByText('30%')).toBeInTheDocument();
});
```

### 3. 테스트 격리

```typescript
// 각 테스트는 독립적으로 실행 가능해야 함
beforeEach(() => {
  vi.clearAllMocks();
  // 필요한 초기화
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup(); // RTL의 cleanup
});
```

### 4. 테스트 데이터 팩토리 활용

```typescript
// 좋은 예: 팩토리 함수로 필요한 필드만 오버라이드
const mockData = createMockDetailData({
  goodsPrice: { salePrice: 35000 },
});

// 나쁜 예: 전체 객체를 매번 하드코딩
const mockData = {
  goodsNo: 12345,
  goodsNm: '테스트',
  // ... 수십 개의 필드
};
```

### 5. 쿼리 우선순위 ([Testing Library 공식 가이드](https://testing-library.com/docs/queries/about/#priority))

```typescript
// ✅ 1순위: 접근성 역할 (Role) - 가장 권장
screen.getByRole('button', { name: '장바구니' });
screen.getByRole('heading', { name: '상품 정보' });

// ✅ 2순위: 폼 요소는 Label로
screen.getByLabelText('이메일');
screen.getByPlaceholderText('검색어를 입력하세요');

// ✅ 3순위: 텍스트 콘텐츠 (비대화형 요소)
screen.getByText('35,000원');
screen.getByAltText('상품 이미지');

// ⚠️ 4순위: Test ID (다른 방법이 불가능할 때만)
screen.getByTestId('product-price');

// ⚠️ 최대한 지향하지 않는 방법: CSS selector
container.querySelector('.price-wrapper');
```

> **왜 Role이 최우선인가?** 사용자(스크린 리더 포함)가 실제로 요소를 인식하는 방식과 가장 유사하기 때문입니다. `data-testid`는 사용자에게 보이지 않으므로 테스트가 구현 세부사항에 결합됩니다.
