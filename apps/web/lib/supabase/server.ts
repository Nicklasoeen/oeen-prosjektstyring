import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

export type AuthCookieCapture = {
  cookies: { name: string; value: string; options: CookieOptions }[];
  headers: Record<string, string>;
};

export function applyAuthCookies(
  response: NextResponse,
  capture: AuthCookieCapture
) {
  capture.cookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  Object.entries(capture.headers).forEach(([headerName, headerValue]) => {
    response.headers.set(headerName, headerValue);
  });
}

export async function createClient(capture?: AuthCookieCapture) {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; middleware refreshes the session.
        }
        if (capture) {
          capture.cookies.push(...cookiesToSet);
          capture.headers = headers;
        }
      },
    },
  });
}
