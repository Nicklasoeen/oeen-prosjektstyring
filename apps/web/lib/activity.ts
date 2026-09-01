import type { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  supabase: SupabaseClient,
  entry: {
    workspaceId: string;
    userId: string;
    entityType: string;
    entityId: string;
    action: string;
  }
) {
  const { error } = await supabase.from("activity_log").insert({
    workspace_id: entry.workspaceId,
    user_id: entry.userId,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
  });

  if (error) {
    throw error;
  }
}
