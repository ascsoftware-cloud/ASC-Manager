/**
 * Local/dev client login only. Production builds drop this via `import.meta.env.DEV`.
 * Keep email/password in sync with `scripts/seed-demo-client.mjs`.
 */
export const LOCAL_DEMO_CLIENT = {
  email: "demo.client@example.com",
  password: "DemoShop26",
  name: "Demo shop",
  tenantName: "Demo Shop",
} as const;

export function localDemoClient(): typeof LOCAL_DEMO_CLIENT | null {
  return import.meta.env.DEV ? LOCAL_DEMO_CLIENT : null;
}
