

## Plan: Reparar aislamiento de datos por hotel para Diego

### Problema raíz

Las migraciones anteriores que creé (`20260421235100_rls_per_hotel.sql` y `20260422000000_signup_trigger_and_strict_rls.sql`) **no se aplicaron a la base de datos**. Verifiqué directo en Postgres y:

- La función `public.current_user_hotel_id()` **no existe**.
- La función `public.handle_new_user()` y su trigger **no existen**.
- El usuario `diego.leon@uniline.mx` (id `8c03bf4f...`) **existe en auth.users pero no tiene profile, hotel ni rol**.
- Solo existe el hotel demo `Hotel Vista Mar` en la tabla `hotels`.
- Todas las RLS siguen siendo `USING (true)` → cualquier autenticado ve todo.

Por eso Diego entra y ve el hotel demo completo: el frontend hace fallback al hotel demo cuando no encuentra hotel propio, y RLS no bloquea nada.

### Solución (1 sola migración consolidada y verificada)

**Migración nueva**: `supabase/migrations/<timestamp>_fix_signup_and_strict_rls.sql`

1. **Crear función helper** `public.current_user_hotel_id()` (SECURITY DEFINER, lee `profiles.hotel_id` para `auth.uid()`).
2. **Crear función + trigger** `handle_new_user()` en `auth.users` que crea automáticamente:
   - 1 hotel nuevo (`{email}'s Hotel`)
   - 1 profile vinculado a ese hotel
   - 1 rol Admin en `user_roles`
   - Excluye `admin@hotel.com` (demo).
3. **Backfill para Diego**: crear su hotel, profile y rol Admin manualmente para que pueda usar la app inmediatamente sin re-registrarse.
4. **Reemplazar TODAS las políticas RLS permisivas** (`USING true`) por filtros estrictos `hotel_id = current_user_hotel_id()` en las 17 tablas operativas:
   - Directas: `habitaciones`, `tipos_habitacion`, `clientes`, `reservas`, `pagos`, `cargos`, `productos`, `categorias_producto`, `proveedores`, `compras`, `gastos`, `ventas`, `tareas_limpieza`, `tareas_mantenimiento`, `entregables`, `conceptos_cargo`, `transacciones`.
   - Hijas (sin `hotel_id` directo, vía EXISTS al padre): `compras_detalle`, `ventas_detalle`, `entregables_reserva`, `movimientos_inventario`.
5. **Restringir `hotels`**: SELECT solo del hotel propio.

### Detalles técnicos

- Cada tabla tendrá 4 políticas: SELECT/INSERT/UPDATE/DELETE, todas filtrando por `hotel_id = current_user_hotel_id()`.
- INSERT usa `WITH CHECK` para forzar que solo se inserten filas del propio hotel.
- Tablas hijas usan `EXISTS (SELECT 1 FROM padre WHERE padre.id = hijo.fk AND padre.hotel_id = current_user_hotel_id())`.
- `current_user_hotel_id()` es STABLE y SECURITY DEFINER → se evalúa una vez por consulta y bypasea RLS de `profiles`.

### Resultado esperado

- Diego al entrar verá su propio hotel vacío (sin habitaciones, reservas, etc.).
- El usuario demo (`admin@hotel.com`) seguirá viendo el hotel demo aislado.
- Cualquier nuevo signup creará automáticamente su hotel propio.
- A nivel BD, ningún usuario podrá leer/escribir datos de otro hotel aunque manipule el frontend.

### Acción que debe hacer el usuario después

Cerrar sesión y volver a entrar con `diego.leon@uniline.mx` para que el frontend recargue su nuevo `hotel_id`.

