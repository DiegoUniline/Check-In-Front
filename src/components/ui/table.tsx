import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { setHiddenColumns, useHiddenColumns } from "@/lib/columnPrefs";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/*
 * Orden por columna en todas las tablas: clic en el encabezado ordena A→Z,
 * otro clic Z→A y un tercero regresa al orden original. El tipo de valor
 * (número, moneda, fecha o texto) se detecta del contenido de la celda.
 * Para desactivarlo en una tabla: <Table data-nosort>; en una columna: <TableHead data-nosort>.
 */
type SortState = { col: number | null; dir: "asc" | "desc" };
type SortCtx = SortState & { enabled: boolean; toggle: (col: number) => void };
const TableSortContext = React.createContext<SortCtx | null>(null);

const textOf = (node: React.ReactNode): string => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).filter(Boolean).join(" ");
  if (React.isValidElement(node)) return textOf((node.props as any)?.children);
  return "";
};

// Columnas de botones: no tienen valor que ordenar.
const NO_SORT_LABELS = /^(acciones?|opciones|ver|editar)$/i;
const EMPTY = new Set(["", "-", "—", "–", "n/a", "sin asignar"]);
const DATE_DMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/;
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/;

type SortKey = { kind: 0 | 1 | 2 | 3; num: number; str: string }; // 0 número/fecha, 1 texto, 3 vacío
const sortKey = (raw: string): SortKey => {
  const text = raw.replace(/\s+/g, " ").trim();
  if (EMPTY.has(text.toLowerCase())) return { kind: 3, num: 0, str: "" };
  let m = text.match(DATE_DMY);
  if (m) return { kind: 0, num: new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)).getTime(), str: text };
  m = text.match(DATE_ISO);
  if (m) return { kind: 0, num: new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)).getTime(), str: text };
  const plain = text.replace(/[$,%\s]|MXN|USD|EUR/gi, "");
  if (/^-?\d+(\.\d+)?$/.test(plain)) return { kind: 0, num: Number(plain), str: text };
  return { kind: 1, num: 0, str: text };
};

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
const compareKeys = (a: SortKey, b: SortKey): number => {
  if (a.kind !== b.kind) return a.kind - b.kind;
  if (a.kind === 0) return a.num - b.num;
  return collator.compare(a.str, b.str);
};

const rowCells = (row: React.ReactElement): React.ReactElement[] => {
  let target: any = row;
  if (row.type === React.Fragment) {
    target = React.Children.toArray((row.props as any).children).find(React.isValidElement);
  }
  if (!target) return [];
  return React.Children.toArray(target.props?.children).filter(React.isValidElement) as React.ReactElement[];
};

/** Clave estable por pantalla + encabezados; los ids de la URL no cuentan. */
const tableKeyFor = (labels: string[], explicit?: string) => {
  if (explicit) return explicit;
  const path = window.location.pathname
    .split("/")
    .map((seg) => (/\d/.test(seg) && seg.length > 6 ? ":id" : seg))
    .join("/");
  return `${path}|${labels.filter(Boolean).join("·")}`;
};

/*
 * Selector de columnas en todas las tablas: el usuario elige qué columnas ver
 * y queda guardado en su perfil (ver lib/columnPrefs). <Table data-nocolumns> lo desactiva.
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const [sort, setSort] = React.useState<SortState>({ col: null, dir: "asc" });
    const enabled = !(props as any)["data-nosort"];
    const columnsEnabled = !(props as any)["data-nocolumns"];
    const explicitKey = (props as any)["data-table-id"] as string | undefined;
    const tid = React.useId();
    const tableRef = React.useRef<HTMLTableElement | null>(null);
    const setRefs = (el: HTMLTableElement | null) => {
      tableRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };
    const [labels, setLabels] = React.useState<string[]>([]);
    React.useLayoutEffect(() => {
      const row = tableRef.current?.tHead?.rows[0];
      const next = row ? Array.from(row.cells).map((c) => (c.textContent || "").replace(/\s+/g, " ").trim()) : [];
      setLabels((prev) => (prev.join("\u0000") === next.join("\u0000") ? prev : next));
    });
    const tableKey = columnsEnabled && labels.length ? tableKeyFor(labels, explicitKey) : null;
    const hidden = useHiddenColumns(tableKey);
    const choices = labels.filter(Boolean);
    const showPicker = columnsEnabled && choices.length >= 4;
    const hiddenIdx = labels.map((l, i) => (l && hidden.includes(l) ? i : -1)).filter((i) => i >= 0);
    const selector = `[data-tid="${tid}"]`;
    const css = hiddenIdx.map((i) => `${selector} tr > :nth-child(${i + 1}):not([colspan]){display:none}`).join("\n");
    const toggleColumn = (label: string, visible: boolean) => {
      if (!tableKey) return;
      const next = visible ? hidden.filter((h) => h !== label) : [...hidden, label];
      if (choices.every((c) => next.includes(c))) return; // siempre queda al menos una
      setHiddenColumns(tableKey, next);
    };
    const ctx = React.useMemo<SortCtx>(() => ({
      ...sort,
      enabled,
      toggle: (col) => setSort((s) => s.col !== col ? { col, dir: "asc" }
        : s.dir === "asc" ? { col, dir: "desc" } : { col: null, dir: "asc" }),
    }), [sort, enabled]);
    return (
      <TableSortContext.Provider value={ctx}>
        <div data-table-scroll className="relative min-w-0 w-full max-w-full overflow-auto rounded-lg overscroll-x-contain" tabIndex={0} role="region" aria-label="Tabla desplazable">
          {showPicker && (
            <div className="sticky left-0 z-[1] flex justify-end px-1 pb-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Elegir qué columnas ver"
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors hover:bg-muted",
                      hiddenIdx.length ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground",
                    )}
                  >
                    <Columns3 className="h-3.5 w-3.5" />
                    Columnas{hiddenIdx.length ? ` · ${hiddenIdx.length} oculta${hiddenIdx.length === 1 ? "" : "s"}` : ""}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[60vh] w-56 overflow-y-auto">
                  <DropdownMenuLabel className="text-xs">Columnas visibles</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {choices.map((label) => (
                    <DropdownMenuCheckboxItem
                      key={label}
                      checked={!hidden.includes(label)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(v) => toggleColumn(label, Boolean(v))}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {hiddenIdx.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => tableKey && setHiddenColumns(tableKey, [])}>Mostrar todas</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {css && <style>{css}</style>}
          <table ref={setRefs} data-tid={tid} className={cn("w-full caption-bottom text-sm max-sm:w-max max-sm:min-w-full max-sm:whitespace-nowrap", className)} {...props} />
        </div>
      </TableSortContext.Provider>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("bg-muted/30 [&_tr]:border-b", className)} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => {
    const sort = React.useContext(TableSortContext);
    const col = sort?.enabled ? sort.col : null;
    const dir = sort?.dir;
    const rows = React.useMemo(() => {
      if (col == null) return children;
      const items = React.Children.toArray(children);
      if (items.length < 2) return children;
      const keyed = items.map((item, i) => ({
        item,
        i,
        key: React.isValidElement(item) ? sortKey(textOf(rowCells(item)[col]?.props?.children)) : sortKey(""),
      }));
      keyed.sort((a, b) => {
        // Los vacíos siempre al final, sin importar la dirección.
        if (a.key.kind === 3 || b.key.kind === 3) return a.key.kind - b.key.kind || a.i - b.i;
        const c = compareKeys(a.key, b.key);
        return (dir === "desc" ? -c : c) || a.i - b.i;
      });
      return keyed.map((k) => k.item);
    }, [children, col, dir]);
    return <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props}>{rows}</tbody>;
  },
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors data-[state=selected]:bg-primary/5 hover:bg-muted/40", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, children, onClick, ...props }, ref) => {
    const sort = React.useContext(TableSortContext);
    const innerRef = React.useRef<HTMLTableCellElement | null>(null);
    const setRefs = (el: HTMLTableCellElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };
    const inHeader = Boolean(innerRef.current?.closest("thead"));
    const label = textOf(children).trim();
    const sortable = Boolean(sort?.enabled) && !(props as any)["data-nosort"] && label !== "" && !NO_SORT_LABELS.test(label);
    const active = sortable && inHeader && sort?.col != null && innerRef.current?.cellIndex === sort.col;
    const Icon = active ? (sort?.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    const hint = !sortable ? undefined
      : !active ? "Clic para ordenar de la A a la Z"
        : sort?.dir === "asc" ? "Orden A→Z · clic para Z→A" : "Orden Z→A · clic para quitar el orden";
    return (
      <th
        ref={setRefs}
        aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
        title={hint}
        className={cn(
          "h-10 px-2 text-left align-middle text-xs font-semibold text-muted-foreground whitespace-nowrap sm:px-3 [&:has([role=checkbox])]:pr-0",
          sortable && "group/sort cursor-pointer select-none transition-colors hover:bg-muted/60 hover:text-foreground",
          active && "bg-primary/5 text-primary",
          className,
        )}
        onClick={(e) => {
          onClick?.(e);
          if (!sortable || e.defaultPrevented) return;
          if ((e.target as HTMLElement).closest("button, input, a, [role=checkbox], [role=combobox]")) return;
          if (!e.currentTarget.closest("thead")) return;
          sort?.toggle(e.currentTarget.cellIndex);
        }}
        {...props}
      >
        {sortable ? (
          <span className="inline-flex items-center gap-1">
            {children}
            <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground/50 group-hover/sort:text-foreground")} />
          </span>
        ) : children}
      </th>
    );
  },
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-2 py-2.5 align-middle sm:px-3 [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-3 text-xs text-muted-foreground sm:text-sm", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
