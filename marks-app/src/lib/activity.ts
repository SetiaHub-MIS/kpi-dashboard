import { requestKind } from '@/data/activity';
import { useActivity } from '@/store/useActivity';

/**
 * fetch for the Supabase client (lib/supabase.ts). Every request it makes —
 * tables, RPCs, sign-in, photos, the export — is counted in useActivity while
 * it is out, and that count is what the indicator at the top of the screen
 * shows. Nothing reaches the server without passing through here.
 */
export const trackedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : 'url' in input ? input.url : String(input);
  const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : undefined);
  const end = useActivity.getState().begin(requestKind(method, url));
  try {
    return await fetch(input, init);
  } finally {
    end();
  }
};
