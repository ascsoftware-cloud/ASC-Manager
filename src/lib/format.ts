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

export function reorderIds(ids: string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = ids.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

export function mondayOf(d = new Date()): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return format(m, "yyyy-MM-dd");
}

export function sundayOf(d = new Date()): string {
  const mon = parseISO(`${mondayOf(d)}T12:00:00`);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return format(sun, "yyyy-MM-dd");
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
