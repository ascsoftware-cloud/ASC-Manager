import { authCallbackUrl } from "./auth/email-callback";
import { appOrigin, requireOperatorAdmin } from "./staff-admin.server";
import { createStaffService, type StaffStore } from "./staff-users-service";

/** Real database and auth calls behind the staff rules in staff-users-service. */
const service = createStaffService({
  async requireOperator(accessToken) {
    const { admin, userId } = await requireOperatorAdmin(accessToken);
    const store: StaffStore = {
      async operatorProfiles() {
        const { data, error } = await admin
          .from("profiles")
          .select("user_id, email, name")
          .eq("role", "operator");
        if (error) throw new Error("Could not load the staff list.");
        return (data ?? []).map((r) => ({
          userId: String(r.user_id),
          email: String(r.email ?? ""),
          name: String(r.name ?? ""),
        }));
      },
      async authStates() {
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (error) throw new Error("Could not load sign-in details.");
        return new Map(
          data.users.map((u) => [
            u.id,
            {
              lastSignInAt: u.last_sign_in_at ?? null,
              bannedUntil: (u as { banned_until?: string | null }).banned_until ?? null,
            },
          ]),
        );
      },
      async invite(email, name) {
        const { error } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { role: "operator", name, tenant_id: null },
          redirectTo: authCallbackUrl(appOrigin()),
        });
        if (error) throw new Error("Could not send that invite.");
      },
      async setBanned(userId, banned) {
        const { error } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: banned ? "876000h" : "none",
        });
        if (error) throw new Error("Could not update that account.");
      },
    };
    return { callerId: userId, store };
  },
});

export const listStaff = service.list;
export const resendStaffInvite = service.resendInvite;
export const setStaffActive = service.setActive;
