export const extractPackageName = (path: string): string | null => {
  const pnpmMatch = path.match(/node_modules\/\.pnpm\/([^/]+)/);
  if (pnpmMatch) {
    return decodePnpmPackageName(pnpmMatch[1]);
  }

  const standardMatch = path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (!standardMatch) return null;

  return removeVersion(standardMatch[1]);
};

const decodePnpmPackageName = (encoded: string): string | null => {
  const decoded = encoded
    .replace(/\+/g, '/')
    .replace(/_/g, '/');

  if (decoded.startsWith('@')) {
    const parts = decoded.split('/');
    if (parts.length < 2) return null;
    const scopedName = `${parts[0]}/${parts[1]}`;
    return removeVersion(scopedName);
  }

  return removeVersion(decoded.split('/')[0]);
};

const removeVersion = (name: string): string =>
  name.replace(/@[\d.]+(-[a-zA-Z0-9.-]+)?$/, '');
