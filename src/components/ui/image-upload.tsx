import { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadImage, deleteImage } from '@/lib/imageUpload';
import { cn } from '@/lib/utils';

type Bucket = 'hotel-logos' | 'habitacion-fotos' | 'producto-fotos' | 'gasto-comprobantes';

interface ImageUploadProps {
  bucket: Bucket;
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  maxWidth?: number;
  className?: string;
  label?: string;
  /** En MB. Por defecto 8MB de archivo original */
  maxSizeMB?: number;
}

/**
 * Subida de imagen con conversión automática a WebP.
 * - Drag & drop o click.
 * - Convierte a WebP, redimensiona y sube a Supabase Storage.
 * - Muestra preview y permite eliminar.
 */
export function ImageUpload({
  bucket,
  value,
  onChange,
  folder,
  maxWidth,
  className,
  label = 'Subir imagen',
  maxSizeMB = 8,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Archivo inválido', description: 'Solo se permiten imágenes.', variant: 'destructive' });
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: 'Imagen demasiado grande',
        description: `Máximo ${maxSizeMB} MB. Se comprimirá a WebP automáticamente.`,
        variant: 'destructive',
      });
      return;
    }
    try {
      setUploading(true);
      // Borra la anterior si existía
      if (value) await deleteImage(bucket, value).catch(() => {});
      const url = await uploadImage(bucket, file, { folder, maxWidth });
      onChange(url);
      toast({ title: 'Imagen subida', description: 'Convertida a WebP y optimizada.' });
    } catch (e: any) {
      toast({ title: 'Error al subir', description: e?.message || 'Intenta de nuevo.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    try {
      await deleteImage(bucket, value);
    } catch {/* ignorar */}
    onChange(null);
  };

  return (
    <div className={cn('w-full', className)}>
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border bg-muted">
          <img src={value} alt="Imagen subida" className="w-full h-48 object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-1" /> Reemplazar
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleRemove} disabled={uploading}>
              <X className="h-4 w-4 mr-1" /> Eliminar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          disabled={uploading}
          className={cn(
            'w-full h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors',
            'hover:border-primary hover:bg-primary/5',
            dragOver && 'border-primary bg-primary/5',
            uploading && 'opacity-60 cursor-not-allowed'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Optimizando y subiendo...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">Click o arrastra · se convierte a WebP</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}