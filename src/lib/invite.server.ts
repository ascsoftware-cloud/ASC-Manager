import { authCallbackUrl } from "./auth/email-callback";
import type { InviteInput } from "./invite";
import { appOrigin, requireOperatorAdmin } from "./staff-admin.server";

export async function inviteUser(data: InviteInput): Promise<{ ok: true }> {
  const { admin } = await requireOperatorAdmin(data.accessToken);

  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  if (!email.includes("@") || !name) {
    throw new Error("Name and email are required.");
  }
  if (data.role === "client" && !data.tenantId) {
    throw new Error("Client invite needs a tenant.");
  }
  if (data.role === "operator" && data.tenantId) {
    throw new Error("Staff accounts are not tied to a client.");
  }

  const redirectTo = authCallbackUrl(appOrigin());
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: data.role,
      name,
      tenant_id: data.role === "client" ? data.tenantId : null,
    },
    redirectTo,
  });
  if (error) {
    throw new Error("Could not send that invite.");
  }
  return { ok: true };
}
