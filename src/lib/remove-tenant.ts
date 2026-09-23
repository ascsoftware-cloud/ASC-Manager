import { createServerFn } from "@tanstack/react-start";

export type RemoveTenantInput = {
  accessToken: string;
  tenantId: string;
};

export const removeTenantFn = createServerFn({ method: "POST" })
  .validator((d: RemoveTenantInput) => d)
  .handler(async ({ data }) => {
    const { removeTenant } = await import("./remove-tenant.server");
    return removeTenant(data);
  });
