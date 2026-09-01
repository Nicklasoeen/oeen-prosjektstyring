"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/auth/paths";
import { getSiteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const AUTH_NEXT_COOKIE = "auth_next";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? "/"));

  if (!email) {
    redirect("/login?error=missing");
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_NEXT_COOKIE, next, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
