// Genera el encabezado de marca para los mensajes de WhatsApp:
// fondo BLANCO + logo del hotel contratante arriba + franja VULO abajo.
// El resultado se cachea en Storage (bucket público) para no recomponerlo en cada envío.
import { Image } from 'https://deno.land/x/imagescript@1.2.17/mod.ts';

const W = 1080;
const H = 620;
const FOOTER_URL = 'https://vulo.mx/wa-footer.png';

async function fetchImage(url: string): Promise<Image | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    const img = await Image.decode(buf);
    return img as Image;
  } catch {
    return null;
  }
}

/** Compone el banner (JPEG) o null si no se pudo. */
export async function composeHeaderBanner(logoUrl: string): Promise<Uint8Array | null> {
  const [logo, footer] = await Promise.all([fetchImage(logoUrl), fetchImage(FOOTER_URL)]);
  if (!logo) return null;

  const canvas = new Image(W, H);
  canvas.fill(0xffffffff); // blanco opaco

  // Logo del hotel: encajado en el área superior con márgenes generosos.
  const maxW = 720;
  const maxH = 300;
  const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
  const lw = Math.max(1, Math.round(logo.width * scale));
  const lh = Math.max(1, Math.round(logo.height * scale));
  const l = logo.resize(lw, lh);
  const topArea = footer ? H - 190 : H;
  canvas.composite(l, Math.round((W - lw) / 2), Math.round((topArea - lh) / 2));

  if (footer) {
    const fw = W;
    const fh = Math.round(footer.height * (W / footer.width));
    const f = footer.resize(fw, fh);
    canvas.composite(f, 0, H - fh);
  }

  return await canvas.encodeJPEG(90);
}

/**
 * Devuelve la URL pública del encabezado del hotel, generándolo y cacheándolo
 * si hace falta. Devuelve null si el hotel no tiene logo o falla la composición.
 */
export async function getHeaderBannerUrl(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  hotelId: string,
  logoUrl: string | null | undefined,
): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    // Clave estable basada en el logo actual: si el hotel cambia su logo, cambia el archivo.
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(logoUrl));
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 12);
    const path = `wa-header/${hotelId}-${hash}.jpg`;
    const { data: pub } = supabase.storage.from('hotel-logos').getPublicUrl(path);
    const publicUrl = pub?.publicUrl as string | undefined;

    // ¿Ya existe en cache?
    if (publicUrl) {
      try {
        const head = await fetch(publicUrl, { method: 'HEAD' });
        if (head.ok) return publicUrl;
      } catch { /* seguimos y lo generamos */ }
    }

    const jpeg = await composeHeaderBanner(logoUrl);
    if (!jpeg) return null;

    const { error } = await supabase.storage
      .from('hotel-logos')
      .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;

    return publicUrl ?? null;
  } catch {
    return null;
  }
}
