/**
 * What a client pays ASC each month. The build is once-off and is billed as an
 * invoice; the monthly amount is hosting and maintenance for their package,
 * plus the database if they have one. No imports, so the browser and the
 * server both use the same price list. The server always works the total out
 * itself and never trusts an amount from the browser.
 */

export const PACKAGES = [
  { key: "single", label: "Single page", pages: "1", monthlyZar: 210, buildFromZar: 1500 },
  { key: "starter", label: "Starter", pages: "2 to 4", monthlyZar: 359, buildFromZar: 3280 },
  { key: "standard", label: "Standard", pages: "5 to 9", monthlyZar: 420, buildFromZar: 5690 },
  { key: "scale", label: "Scale", pages: "10 or more", monthlyZar: 510, buildFromZar: 7280 },
] as const;

export type PackageKey = (typeof PACKAGES)[number]["key"];
export type PlanChoice = PackageKey | "custom";

export const DATABASE_MONTHLY_ZAR = 150;
export const CUSTOM_MIN_ZAR = 10;
export const CUSTOM_MAX_ZAR = 100_000;

export function isPackageKey(v: unknown): v is PackageKey {
  return PACKAGES.some((p) => p.key === v);
}

export type PlanInput = {
  /** A package from the price list, or "custom" for a one-off arrangement. */
  choice: PlanChoice;
  database: boolean;
  /** Only used when choice is "custom". Rand per month. */
  customAmountZar?: number;
};

export type PlanResult =
  | { ok: true; amountZar: number; item: string; choice: PlanChoice; database: boolean }
  | { ok: false; error: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The monthly total and the line that describes it, or a plain-words error. */
export function priceMonthlyPlan(input: PlanInput): PlanResult {
  const database = Boolean(input.database);
  if (input.choice === "custom") {
    const n = Number(input.customAmountZar);
    if (!Number.isFinite(n)) return { ok: false, error: "Enter the monthly amount in rand." };
    const amount = round2(n);
    if (amount < CUSTOM_MIN_ZAR || amount > CUSTOM_MAX_ZAR) {
      return {
        ok: false,
        error: `The amount has to be between R${CUSTOM_MIN_ZAR} and R${CUSTOM_MAX_ZAR.toLocaleString("en-ZA")}.`,
      };
    }
    return {
      ok: true,
      amountZar: amount,
      item: "Monthly hosting and maintenance",
      choice: "custom",
      database,
    };
  }
  const pack = PACKAGES.find((p) => p.key === input.choice);
  if (!pack) return { ok: false, error: "Pick a package." };
  const amount = round2(pack.monthlyZar + (database ? DATABASE_MONTHLY_ZAR : 0));
  return {
    ok: true,
    amountZar: amount,
    item: `${pack.label} package: hosting and maintenance${database ? ", plus database" : ""}`,
    choice: pack.key,
    database,
  };
}
