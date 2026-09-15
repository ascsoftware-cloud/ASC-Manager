import { createServerFn } from "@tanstack/react-start";

export type InviteInput = {
  accessToken: string;
  email: string;
  name: string;
  role: "operator" | "client";
  tenantId: string | null;
};

export const inviteUserFn = createServerFn({ method: "POST" })
  .validator((d: InviteInput) => d)
  .handler(async ({ data }) => {
    const { inviteUser } = await import("./invite.server");
    return inviteUser(data);
  });
