import 'server-only';
import { createServerClient } from '@/lib/supabase/server';

export interface SessionUser {
  id: string;
  email: string;
}

/** The signed-in Supabase user for this request, or null. Never throws. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const { data } = await createServerClient().auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? '' } : null;
  } catch {
    return null;
  }
}
