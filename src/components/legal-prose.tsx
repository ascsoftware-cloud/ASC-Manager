import type { ReactNode } from "react";
import { Surface } from "@/components/page-header";

export function LegalDoc({ children }: { children: ReactNode }) {
  return (
    <Surface className="space-y-4 p-5 text-sm leading-relaxed text-muted-foreground sm:p-8">
      {children}
    </Surface>
  );
}

export function LegalH({ children }: { children: ReactNode }) {
  return <h2 className="pt-5 font-display text-lg text-champagne first:pt-0">{children}</h2>;
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalTable({
  headers,
  rows,
}: {
  headers?: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        {headers ? (
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={
                    j === 0 && !headers
                      ? "px-3 py-2.5 text-champagne"
                      : "px-3 py-2.5"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Mail({ to }: { to: string }) {
  return (
    <a className="text-emerald hover:underline" href={`mailto:${to}`}>
      {to}
    </a>
  );
}
