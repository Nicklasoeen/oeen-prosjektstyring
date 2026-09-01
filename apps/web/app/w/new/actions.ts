"use server";

import { redirect } from "next/navigation";

import { getAuthUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isWorkspaceAccent } from "@/lib/workspace-accent";

function slugFromName(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  return `${base || "ws"}-${suffix}`;
}

export async function createWorkspace(formData: FormData) {
  const userId = await getAuthUserId();
  if (!userId) {
    redirect("/login?next=/w/new");
  }

  const name = String(formData.get("name") ?? "").trim();
  const colorAccent = String(formData.get("color_accent") ?? "").toUpperCase();

  if (!name || !isWorkspaceAccent(colorAccent)) {
    redirect("/w/new?error=invalid");
  }

  const supabase = await createClient();
  const { error: claimsError } = await supabase.auth.getClaims();
  if (claimsError) {
    redirect("/login?next=/w/new");
  }

  const slug = slugFromName(name);
  // Do not use INSERT ... RETURNING here: SELECT RLS is STABLE and cannot
  // see the owner row that on_workspace_created writes in the same statement.
  const { error } = await supabase.from("workspaces").insert({
    name,
    slug,
    color_accent: colorAccent,
  });

  if (error) {
    redirect(`/w/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/w/${slug}/dashboard`);
}
