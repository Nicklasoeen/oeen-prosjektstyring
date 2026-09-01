"use server";

import { redirect } from "next/navigation";

import { getAuthUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const WORKSPACE_TYPES = ["student", "enk", "job"] as const;

function isWorkspaceType(
  value: string
): value is (typeof WORKSPACE_TYPES)[number] {
  return (WORKSPACE_TYPES as readonly string[]).includes(value);
}

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
  const typeValue = String(formData.get("type") ?? "");

  if (!name || !isWorkspaceType(typeValue)) {
    redirect("/w/new?error=invalid");
  }

  const supabase = await createClient();
  const slug = slugFromName(name);
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      name,
      type: typeValue,
      slug,
    })
    .select("slug")
    .maybeSingle<{ slug: string }>();

  if (error || !data) {
    redirect(
      `/w/new?error=${encodeURIComponent(error?.message ?? "unknown")}`
    );
  }

  redirect(`/w/${data.slug}/dashboard`);
}
