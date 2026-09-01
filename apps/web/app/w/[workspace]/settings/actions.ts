"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireWorkspaceAccess } from "@/lib/auth/require-workspace";
import {
  encryptSecret,
  isAnthropicApiKey,
  keyLast4,
} from "@/lib/crypto-secret";

export async function saveAnthropicKey(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const key = String(formData.get("api_key") ?? "").trim();
  const { userId, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings`
  );

  if (!isAnthropicApiKey(key)) {
    redirect(`/w/${slug}/settings?error=invalid`);
  }

  const encrypted = encryptSecret(key);
  const last4 = keyLast4(key);

  const { data: existing } = await supabase
    .from("user_credentials")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "anthropic")
    .maybeSingle<{ id: string }>();

  if (existing) {
    const { error } = await supabase
      .from("user_credentials")
      .update({
        encrypted_key: encrypted,
        key_last4: last4,
      })
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("user_credentials").insert({
      user_id: userId,
      provider: "anthropic",
      encrypted_key: encrypted,
      key_last4: last4,
    });

    if (error) {
      throw error;
    }
  }

  revalidatePath(`/w/${slug}/settings`);
  revalidatePath(`/w/${slug}/dashboard`);
  redirect(`/w/${slug}/settings?saved=1`);
}

export async function deleteAnthropicKey(formData: FormData) {
  const slug = String(formData.get("workspace_slug") ?? "");
  const { userId, supabase } = await requireWorkspaceAccess(
    slug,
    `/w/${slug}/settings`
  );

  const { error } = await supabase
    .from("user_credentials")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "anthropic");

  if (error) {
    throw error;
  }

  revalidatePath(`/w/${slug}/settings`);
  revalidatePath(`/w/${slug}/dashboard`);
  redirect(`/w/${slug}/settings`);
}
