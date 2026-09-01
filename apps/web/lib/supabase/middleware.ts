import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { findMembershipForSlug } from "@/lib/auth/workspace-access";
import { getSiteUrl, getSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([headerName, headerValue]) => {
          supabaseResponse.headers.set(headerName, headerValue);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId =
    typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  const workspaceMatch = request.nextUrl.pathname.match(/^\/w\/([^/]+)/);
  if (!workspaceMatch) {
    return supabaseResponse;
  }

  const site = getSiteUrl();

  if (!userId) {
    const next = encodeURIComponent(request.nextUrl.pathname);
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(`${site}/login?next=${next}`)
    );
  }

  const slug = workspaceMatch[1];
  if (!slug) {
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(`${site}/unauthorized`)
    );
  }

  const membership = await findMembershipForSlug(supabase, userId, slug);
  if (!membership) {
    return copyCookies(
      supabaseResponse,
      NextResponse.redirect(`${site}/unauthorized`)
    );
  }

  return supabaseResponse;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  for (const headerName of ["Cache-Control", "Expires", "Pragma"]) {
    const value = from.headers.get(headerName);
    if (value) {
      to.headers.set(headerName, value);
    }
  }
  return to;
}
