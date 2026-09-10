/**
 * Node's test runner strips types but does not read tsconfig's `paths`, so a
 * module under test that has a real (non-`import type`) `@/…` dependency
 * fails to resolve — every test file until now dodged this by only ever
 * reaching cross-file code through type-only imports. This hook does the one
 * thing tsconfig already declares: `@/x` -> `src/x`, extension added if the
 * specifier does not already end in `.ts`.
 */
const SRC = new URL('../src/', import.meta.url);

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const rel = specifier.slice(2);
    const withExt = rel.endsWith('.ts') ? rel : `${rel}.ts`;
    return nextResolve(new URL(withExt, SRC).href, context);
  }
  return nextResolve(specifier, context);
}
