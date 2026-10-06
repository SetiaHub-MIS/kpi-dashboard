/**
 * For tests of a store: swaps the database client for stand-ins that record
 * what would have been written. Registered by the test file before it imports
 * the store; every other module resolves as usual (register-alias.mjs).
 */
const STUBS = {
  '@/lib/supabase': new URL('./stub-supabase.ts', import.meta.url).href,
  '@/lib/tugasan': new URL('./stub-lib-tugasan.ts', import.meta.url).href,
};

export function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
  return nextResolve(specifier, context);
}
