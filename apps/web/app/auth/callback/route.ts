import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isWorkspacePath, safeNextPath } from "@/lib/auth/paths";
import { firstWorkspaceSlugForUser } from "@/lib/auth/workspace-access";
import { getSiteUrl } from "@/lib/supabase/env";
import {
  applyAuthCookies,
  createClient,
  type AuthCookieCapture,
} from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const next = safeNextPath(cookieStore.get("auth_next")?.value ?? "/");

  cookieStore.delete("auth_next");

  const site = getSiteUrl();

  if (!code) {
    return NextResponse.redirect(`${site}/login?error=missing_code`);
  }

  const capture: AuthCookieCapture = { cookies: [], headers: {} };
  const supabase = await createClient(capture);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failed = NextResponse.redirect(
      `${site}/login?error=${encodeURIComponent(error.message)}`
    );
    applyAuthCookies(failed, capture);
    return failed;
  }

  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (!userId) {
    const failed = NextResponse.redirect(`${site}/login?error=session`);
    applyAuthCookies(failed, capture);
    return failed;
  }

  const slug = await firstWorkspaceSlugForUser(supabase, userId);
  const destination = isWorkspacePath(next)
    ? next
    : slug
      ? `/w/${slug}/dashboard`
      : "/w/new";

  const success = NextResponse.redirect(`${site}${destination}`);
  applyAuthCookies(success, capture);
  return success;
}
