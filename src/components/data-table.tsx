import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, SearchX } from "lucide-react";
import { NativeSelect } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Gives the column a sort button. Compare two rows, ascending. */
  sort?: (a: T, b: T) => number;
  /** Hide this column on narrow screens so the page never scrolls sideways. */
  hideBelow?: "sm" | "md" | "lg";
  align?: "right";
  className?: string;
};

export type DataFilter<T> = {
  id: string;
  /** Shown as the first option, for example "All statuses". */
  label: string;
  options: { value: string; label: string }[];
  match: (row: T, value: string) => boolean;
};

const HIDE: Record<NonNullable<DataColumn<unknown>["hideBelow"]>, string> = {
  sm: "max-sm:hidden",
  md: "max-md:hidden",
  lg: "max-lg:hidden",
};

type Sort = { id: string; dir: "asc" | "desc" };

/**
 * One list pattern for every staff page: search, filters, sortable columns,
 * and an empty state. Sorting and filtering happen in the browser on the rows
 * you pass in, so pass the rows you are already allowed to see.
 */
export function DataTable<T>({
  label,
  rows,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = "Search",
  filters = [],
  initialSort,
  empty,
  toolbar,
}: {
  /** Names the table for screen readers, for example "Clients". */
  label: string;
  rows: T[];
  columns: DataColumn<T>[];
  getRowId: (row: T) => string;
  /** The text a row is searched by. Leave out to hide the search box. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: DataFilter<T>[];
  initialSort?: Sort;
  /** Shown when there are no rows at all. */
  empty: { icon?: LucideIcon; title: string; detail?: string; action?: ReactNode };
  /** Extra controls to the right of the search box. */
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<Sort | null>(initialSort ?? null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let out = rows.filter((row) => {
      if (needle && searchText && !searchText(row).toLowerCase().includes(needle)) return false;
      return filters.every((f) => {
        const value = picked[f.id];
        return !value || f.match(row, value);
      });
    });
    const active = sort ? columns.find((c) => c.id === sort.id)?.sort : undefined;
    if (sort && active) {
      const dir = sort.dir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => active(a, b) * dir);
    }
    return out;
  }, [rows, query, picked, sort, columns, filters, searchText]);

  const filtering = Boolean(query.trim()) || Object.values(picked).some(Boolean);
  const showToolbar = Boolean(searchText) || filters.length > 0 || Boolean(toolbar);

  function toggleSort(id: string) {
    setSort((current) => {
      if (current?.id !== id) return { id, dir: "asc" };
      if (current.dir === "asc") return { id, dir: "desc" };
      return null;
    });
  }

  if (rows.length === 0) {
    return (
      <Surface>
        <EmptyState {...empty} />
      </Surface>
    );
  }

  return (
    <Surface className="overflow-hidden">
      {showToolbar ? (
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center sm:p-4">
          {searchText ? (
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                aria-label={`Search ${label.toLowerCase()}`}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          ) : null}
          {filters.map((f) => (
            <NativeSelect
              key={f.id}
              aria-label={f.label}
              className="sm:w-auto sm:min-w-40"
              value={picked[f.id] ?? ""}
              onChange={(e) => setPicked((p) => ({ ...p, [f.id]: e.target.value }))}
            >
              <option value="">{f.label}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          ))}
          {toolbar ? <div className="flex items-center gap-2 sm:ml-auto">{toolbar}</div> : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nothing matches"
          detail="Try a different word or clear the filters."
          action={
            filtering ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setPicked({});
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label={label}>
            <thead>
              <tr className="border-b border-border">
                {columns.map((c) => {
                  const sorted = sort?.id === c.id ? sort.dir : null;
                  return (
                    <th
                      key={c.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                      }
                      className={cn(
                        "type-label px-4 py-3 sm:px-5",
                        c.align === "right" && "text-right",
                        c.hideBelow && HIDE[c.hideBelow],
                      )}
                    >
                      {c.sort ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.id)}
                          className={cn(
                            "-mx-1 inline-flex min-h-11 items-center gap-1 rounded-sm px-1 hover:text-foreground focus-visible:outline-2 sm:min-h-8",
                            sorted && "text-foreground",
                          )}
                        >
                          {c.header}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3" aria-hidden="true" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-60" aria-hidden="true" />
                          )}
                          <span className="sr-only">, sort</span>
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={getRowId(row)}
                  className="border-b border-border last:border-0 hover:bg-accent/40"
                >
                  {columns.map((c) => (
                    <td
                      key={c.id}
                      className={cn(
                        "type-body px-4 py-3 align-middle sm:px-5",
                        c.align === "right" && "text-right",
                        c.hideBelow && HIDE[c.hideBelow],
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Surface>
  );
}
