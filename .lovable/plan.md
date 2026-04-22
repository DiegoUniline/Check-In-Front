

## Arreglar colores de fondo en cards de Recepción

Las cards de habitaciones se están renderizando casi sin color (apenas un gris pálido) en lugar de los verdes/azules/rojos esperados. El problema es que las clases gradient (`bg-gradient-to-br from-emerald-500 to-emerald-600`) están produciendo un resultado demasiado tenue y poco contrastante para tu pantalla, perdiendo la identidad visual de "Disponible / Reservada / Ocupada".

### Cambios

**Archivo único: `src/components/reservas/RecepcionGrid.tsx`**

1. **Reemplazar gradientes débiles por colores sólidos vibrantes** en `ESTADO_META`:
   - `libre` → fondo verde sólido vivo (el "verde original" que pediste, alineado al token `--success` del sistema): `bg-emerald-500` con borde `border-emerald-600`.
   - `reservada` → `bg-blue-500` / `border-blue-600`.
   - `ocupada` → `bg-rose-500` / `border-rose-600`.
   - `mantenimiento` → `bg-amber-500` / `border-amber-600`.

2. **Asegurar contraste del texto sobre los fondos sólidos**:
   - Número de habitación, estado y huésped: `text-white` puro.
   - Texto secundario (tipo, piso, pax, noches): `text-white/85` (más legible que `/80`).
   - Pill de saldo: fondo `bg-white text-rose-600 font-bold` para que destaque sobre cualquier color.

3. **Mantener la identidad visual ya aprobada**:
   - Proporción áurea `aspect-[1.618/1]`, mínimo `160px`.
   - Icono `BedDouble` decorativo grande a la derecha en `text-white/30`.
   - Glow sutil en la esquina superior izquierda.
   - Footer "DISPONIBLE / RESERVADA / OCUPADA →" con flecha animada en hover.
   - Hover: `hover:brightness-110 hover:-translate-y-1 hover:shadow-xl`.

4. **Leyenda superior**: mantener igual (puntitos de color + contador).

5. **Vista Tabla**: sin cambios en estructura; los badges ya usan `meta.short` y siguen funcionando con los nuevos colores.

### Resultado esperado

| Estado | Color de card |
|---|---|
| Disponible | Verde esmeralda sólido (clic → check-in directo) |
| Reservada hoy | Azul sólido (clic → ver reserva) |
| Ocupada | Rojo/rosa sólido (clic → ver detalle) |
| Mantenimiento | Ámbar sólido (no clickeable) |

Las cards quedarán claramente diferenciables de un vistazo, con texto blanco bien legible y la pill del saldo pendiente resaltando en blanco con números rojos.

