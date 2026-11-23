/**
 * Staff account management for the Admin page: who is on staff, whether they
 * have signed in yet, resend an invite, and switch an account off or on.
 *
 * Every action starts with `requireOperator`. If that throws, nothing else
 * runs. The database and auth calls are injected as a `StaffStore` so the
 * rules here can be tested without a database. No runtime imports on purpose.
 */

export type StaffStatus = "active" | "invited" | "deactivated";

export type StaffAccount = {
  userId: string;
  email: string;
  name: string;
  status: StaffStatus;
  lastSignInAt: string | null;
};

export type AuthState = {
  lastSignInAt: string | null;
  /** An ISO date in the future means the account is switched off. */
  bannedUntil: string | null;
};

export type StaffStore = {
  operatorProfiles(): Promise<{ userId: string; email: string; name: string }[]>;
  authStates(): Promise<Map<string, AuthState>>;
  invite(email: string, name: string): Promise<void>;
  setBanned(userId: string, banned: boolean): Promise<void>;
};

export type StaffDeps = {
  /** Throws unless the access token belongs to ASC staff. */
  requireOperator(accessToken: string): Promise<{ callerId: string; store: StaffStore }>;
  now?: () => number;
};

export function staffStatus(state: AuthState | undefined, now: number): StaffStatus {
  if (state?.bannedUntil && Date.parse(state.bannedUntil) > now) return "deactivated";
  if (!state?.lastSignInAt) return "invited";
  return "active";
}

export function createStaffService(deps: StaffDeps) {
  const now = () => (deps.now ? deps.now() : Date.now());

  async function accounts(store: StaffStore): Promise<StaffAccount[]> {
    const [profiles, states] = await Promise.all([store.operatorProfiles(), store.authStates()]);
    return profiles
      .map((p) => ({
        userId: p.userId,
        email: p.email,
        name: p.name,
        status: staffStatus(states.get(p.userId), now()),
        lastSignInAt: states.get(p.userId)?.lastSignInAt ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    async list(accessToken: string): Promise<StaffAccount[]> {
      const { store } = await deps.requireOperator(accessToken);
      return accounts(store);
    },

    async resendInvite(accessToken: string, userId: string): Promise<{ ok: true }> {
      const { store } = await deps.requireOperator(accessToken);
      const target = (await accounts(store)).find((a) => a.userId === userId);
      if (!target) throw new Error("That person is not on the staff list.");
      if (target.status !== "invited") throw new Error("They have already signed in.");
      await store.invite(target.email, target.name);
      return { ok: true };
    },

    async setActive(accessToken: string, userId: string, active: boolean): Promise<{ ok: true }> {
      const { callerId, store } = await deps.requireOperator(accessToken);
      if (!active && userId === callerId) {
        throw new Error("You cannot deactivate your own account.");
      }
      const list = await accounts(store);
      const target = list.find((a) => a.userId === userId);
      if (!target) throw new Error("That person is not on the staff list.");
      if (!active) {
        const otherActive = list.filter((a) => a.userId !== userId && a.status !== "deactivated");
        if (otherActive.length === 0) {
          throw new Error("At least one staff account has to stay switched on.");
        }
      }
      await store.setBanned(userId, !active);
      return { ok: true };
    },
  };
}
