# 팀 코딩 컨벤션 가이드

## 목차

- [팀 코딩 컨벤션 가이드](#팀-코딩-컨벤션-가이드)
  - [목차](#목차)
  - [1. 핵심 원칙 및 빠른 참조](#1-핵심-원칙-및-빠른-참조)
    - [1.1. 핵심 원칙](#11-핵심-원칙)
    - [1.2. 주요 컨벤션 요약 (빠른 참조)](#12-주요-컨벤션-요약-빠른-참조)
  - [2. 상세 코딩 컨벤션](#2-상세-코딩-컨벤션)
    - [2.1. 왜 코드 컨벤션을 지켜야 하는가?](#21-왜-코드-컨벤션을-지켜야-하는가)
    - [2.2. 중요 원칙 및 문화](#22-중요-원칙-및-문화)
    - [2.3. 구조](#23-구조)
      - [2.3.1. 폴더 구조 (`page-modules`)](#231-폴더-구조-page-modules)
      - [2.3.2. 정적 파일 디렉토리](#232-정적-파일-디렉토리)
    - [2.4. Export 방식](#24-export-방식)
    - [2.5. 네이밍](#25-네이밍)
      - [2.5.1. 축약어 없이 완전한 단어 사용](#251-축약어-없이-완전한-단어-사용)
      - [2.5.2. `camelCase`](#252-camelcase)
      - [2.5.3. Styled Components: 기능/위치 기반 이름](#253-styled-components-기능위치-기반-이름)
      - [2.5.4. Styled Component Props: `$` 접두사 사용](#254-styled-component-props--접두사-사용)
      - [2.5.5. 파일명](#255-파일명)
    - [2.6. 선언](#26-선언)
      - [2.6.1. 함수 인자](#261-함수-인자)
      - [2.6.2. 함수 선언: 화살표 함수 사용](#262-함수-선언-화살표-함수-사용)
      - [2.6.3. 비동기 동작: `async/await` 기본 사용](#263-비동기-동작-asyncawait-기본-사용)
    - [2.7. 컴포넌트](#27-컴포넌트)
      - [2.7.1. Props 타입: `${ComponentName}Props`](#271-props-타입-componentnameprops)
      - [2.7.2. 컴포넌트 내부 순서](#272-컴포넌트-내부-순서)
      - [2.7.3. Props 수신 방식](#273-props-수신-방식)
    - [2.8. 스타일링](#28-스타일링)
      - [2.8.1. Styled Components만 사용](#281-styled-components만-사용)
      - [2.8.2. 스타일 관련 Props 금지](#282-스타일-관련-props-금지)
      - [2.8.3. MDS Typography 사용법](#283-mds-typography-사용법)
    - [2.9. 메모이제이션 (`useMemo`, `useCallback`)](#29-메모이제이션-usememo-usecallback)
  - [3. ESLint 및 Prettier 규칙](#3-eslint-및-prettier-규칙)
    - [3.1. TypeScript 관련](#31-typescript-관련)
    - [3.2. Import 관련 규칙](#32-import-관련-규칙)
    - [3.3. React 관련 규칙](#33-react-관련-규칙)
    - [3.4. 접근성 (a11y) 규칙](#34-접근성-a11y-규칙)
    - [3.5. Prettier 설정](#35-prettier-설정)
    - [3.6. Tailwind CSS 정렬 (prettier-plugin-tailwindcss)](#36-tailwind-css-정렬-prettier-plugin-tailwindcss)
  - [4. 네이밍 컨벤션 세부 규칙](#4-네이밍-컨벤션-세부-규칙)
    - [4.1. 파일명 컨벤션](#41-파일명-컨벤션)
    - [4.2. 변수 및 함수명 패턴](#42-변수-및-함수명-패턴)
  - [5. 주석 및 문서화 규칙](#5-주석-및-문서화-규칙)
    - [5.1. JSDoc/TSDoc 사용](#51-jsdoctsdoc-사용)
    - [5.2. 인라인 주석 가이드](#52-인라인-주석-가이드)
  - [6. Git 컨벤션 (참고용)](#6-git-컨벤션-참고용)
    - [6.1. 커밋 메시지 패턴](#61-커밋-메시지-패턴)
    - [6.2. 브랜치 네이밍](#62-브랜치-네이밍)
  - [7. 자동화 도구 설정](#7-자동화-도구-설정)
    - [7.1. VS Code 설정 (권장)](#71-vs-code-설정-권장)
    - [7.2. package.json scripts](#72-packagejson-scripts)

---

이 프로젝트의 핵심 코딩 컨벤션을 정의합니다.

> **AI 어시스턴트를 위한 안내:**
> 당신은 이 문서에 정의된 코드 컨벤션을 철저히 따르는 AI 프로그래밍 어시스턴트입니다. 코드 생성, 리팩토링, 설명 등 모든 요청에 대해 아래 규칙을 최우선으로 적용해야 합니다. 모든 답변과 코드는 **항상 한국어**로 제공해 주세요.

## 1. 핵심 원칙 및 빠른 참조

### 1.1. 핵심 원칙

1. **일관성이 핵심입니다:** 사소한 스타일 선호보다 팀 전체의 가독성과 유지보수성을 위해 정해진 컨벤션을 따르는 것을 최우선으로 합니다.
2. **구조를 따르세요:** `page-modules`를 비롯한 모든 프로젝트 구조는 정의된 규칙을 준수합니다.
3. **세부 사항을 참조하세요:** 이 문서는 빠른 참조와 상세 설명을 모두 포함합니다. 특정 예시나 미묘한 차이가 궁금할 경우 상세 섹션을 확인하세요.
4. **함께 기여하고 업데이트하세요:** 컨벤션이 불분명하거나 개선이 필요하면 이슈를 제기하고 논의를 통해 이 문서를 업데이트합니다. 변경 사항은 팀 전체가 인지할 수 있도록 공유합니다.

### 1.2. 주요 컨벤션 요약 (빠른 참조)

- **폴더 구조 (`page-modules`):** `components`, `sections`, `hooks`, `utils`, `stores`, `constants`, `types`, `analytics`, `factories`. 정적 파일은 루트 `/assets` 또는 `/public/assets`에 위치.
- **네이밍:**
  - 축약어 없이 완전한 단어 사용.
  - 변수/함수/훅: `camelCase` (예: `useMyHook`).
  - React 컴포넌트: `PascalCase` (예: `MyComponent.tsx`).
  - 파일/폴더: `kebab-case` (예: `page-modules`, `string-converter.ts`).
  - `utils`, `constants` 등 폴더 내 파일은 폴더 유형을 이름에 포함 (예: `date.util.ts`).
  - Styled Components: `StyledButton` 대신 기능적 이름 사용 (`SubmitButton`). transient props는 `$` 접두사 사용 (`$isActive`).
- **Export:** 페이지는 `default export`, 그 외 모든 것은 `named export`.
- **선언:** 화살표 함수 (`const fn = () => {}`) 사용. 함수 인자는 3개 초과 시 객체 `{}` 사용. `async/await` 사용을 권장.
- **컴포넌트 구조:** Props 타입 정의 → 시그니처 → State/Refs → 함수 → Effects → JSX 반환 순서. Props는 기본적으로 구조 분해 할당.
- **스타일링:** `styled-components`만 사용. `style` prop 절대 사용 금지. 스타일 값(예: `marginTop`)을 props로 전달 금지. MDS `Typography`는 `variant` prop만 사용.
- **메모이제이션:** 다른 훅의 의존성 배열에 포함되거나 다른 컴포넌트에 props로 전달되는 함수/값은 `useCallback`/`useMemo` 필수 사용.

---

## 2. 상세 코딩 컨벤션

### 2.1. 왜 코드 컨벤션을 지켜야 하는가?

- **코드 읽기/쓰기 속도 향상:** 일관된 스타일은 코드를 예측 가능하게 만듭니다.
- **'무엇을'에 집중:** '어떻게' 표현할지에 대한 고민을 줄여 비즈니스 로직에 더 집중할 수 있습니다.
- **예측 가능한 구조:** 정해진 규칙에 따라 필요한 코드가 어디에 있을지 쉽게 찾고, 변수/함수 등을 예상하며 읽을 수 있습니다.

### 2.2. 중요 원칙 및 문화

- **일관성이 무엇보다 중요합니다:** 100점짜리 규칙을 70% 지키는 것보다 70점짜리 규칙을 100% 지키는 것이 더 좋습니다.
- **코드 리뷰와 업데이트:**
  - 코드 리뷰 시 컨벤션에 맞지 않는 코드가 있다면 정중하게 수정을 요청합니다.
  - 논의가 필요하면 이슈를 생성하고, 결정된 내용은 이 문서에 업데이트합니다.
  - 업데이트된 내용은 팀 전체가 알 수 있도록 공유합니다.
  - Lint로 강제할 수 있는 규칙은 ESLint 설정을 함께 업데이트합니다.

### 2.3. 구조

#### 2.3.1. 폴더 구조 (`page-modules`)

페이지 단위 모듈은 다음 구조를 따릅니다.

```
apps/
  └── search/                             # 페이지 이름 (kebab-case)
        ├── env/                          # 환경 변수 파일
        ├── cypress/                      # cypress 파일
        ├── mobile/                       # mobile 용 코드
        │     └── src/
        │          ├── pages/             # router 기반 wrapper 컴포넌트
        │          └── shared/            # mobile 공통 코드
        │                 ├── constants/  # mobile 공통 상수
        │                 └── hooks/      # mobile 공통 custom hooks
        ├── pc/                           # pc 용 코드
        │     └── src/
        │          ├── pages/             # router 기반 wrapper 컴포넌트
        │          └── shared/            # pc 공통 코드
        │                 ├── constants/  # pc 공통 상수
        │                 └── hooks/      # pc 공통 custom hooks
        └── shared/                       # mobile/pc 공통 코드
              └── src/
                  ├── @types/             # pc/mobile 공통 사용 함 - type
                  ├── apis/               # pc/mobile 공통 사용 함 - apis(endpoint 별로 분리함)
                  ├── constants/          # pc/mobile 공통 사용 함 - 상수
                  ├── context/            # pc/mobile 공통 사용 함 - contenxt api
                  ├── features/           # pc/mobile 공통 사용 함 - features 폴더
                  │      └── {folder}/    # pc/mobile 공통 사용 함 - features 컴포넌트 중 조합이 필요한 컴포넌트
                  ├── hooks/              # pc/mobile 공통 사용 함 - api hooks + 추가 로직 custom hooks
                  │      └── apis/        # pc/mobile 공통 사용 함 - @tanstack/react-query hooks
                  ├── log/                # router 기반 wrapper 컴포넌트
                  │      ├── apm/         # pc/mobile 공통 사용 함 - amplitude log
                  │      └── ga4/         # pc/mobile 공통 사용 함 - ga4 log
                  ├── modules/            # router 기반 wrapper 컴포넌트
                  │      └── ga4/         # pc/mobile 공통 사용 함 - mobile/src/pages, pc/src/pages 각각 사용하는 modules
                  ├── query-factories/    # router 기반 wrapper 컴포넌트 - query factories
                  ├── store/              # router 기반 wrapper 컴포넌트 - global store
                  ├── ui/                 # router 기반 wrapper 컴포넌트 - routes
                  └── utils/              # router 기반 wrapper 컴포넌트 - utils
```

**주의:**

- 유틸리티 함수나 상수를 컴포넌트 파일 내에 직접 정의하지 마세요.
- `query-factories/` 디렉토리 안에는 `*.factory.ts` 외의 다른 파일을 만들지 마세요.
- `ui/` 폴더의 순수 styled 컴포넌트는 style 만 선언합니다.
- `shared/modules/` 각 페이지 내에서만 의존성을 가져야 합니다.

#### 2.3.2. 정적 파일 디렉토리

- 로띠, 이미지 등 정적 리소스는 프로젝트 루트 레벨의 `/public/assets` 또는 `/src/assets` 디렉토리에 위치시킵니다.

### 2.4. Export 방식

- **페이지 컴포넌트:** `Default Export` 사용
  ```typescript
  const MysizePage = () => {
    /* ... */
  };
  export default MysizePage;
  ```
- **그 외 모든 것 (컴포넌트, 훅, 유틸, 상수 등):** `Named Exports` 사용
  ```typescript
  export const MenuItem = () => {
    /* ... */
  };
  export const useMyHook = () => {
    /* ... */
  };
  export const MY_CONSTANT = 'value';
  ```

### 2.5. 네이밍

#### 2.5.1. 축약어 없이 완전한 단어 사용

명확성을 위해 완전한 단어를 사용합니다.

```typescript
// O: 좋음
values.map(value => /* ... */);
const [likeCount, setLikeCount] = useState();
function getActiveIndex() { /* ... */ }

// X: 나쁨
values.map(v => /* ... */); // 'v'는 불명확함
const [likeCnt, setLikeCnt] = useState(); // 'Cnt'는 축약어
function getActiveIdx() { /* ... */ } // 'Idx'는 축약어
```

#### 2.5.2. `camelCase`

변수와 함수명에는 `camelCase`를 사용합니다.

```typescript
// O: 좋음
const likeCount;
function handleClick() {
  /* ... */
}

// X: 나쁨 (Snake_Case)
const like_count;
function handle_click() {
  /* ... */
}
```

#### 2.5.3. Styled Components: 기능/위치 기반 이름

`Styled` 접두사 대신 컴포넌트의 기능이나 위치를 나타내는 이름을 사용합니다.

**장점:** 코드 길이가 줄고, 이름만으로 컴포넌트의 역할을 명확히 알 수 있어 유지보수가 용이합니다.

```typescript
// O: 좋음 (기능적 이름)
import { Button } from "ui";
const Like = () => <S.LikeButton>좋아요</S.LikeButton>;
const S = {
  LikeButton: styled(Button)``;
}

// X: 나쁨 (일반적인 'Styled' 접두사)
import { Button } from "ui";
const Like = () => <StyledButton>좋아요</StyledButton>; // 어떤 버튼인지 불명확
const StyledButton = styled(Button)``; // styled 의 scope 를 예측하기 어려움
```

#### 2.5.4. Styled Component Props: `$` 접두사 사용

Styled Component에 전달하는 커스텀 props에는 `$` 접두사를 붙여야 합니다. 이는 불필요한 props가 실제 DOM 요소에 전달되는 것을 막아, 유효하지 않은 HTML 속성 경고를 피하고 DOM 구조를 깨끗하게 유지합니다.

```typescript
// '$' 접두사를 사용하여 transient prop으로 만듦
const Comp = styled.div<{ $isActive: boolean }>`
  color: ${props => (props.$isActive ? 'red' : 'black')};
`;

render(
  // $isActive는 DOM의 div 요소에 전달되지 않음
  <Comp $isActive={true} draggable="true">
    Styled Div
  </Comp>
);
```

#### 2.5.5. 파일명

| 구분                  | 케이스         | 확장자 | 예시                         | 비고                                  |
| :-------------------- | :------------- | :----- | :--------------------------- | :------------------------------------ |
| React 컴포넌트        | `PascalCase`   | `.tsx` | `LikeButton.tsx`             |                                       |
| React 훅              | `camelCase`    | `.ts`  | `useIntersectionObserver.ts` | `use`로 시작해야 함                   |
| query factory         | `name.factory` | `.ts`  | `some.factory.ts`            | `.factory`로 끝나야 함                |
| 그 외 (유틸, 상수 등) | `kebab-case`   | `.ts`  | `string-converter.ts`        |                                       |
| 폴더                  | `kebab-case`   | N/A    | `page-modules`, `components` |                                       |
| 폴더 내 파일          | `kebab-case`   | `.ts`  | `utils/date.util.ts`         | 폴더 유형을 이름에 포함 (`*.util.ts`) |

### 2.6. 선언

#### 2.6.1. 함수 인자

- **3개 이하:** 직접 나열합니다.
- **3개 초과:** **반드시** 객체 `{}`를 사용합니다.

**이유:** 인자가 너무 많으면 함수 호출 시 각 인자의 의미를 파악하기 어렵고, 순서를 착각하여 버그를 유발할 수 있습니다.

```typescript
// O: 좋음 (객체 인자)
interface UserCreationParams {
  name: string;
  age: number;
  email: string;
  isAdmin: boolean;
}
function createUser(params: UserCreationParams) {
  /* ... */
}

const newUser = { name: 'jy', age: 10, email: 'jy@musinsa.com', isAdmin: false };
createUser(newUser);

// X: 나쁨 (너무 많은 인자)
function createUser(name: string, age: number, email: string, isAdmin: boolean) {
  /* ... */
}
// 각 인자의 순서와 의미를 기억하기 어려움
createUser('jy', 10, 'jy@musinsa.com', false);
```

#### 2.6.2. 함수 선언: 화살표 함수 사용

일관성을 위해 화살표 함수를 사용합니다.

```typescript
// O: 좋음
const calculateTotal = (price: number, quantity: number): number => {
  return price * quantity;
};

// X: 나쁨
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}
```

#### 2.6.3. 비동기 동작: `async/await` 기본 사용

- 가독성을 위해 비동기 작업에는 기본적으로 `async/await`를 사용합니다.
- **예외:** `useEffect` 내에서 이벤트 리스너를 등록하는 등 특정 경우에 한해 1-depth의 `Promise().then()`을 허용합니다.
- **금지:** `Promise().then().then()`과 같이 2-depth 이상의 체이닝은 `async/await`로 변경합니다.

### 2.7. 컴포넌트

#### 2.7.1. Props 타입: `${ComponentName}Props`

컴포넌트의 props 타입 이름은 `${ComponentName}Props` 형식을 따릅니다.

#### 2.7.2. 컴포넌트 내부 순서

컴포넌트 내부 코드는 다음 순서를 따릅니다.

1. **Props 타입 정의** (`type ComponentProps = { ... }`)
2. **컴포넌트 함수 시그니처** (`const Component = (...) => { ... }`)
3. **상태 및 Ref 선언** (`useState`, `useMemo`, `useRef` 등)
4. **함수 선언** (`useCallback`, 이벤트 핸들러 등)
5. **Effect 훅** (`useEffect`, `useLayoutEffect`)
6. **JSX 반환**

```typescript
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';

// 1. Props 타입
type MyComponentProps = {
  id: string;
  onSubmit: (value: number) => void;
};

// 2. 컴포넌트 시그니처 & Props 핸들링
export const MyComponent = ({ id, onSubmit }: MyComponentProps) => {
  // 예외: props를 자식에게 그대로 넘길 때만 (props: Props) => <Child {...props} /> 형태 사용

  // 3. 상태와 Ref
  const [count, setCount] = useState(0);
  const processedId = useMemo(() => `processed-${id}`, [id]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 4. 함수
  const handleSubmit = useCallback(() => {
    onSubmit(count);
  }, [count, onSubmit]);

  // 5. Effects
  useEffect(() => {
    console.log(`Component ${processedId} mounted.`);
  }, [processedId]);

  // 6. JSX 반환
  return (
    <div>
      <p>ID: {processedId}</p>
      <input ref={inputRef} type="number" value={count} readOnly />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};
```

#### 2.7.3. Props 수신 방식

- **기본:** 구조 분해 할당을 사용합니다.
  ```typescript
  const Component = ({ a, b, c }: Props) => {
    /* ... */
  };
  ```
- **예외:** 수신한 props를 자식 컴포넌트에 그대로 전달할 때만 객체로 받습니다.
  ```typescript
  const Component = (props: Props) => {
    return <ChildComponent {...props} />;
  };
  ```

### 2.8. 스타일링

#### 2.8.1. Styled Components만 사용

- 모든 스타일링은 **Styled Components** 라이브러리로 통일합니다.
- **절대 `style` prop을 사용하지 않습니다.**

#### 2.8.2. 스타일 관련 Props 금지

`marginTop`, `color`와 같은 스타일 관련 값을 컴포넌트의 props로 직접 전달하지 마세요. 스타일 변형이 필요하다면 Styled Component 내부에서 (transient) props를 사용하거나 별도의 variant를 정의하여 처리합니다.

```typescript
// X: 나쁨 - 스타일 값을 props로 전달
type CustomButtonProps = {
  marginTop: number; // 스타일 관련 props 지양
};

// O: 좋음 - styled-component 내부에서 transient prop으로 처리
const S = {
  Button: styled.button<{ $marginTop?: number }>`
    margin-top: ${props => (props.$marginTop ? `${props.$marginTop}px` : '0')};
  `,
}

const CustomButton = ({ marginTop, ...rest }: { marginTop?: number }) => {
   return <StyledButton $marginTop={marginTop} {...rest} />;
};
```

#### 2.8.3. MDS Typography 사용법

사내 디자인 시스템(MDS)의 `Typography` 컴포넌트를 사용할 때는 **`variant` prop만 사용**합니다. `size`, `weight` prop을 직접 사용하지 않습니다.

```typescript
// O: 좋음
<Typography variant="body13med">텍스트</Typography>

// X: 나쁨
<Typography size="13" weight="medium">텍스트</Typography>
```

### 2.9. 메모이제이션 (`useMemo`, `useCallback`)

다음의 경우에는 `useMemo`와 `useCallback`을 **필수적으로 사용**합니다.

1. 다른 훅(`useEffect`, `useMemo` 등)의 **의존성 배열**에 포함되는 함수나 값.
2. 다른 컴포넌트(특히 `React.memo`로 감싸인)에 **props로 전달**되는 함수, 객체, 배열.

**이유:** 불필요한 리렌더링을 방지하고 성능을 최적화하기 위해 참조 동등성을 보장해야 합니다. 이는 `React.memo`, `useEffect` 등이 올바르게 동작하는 데 필수적입니다.

```typescript
import React, { useState, useCallback, useMemo, useEffect } from 'react';

// React.memo로 최적화된 자식 컴포넌트 예시
const MemoizedChild = React.memo(({ onClick, data }: { onClick: () => void; data: { value: string } }) => {
  console.log("자식 컴포넌트가 렌더링되었습니다.");
  return <button onClick={onClick}>데이터: {data.value}</button>;
});

function ProductPage({ productId }: { productId: string }) {
  const [count, setCount] = useState(0);

  // 필수 (1): 자식 컴포넌트에 props로 전달되는 함수
  const handleSubmit = useCallback(() => {
    // post(`apiEndpoint/${productId}`, { count });
  }, [productId, count]);

  // 필수 (2): 자식 컴포넌트에 props로 전달되는 객체
  const childData = useMemo(() => ({
    value: `상품 ${productId} 데이터`
  }), [productId]);

  // 필수 (3): 다른 훅의 의존성 배열에 사용되는 값
  const derivedValue = useMemo(() => {
    return productId.toUpperCase() + count;
  }, [productId, count]);

  useEffect(() => {
    // dataLogging(derivedValue);
  }, [derivedValue]); // useMemo로 참조 안정성을 보장해야 함.

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>증가</button>
      <MemoizedChild onClick={handleSubmit} data={childData} />
      <p>파생된 값: {derivedValue}</p>
    </div>
  );
}
```

---

## 3. ESLint 및 Prettier 규칙

### 3.1. TypeScript 관련

```typescript
// 권장: consistent-type-imports - 타입만 import 할 경우
import type { User, Product } from '@/types';

// 권장: consistnt-type-imports - 타입 + 컴포넌트 import 할 경우
import { User, type Product } from '@/UserProfile';

// 권장: no-unused-vars - 미사용 변수 처리
// '_'로 시작하는 변수는 허용
const handleSubmit = (_event: FormEvent, data: FormData) => {
  // _event는 사용하지 않지만 ESLint 에러 없음
};

// 권장: ban-types - {} 타입 허용, 다른 위험한 타입 금지
type Props = {
  data: {}; // 허용
  // data: Object; // 금지
};
```

### 3.2. Import 관련 규칙

```typescript
// 권장: import 순서 (실제 프로젝트 ESLint 설정 기반)
// 1. React, Next.js (builtin)
import React from 'react';
import { NextPage } from 'next';

// 2. 외부 라이브러리 (external)
import { useQuery } from '@tanstack/react-query';

// 3. @medusa 패키지 (internal)
import { Button } from '@medusa/ui';

// 4. 프로젝트 내부 경로 (parent/sibling)
import { useProduct } from '@/hooks';
import { formatPrice } from '@/utils';

// 권장: newline-after-import - import 후 빈 줄
import { useState } from 'react';

const Component = () => {
  // 여기에 빈 줄 필요
};

// 권장: prefer-inline type imports
import { type User, type Product } from '@/types';
```

### 3.3. React 관련 규칙

```typescript
// 권장: react-in-jsx-scope - React import 불필요 (Next.js)
// import React from 'react'; // 불필요

// 권장: jsx-filename-extension - .tsx 파일에서만 JSX 허용
// Component.tsx ✅
// Component.ts ❌ (JSX 포함 시)

// 권장: self-closing-comp - 자체 닫기 태그 사용
<Image src="/image.jpg" alt="설명" />
<div className="container" />

// 권장: jsx-curly-brace-presence - 불필요한 중괄호 제거
<Button disabled={false}>          // ❌
<Button disabled>                   // ✅

<div>{'Hello World'}</div>          // ❌
<div>Hello World</div>              // ✅

// 권장: jsx-max-props-per-line - 멀티라인에서 prop당 한 줄
<Button
  variant="primary"
  size="large"
  onClick={handleClick}
  disabled={isLoading}
>

// 권장: 권장된 import 패턴
// FC, PropsWithChildren 사용 권장
import { FC, PropsWithChildren } from 'react'; // ✅

// PropsWithChildren 의 내부 props 는 따로 정의
type Props = {
  name: string;
};

const Component: FC<PropsWithChildren<Props>> = ({ name }) => {}
```

### 3.4. 접근성 (a11y) 규칙

```typescript
// 권장: alt-text - 이미지 대체 텍스트 필수
<img src="/product.jpg" alt="나이키 운동화" />

// 권장: anchor-has-content - 링크 내용 필수
<a href="/products">상품 보기</a>

// 권장: click-events-have-key-events - 클릭 이벤트에 키보드 이벤트 추가
<div
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabIndex={0}
>
  클릭 가능한 영역
</div>

// 권장: aria 속성 올바른 사용
<button aria-label="메뉴 열기" aria-expanded={isOpen}>
  <Icon name="menu" />
</button>
```

### 3.5. Prettier 설정

```typescript
// printWidth: 80 - 한 줄 최대 80자
const longVariableName = someVeryLongFunctionName(
  parameter1,
  parameter2,
  parameter3
);

// tabWidth: 2 - 들여쓰기 2칸
if (condition) {
  doSomething();
}

// semi: true - 세미콜론 필수
const message = 'Hello World';

// singleQuote: true - 단일 따옴표 사용
const text = 'Hello World';
const jsx = <div className="container">Content</div>;

// trailingComma: 'all' - 후행 쉼표 사용
const config = {
  api: '/api/v1',
  timeout: 5000,
  retries: 3, // 후행 쉼표
};

const items = [
  'item1',
  'item2',
  'item3', // 후행 쉼표
];

// quoteProps: 'consistent' - 속성 따옴표 일관성
const obj1 = {
  'key-with-dash': 'value',
  'normalKey': 'value', // 하나라도 따옴표가 필요하면 모두 따옴표
};

const obj2 = {
  key1: 'value',
  key2: 'value', // 모두 따옴표 불필요하면 모두 제거
};

// bracketSameLine: false - JSX 브라켓 다음 줄
const element = (
  <Button
    variant="primary"
    onClick={handleClick}
  >
    클릭하세요
  </Button>
);
```

### 3.6. Tailwind CSS 정렬 (prettier-plugin-tailwindcss)

```typescript
// 자동으로 Tailwind 클래스 정렬
<div className="flex items-center justify-center p-4 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600">
  // 클래스가 자동으로 논리적 순서로 정렬됨
</div>
```

---

## 4. 네이밍 컨벤션 세부 규칙

### 4.1. 파일명 컨벤션

```typescript
// 컴포넌트 파일: PascalCase
ProductCard.tsx;
UserProfile.tsx;
ShoppingCart.tsx;

// Hook 파일: camelCase
useProductDetail.ts;
useShoppingCart.ts;
useAuthState.ts;

// 유틸 파일: camelCase 또는 kebab-case
formatPrice.ts;
validateEmail.ts;
apiClient.ts;
number - format.ts;

// 페이지 파일: kebab-case (Next.js Pages Router)
product - detail.tsx;
user - profile.tsx;
shopping - cart.tsx;

// 상수 파일: UPPER_SNAKE_CASE
API_ENDPOINTS.ts;
VALIDATION_RULES.ts;
```

### 4.2. 변수 및 함수명 패턴

```typescript
// Boolean 변수: is, has, can, should 접두사
const isLoading = false;
const hasPermission = true;
const canEdit = false;
const shouldUpdate = true;

// 이벤트 핸들러: handle 접두사
const handleClick = () => {};
const handleSubmit = () => {};
const handleInputChange = () => {};

// 상태 업데이트 함수: set 접두사
const [user, setUser] = useState(null);
const [isOpen, setIsOpen] = useState(false);

// API 관련 함수: 동사 + 명사
const fetchUserData = async () => {};
const createProduct = async () => {};
const updateOrderStatus = async () => {};

// 유틸 함수: 동사로 시작
const formatPrice = (price: number) => {};
const validateEmail = (email: string) => {};
const generateId = () => {};
```

---

## 5. 주석 및 문서화 규칙

### 5.1. JSDoc/TSDoc 사용

```typescript
/**
 * 상품 가격을 포맷팅합니다.
 * @param price - 포맷팅할 가격 (숫자)
 * @param currency - 통화 단위 (기본값: '원')
 * @returns 포맷팅된 가격 문자열
 * @example
 * formatPrice(1000) // '1,000원'
 * formatPrice(1000, '$') // '$1,000'
 */
const formatPrice = (price: number, currency = '원'): string => {
  return `${price.toLocaleString()}${currency}`;
};

/**
 * 상품 카드 컴포넌트
 * @param product - 표시할 상품 정보
 * @param onAddToCart - 장바구니 추가 핸들러
 */
type ProductCardProps = {
  product: Product;
  onAddToCart: (productId: string) => void;
};
```

### 5.2. 인라인 주석 가이드

```typescript
// 복잡한 비즈니스 로직에만 주석 추가
const calculateDiscountPrice = (price: number, discountRate: number) => {
  // 할인율이 50%를 초과하면 최대 50%로 제한
  const limitedRate = Math.min(discountRate, 0.5);

  return price * (1 - limitedRate);
};

// TODO, FIXME, NOTE 태그 활용
// TODO: 다국어 지원 추가 필요
// FIXME: 메모리 누수 이슈 해결 필요
// NOTE: 이 로직은 특정 브라우저에서만 동작함
```

---

## 6. Git 컨벤션 (참고용)

### 6.1. 커밋 메시지 패턴

```bash
# 형식: <issue-key> <commit-message-summary>
#       <commit-message-body>
#       Co-authored-by: <Author Name> <Author Email>

# 예시
FE-19134 feat: 상품 상세 페이지 추가
- 상품 정보 API 연동
- 이미지 갤러리 컴포넌트 구현
Co-authored-by: Claude <noreply@anthropic.com>

# 타입 목록
feat     # 새로운 기능
fix      # 버그 수정
style    # 스타일 수정 (코드 변경 없음)
refactor # 리팩토링
test     # 테스트 추가/수정
docs     # 문서 수정
chore    # 빌드, 설정 등 기타
```

### 6.2. 브랜치 네이밍

```bash
# 형식: <type>/<issue-key>-<description>

# 예시
feature/FE-19134-product-detail-page   # 기능 개발
fix/FE-19098-mobile-footer-layout      # 버그 수정
hotfix/FE-19134-critical-payment-bug   # 핫픽스
```

---

## 7. 자동화 도구 설정

### 7.1. VS Code 설정 (권장)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### 7.2. package.json scripts

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

---

이 컨벤션을 통해 팀 전체가 일관된 코드 스타일을 유지하고, 자동화된 도구를 활용해 코드 품질을 보장합니다.
