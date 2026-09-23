import type { RemoveTenantInput } from "./remove-tenant";
import { requireOperatorAdmin } from "./staff-admin.server";

async function removeTenantMedia(
  admin: Awaited<ReturnType<typeof requireOperatorAdmin>>["admin"],
  tenantId: string,
): Promise<void> {
  const { data: files, error } = await admin.storage.from("media").list(tenantId, {
    limit: 1000,
  });
  if (error || !files?.length) return;
  const paths = files
    .map((file) => file.name)
    .filter(Boolean)
    .map((name) => `${tenantId}/${name}`);
  if (paths.length === 0) return;
  await admin.storage.from("media").remove(paths);
}

export async function removeTenant(data: RemoveTenantInput): Promise<{ ok: true }> {
  const tenantId = data.tenantId.trim();
  if (!tenantId) throw new Error("Client is missing.");

  const { admin } = await requireOperatorAdmin(data.accessToken);

  const { data: tenant, error: tenantLookup } = await admin
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenantLookup) throw new Error("Could not look up that client.");
  if (!tenant) throw new Error("Client not found.");

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("tenant_id", tenantId);
  if (profileError) throw new Error("Could not load that client's logins.");

  for (const row of profiles ?? []) {
    const { error } = await admin.auth.admin.deleteUser(row.user_id);
    if (error) throw new Error("Could not remove a login for that client.");
  }

  await removeTenantMedia(admin, tenantId);

  const { error: deleteError } = await admin.from("tenants").delete().eq("id", tenantId);
  if (deleteError) throw new Error("Could not remove that client.");

  return { ok: true };
}
