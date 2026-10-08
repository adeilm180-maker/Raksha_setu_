import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();
  let authHeader: string | null = null;
  try {
    const headersList = await headers();
    authHeader = headersList.get("authorization") || headersList.get("Authorization");
  } catch {
    // headers() might not be available in some contexts
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: authHeader
        ? {
            headers: {
              Authorization: authHeader,
            },
          }
        : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component - safe to ignore when the
            // session is refreshed in proxy.ts / route handlers.
          }
        },
      },
    }
  );
}

export async function getUserRole(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role ?? null;
}

// getUser() throws AuthApiError when the browser holds a stale cookie
// whose refresh token no longer exists (e.g. user deleted from Auth).
// Server components should treat that as "not signed in", not crash.
export async function getSafeUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
