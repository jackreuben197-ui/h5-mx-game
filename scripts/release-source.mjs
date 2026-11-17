import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { relative, isAbsolute, sep } from 'node:path';

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();

/** Distinguish an independent checkout from files tracked by the MX repository.
 * A copied H5 directory may retain a broken .git pointer; query MX from its root.
 */
export function releaseSource(directory, mxRoot) {
  const source = realpathSync(directory), root = realpathSync(mxRoot);
  let repository;
  try { repository = realpathSync(git(source, 'rev-parse', '--show-toplevel')); } catch { /* Copied source or stale gitfile. */ }
  if (repository === source) return {
    kind: 'repository', commit: git(source, 'rev-parse', 'HEAD'),
    dirty: !!git(source, 'status', '--porcelain'),
  };
  const path = relative(root, source);
  if (path && path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path)) {
    const tracked = git(root, 'ls-files', '--stage', '--', path);
    if (tracked.split('\n').some(line => /^(100644|100755|120000) /.test(line))) return {
      kind: 'vendored', path, commit: git(root, 'rev-parse', 'HEAD'),
      dirty: !!git(root, 'status', '--porcelain', '--', path),
    };
  }
  // An explicitly supplied source archive has no verifiable Git revision.
  return { kind: 'directory', commit: null, dirty: null };
}
