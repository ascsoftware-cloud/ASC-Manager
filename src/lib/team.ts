import { createServerFn } from "@tanstack/react-start";
import type { Access } from "./permissions";

/**
 * Team management for a client account. The server checks the caller is that
 * account's admin (or ASC staff, who pass `tenantId`). Nobody ever sees or
 * types another person's password: a reset sends them an email link.
 */
export type TeamBase = {
  accessToken: string;
  /** ASC staff only: which client account. Client admins always act on their own. */
  tenantId?: string | null;
};

export type TeamMemberInput = {
  name: string;
  access: Access;
  permissions: string[];
  /** Empty means every site on the account. */
  siteIds: string[];
};

export type AddMemberInput = TeamBase & TeamMemberInput & { email: string };
export type UpdateMemberInput = TeamBase & TeamMemberInput & { userId: string };
export type MemberRefInput = TeamBase & { userId: string };

export const addTeamMemberFn = createServerFn({ method: "POST" })
  .validator((d: AddMemberInput) => d)
  .handler(async ({ data }) => {
    const { addTeamMember } = await import("./team.server");
    return addTeamMember(data);
  });

export const updateTeamMemberFn = createServerFn({ method: "POST" })
  .validator((d: UpdateMemberInput) => d)
  .handler(async ({ data }) => {
    const { updateTeamMember } = await import("./team.server");
    return updateTeamMember(data);
  });

export const removeTeamMemberFn = createServerFn({ method: "POST" })
  .validator((d: MemberRefInput) => d)
  .handler(async ({ data }) => {
    const { removeTeamMember } = await import("./team.server");
    return removeTeamMember(data);
  });

export const resetTeamPasswordFn = createServerFn({ method: "POST" })
  .validator((d: MemberRefInput) => d)
  .handler(async ({ data }) => {
    const { resetTeamPassword } = await import("./team.server");
    return resetTeamPassword(data);
  });
