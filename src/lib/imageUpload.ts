import { supabase } from '@/integrations/supabase/client';

async function currentHotelId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('hotel_activo_id, hotel_id')
    .eq('id', user.id)
    .maybeSingle();
  return (data?.hotel_activo_id ?? data?.hotel_id ?? null) as string | null;
}

/**
 * Convierte cualquier imagen (jpg/png/heic-en-blob) a WebP comprimido.
 * - Redimensiona a un ancho máximo (default 1920px) preservando aspecto.
 * - Calidad 0.85 (buen balance peso/calidad).
 * - Devuelve un Blob WebP listo para subir.
 */
export async function toWebP(
  file: File | Blob,
  opts: { maxWidth?: number; quality?: number } = {}
): Promise<Blob> {
  const { maxWidth = 1920, quality = 0.85 } = opts;

  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el canvas');
  ctx.drawImage(img, 0, 0, w, h);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Conversión WebP falló'))),
      'image/webp',
      quality
    );
  });
}

/**
 * Sube un archivo (convertido a WebP) al bucket indicado y devuelve la URL pública.
 */
export async function uploadImage(
  bucket: 'hotel-logos' | 'habitacion-fotos' | 'producto-fotos' | 'gasto-comprobantes',
  file: File | Blob,
  opts: { folder?: string; maxWidth?: number; quality?: number } = {}
): Promise<string> {
  const webp = await toWebP(file, { maxWidth: opts.maxWidth, quality: opts.quality });
  const folder = opts.folder ? opts.folder.replace(/^\/|\/$/g, '') + '/' : '';
  // Aislamiento multi-tenant: prefijo con hotel_id (obligatorio para buckets privados/sensibles)
  const hotelId = await currentHotelId();
  const tenantPrefix = hotelId ? `${hotelId}/` : '';
  const filename = `${tenantPrefix}${folder}${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, webp, { contentType: 'image/webp', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  return data.publicUrl;
}

/**
 * Borra una imagen del bucket dado su URL pública.
 */
export async function deleteImage(
  bucket: 'hotel-logos' | 'habitacion-fotos' | 'producto-fotos' | 'gasto-comprobantes',
  publicUrl: string
): Promise<void> {
  if (!publicUrl) return;
  const marker = `/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(bucket).remove([path]);
}