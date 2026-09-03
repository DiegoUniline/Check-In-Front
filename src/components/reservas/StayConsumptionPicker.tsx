import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Minus, PackageOpen, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type StayConsumptionItem = {
  source: 'product' | 'service';
  product_id?: string;
  concept_id?: string;
  name: string;
  code?: string;
  category: string;
  quantity: number;
  unit_price: number;
  stock?: number;
};

type Props = {
  value: StayConsumptionItem[];
  onChange: (items: StayConsumptionItem[]) => void;
};

const number = (value: unknown) => Number(value || 0);
const keyOf = (item: StayConsumptionItem) => `${item.source}:${item.product_id || item.concept_id}`;

export function StayConsumptionPicker({ value, onChange }: Props) {
  const [catalog, setCatalog] = useState<StayConsumptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([api.getProductos(), api.getConceptosCargo()])
      .then(([products, services]) => {
        if (!alive) return;
        const normalized: StayConsumptionItem[] = [
          ...(products || [])
            .filter((product: any) => product.activo !== false)
            .map((product: any) => ({
              source: 'product' as const,
              product_id: product.id,
              name: product.nombre || 'Producto',
              code: product.codigo || '',
              category: product.categoria_nombre || product.categoria || 'Productos',
              quantity: 1,
              unit_price: number(product.precio_venta),
              stock: number(product.stock_actual),
            })),
          ...(services || []).map((service: any) => ({
            source: 'service' as const,
            concept_id: service.id,
            name: service.nombre || 'Servicio',
            code: '',
            category: 'Servicios',
            quantity: 1,
            unit_price: number(service.precio),
          })),
        ];
        setCatalog(normalized);
      })
      .catch((catalogError: any) => {
        if (alive) setError(catalogError.message || 'No se pudo cargar el catálogo.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => Array.from(new Set(catalog.map((item) => item.category))).sort(), [catalog]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const matchesSearch = !query || `${item.name} ${item.code || ''} ${item.category}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [catalog, category, search]);
  const total = value.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const add = (item: StayConsumptionItem) => {
    const itemKey = keyOf(item);
    const existing = value.find((current) => keyOf(current) === itemKey);
    if (existing) {
      const nextQuantity = existing.quantity + 1;
      if (item.source === 'product' && nextQuantity > number(item.stock)) return;
      onChange(value.map((current) => keyOf(current) === itemKey ? { ...current, quantity: nextQuantity } : current));
      return;
    }
    if (item.source === 'product' && number(item.stock) <= 0) return;
    onChange([...value, { ...item, quantity: 1 }]);
  };

  const changeQuantity = (item: StayConsumptionItem, delta: number) => {
    const itemKey = keyOf(item);
    const next = item.quantity + delta;
    if (next <= 0) {
      onChange(value.filter((current) => keyOf(current) !== itemKey));
      return;
    }
    if (item.source === 'product' && next > number(item.stock)) return;
    onChange(value.map((current) => keyOf(current) === itemKey ? { ...current, quantity: next } : current));
  };

  return <div className="space-y-4">
    <div className="rounded-xl border border-[#10233F]/10 bg-[#F7F9FC] p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto, código o servicio…" className="bg-white pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todo el catálogo</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Cargando productos y precios…</div>
        : error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        : filtered.length === 0 ? <div className="flex min-h-32 flex-col items-center justify-center text-center text-sm text-muted-foreground"><PackageOpen className="mb-2 h-6 w-6" />No hay coincidencias en el catálogo.</div>
        : <div className="mt-3 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((item) => {
            const selected = value.some((current) => keyOf(current) === keyOf(item));
            const soldOut = item.source === 'product' && number(item.stock) <= 0;
            return <button key={keyOf(item)} type="button" disabled={soldOut} onClick={() => add(item)} className="flex min-h-20 items-center justify-between gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-[#10233F]/45 disabled:cursor-not-allowed disabled:opacity-45">
              <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#10233F]">{item.name}</span><span className="block truncate text-xs text-muted-foreground">{item.code ? `${item.code} · ` : ''}{item.category}</span><span className={`mt-1 block text-[11px] ${soldOut ? 'text-red-600' : 'text-emerald-700'}`}>{item.source === 'product' ? `Existencia ${item.stock}` : 'Servicio sin inventario'}</span></span>
              <span className="shrink-0 text-right"><span className="block text-sm font-bold">{formatCurrency(item.unit_price)}</span>{selected ? <CheckCircle2 className="ml-auto mt-1 h-4 w-4 text-emerald-600" /> : <Plus className="ml-auto mt-1 h-4 w-4 text-[#10233F]" />}</span>
            </button>;
          })}
        </div>}
    </div>

    <section className="rounded-xl border">
      <div className="flex items-center justify-between border-b px-3 py-2.5"><h4 className="flex items-center gap-2 text-sm font-semibold text-[#10233F]"><ShoppingCart className="h-4 w-4" />Consumo</h4><Badge variant="secondary">{value.reduce((sum, item) => sum + item.quantity, 0)} artículos</Badge></div>
      {value.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Selecciona uno o varios productos o servicios.</p> : <div className="divide-y">
        {value.map((item) => <div key={keyOf(item)} className="flex items-center gap-2 p-3">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)} c/u · precio del catálogo</p></div>
          <div className="flex shrink-0 items-center rounded-lg border"><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeQuantity(item, -1)}><Minus className="h-3 w-3" /></Button><span className="w-7 text-center text-sm font-semibold">{item.quantity}</span><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeQuantity(item, 1)} disabled={item.source === 'product' && item.quantity >= number(item.stock)}><Plus className="h-3 w-3" /></Button></div>
          <p className="w-20 shrink-0 text-right text-sm font-semibold">{formatCurrency(item.quantity * item.unit_price)}</p>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => onChange(value.filter((current) => keyOf(current) !== keyOf(item)))}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>)}
        <div className="flex items-center justify-between bg-[#10233F]/[0.03] px-3 py-3"><span className="text-sm font-semibold">Total del consumo</span><span className="text-xl font-bold text-[#10233F]">{formatCurrency(total)}</span></div>
      </div>}
    </section>
    <p className="text-xs text-muted-foreground">El precio se toma del catálogo. Al guardar se vuelve a validar existencia y todo se registra en una sola transacción.</p>
  </div>;
}
