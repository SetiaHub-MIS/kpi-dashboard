/**
 * For tests of sign-in (src/lib/auth.ts): swaps the database client for a
 * stand-in holding one account, and the directory module (imported there for
 * a type name only) for a placeholder. Everything else resolves as usual.
 */
const STUBS = {
  '@/lib/supabase': new URL('./stub-supabase-auth.ts', import.meta.url).href,
  '@/data/users': new URL('./stub-users-types.ts', import.meta.url).href,
};

export function resolve(specifier, context, nextResolve) {
  if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
  return nextResolve(specifier, context);
}
