import { format, formatDistanceToNowStrict, isToday, isTomorrow, parseISO } from "date-fns";

export function formatZar(amount: number): string {
  const n = new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(
    Math.round(amount),
  );
  return `R ${n}`;
}

export function formatWhen(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return `Today ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Tomorrow ${format(d, "HH:mm")}`;
  return format(d, "EEE d MMM, HH:mm");
}

export function formatDay(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}

export function formatRelative(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
