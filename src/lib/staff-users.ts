import { createServerFn } from "@tanstack/react-start";
import type { StaffAccount } from "./staff-users-service";

export type { StaffAccount, StaffStatus } from "./staff-users-service";

/** ASC staff only. The server checks the caller is staff before doing anything. */
export const listStaffFn = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string }) => d)
  .handler(async ({ data }): Promise<StaffAccount[]> => {
    const { listStaff } = await import("./staff-users.server");
    return listStaff(data.accessToken);
  });

export const resendStaffInviteFn = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const { resendStaffInvite } = await import("./staff-users.server");
    return resendStaffInvite(data.accessToken, data.userId);
  });

export const setStaffActiveFn = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; userId: string; active: boolean }) => d)
  .handler(async ({ data }) => {
    const { setStaffActive } = await import("./staff-users.server");
    return setStaffActive(data.accessToken, data.userId, data.active);
  });
