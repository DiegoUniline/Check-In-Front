import { supabase } from '@/integrations/supabase/client';

export type AccionAudit = 'crear' | 'actualizar' | 'eliminar' | 'login' | 'custom';

interface RegistrarParams {
  accion: AccionAudit;
  entidad: string;
  entidad_id?: string | null;
  descripcion?: string;
  datos_antes?: any;
  datos_despues?: any;
}

/**
 * Registra una entrada en la bitácora del hotel actual.
 * Falla en silencio para no romper el flujo de la operación principal.
 */
export async function registrarAuditoria(params: RegistrarParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const hotel_id = localStorage.getItem('hotel_id');
    if (!hotel_id) return;
    await supabase.from('auditoria' as any).insert({
      hotel_id,
      user_id: user?.id || null,
      user_email: user?.email || null,
      accion: params.accion,
      entidad: params.entidad,
      entidad_id: params.entidad_id || null,
      descripcion: params.descripcion || null,
      datos_antes: params.datos_antes || null,
      datos_despues: params.datos_despues || null,
    });
  } catch (e) {
    console.warn('[auditoria] no se pudo registrar', e);
  }
}