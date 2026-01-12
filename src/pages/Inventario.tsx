import { useState } from 'react';
import { 
  Package, Search, Plus, Edit, AlertTriangle,
  ArrowUpDown, MoreVertical
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockProductos } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Inventario() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');

  const categories = [...new Set(mockProductos.map(p => p.categoria))];

  const filteredProducts = mockProductos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategoria === 'all' || p.categoria === filterCategoria;
    return matchSearch && matchCategory;
  });

  const lowStock = mockProductos.filter(p => p.stockActual < 20);
  const totalValue = mockProductos.reduce((sum, p) => sum + (p.precioVenta * p.stockActual), 0);

  const handleAjusteStock = (productoId: string) => {
    toast({
      title: 'Ajuste de stock',
      description: 'Stock actualizado correctamente.',
    });
  };

  return (
    <MainLayout 
      title="Inventario" 
      subtitle="Control de stock y productos"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Productos</p>
            <p className="text-2xl font-bold">{mockProductos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Categorías</p>
            <p className="text-2xl font-bold">{categories.length}</p>
          </CardContent>
        </Card>
        <Card className={cn(lowStock.length > 0 && "border-warning")}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {lowStock.length > 0 && <AlertTriangle className="h-4 w-4 text-warning" />}
              Stock Bajo
            </p>
            <p className="text-2xl font-bold text-warning">{lowStock.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold text-primary">${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o código..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="mb-6 border-warning bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.slice(0, 5).map(p => (
                <Badge key={p.id} variant="outline" className="bg-background">
                  {p.nombre}: {p.stockActual}
                </Badge>
              ))}
              {lowStock.length > 5 && (
                <Badge variant="secondary">+{lowStock.length - 5} más</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map(producto => (
              <TableRow key={producto.id}>
                <TableCell className="font-mono text-sm">{producto.codigo}</TableCell>
                <TableCell className="font-medium">{producto.nombre}</TableCell>
                <TableCell>
                  <Badge variant="outline">{producto.categoria}</Badge>
                </TableCell>
                <TableCell className="text-right">${producto.precioVenta}</TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-medium",
                    producto.stockActual < 20 && "text-warning",
                    producto.stockActual < 10 && "text-destructive"
                  )}>
                    {producto.stockActual}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  ${(producto.precioVenta * producto.stockActual).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleAjusteStock(producto.id)}>
                        <ArrowUpDown className="mr-2 h-4 w-4" /> Ajustar stock
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground mt-4 text-center">
        Mostrando {filteredProducts.length} de {mockProductos.length} productos
      </p>
    </MainLayout>
  );
}