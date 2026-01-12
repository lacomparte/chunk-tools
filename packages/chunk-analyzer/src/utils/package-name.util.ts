/**
 * 패키지명을 안전한 청크 이름으로 변환
 *
 * @scope/package-name → scope-package-name
 * react.production → react-production
 * lodash → lodash
 *
 * @param pkgName 패키지명 (예: '@tanstack/react-query')
 * @returns 안전한 이름 (예: 'tanstack-react-query')
 */
export const generateSafeName = (pkgName: string): string =>
  pkgName.replace(/^@/, '').replace(/\//g, '-').replace(/\./g, '-');
