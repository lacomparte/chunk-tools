import type { AnalyzerOptions } from '../types/index.js';

export const DEFAULT_OPTIONS: Required<AnalyzerOptions> = {
  largePackageThreshold: 100 * 1024, // 100KB
  smallPackageThreshold: 5 * 1024,
  ignore: [],
  customGroups: {},
};
