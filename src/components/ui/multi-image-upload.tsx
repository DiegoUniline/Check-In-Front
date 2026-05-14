import { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadImage, deleteImage } from '@/lib/imageUpload';
import { cn } from '@/lib/utils';

type Bucket = 'hotel-logos' | 'habitacion-fotos' | 'producto-fotos' | 'gasto-comprobantes';

interface MultiImageUploadProps {
  bucket: Bucket;
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  maxWidth?: number;
  maxImages?: number;
  maxSizeMB?: number;
  className?: string;
}

/**
 * Subida de múltiples imágenes con conversión a WebP automática.
 * Permite subir varias a la vez, eliminar y reordenar (drag & drop entre miniaturas).
 */
export function MultiImageUpload({
  bucket,
  value,
  onChange,
  folder,
  maxWidth,
  maxImages = 10,
  maxSizeMB = 8,
  className,
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    const remaining = Math.max(0, maxImages - value.length);
    if (remaining <= 0) {
      toast({ title: 'Límite alcanzado', description: `Máximo ${maxImages} imágenes.`, variant: 'destructive' });
      return;
    }
    const toUpload = arr.slice(0, remaining);

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast({ title: `${file.name} es muy grande`, description: `Máx ${maxSizeMB} MB`, variant: 'destructive' });
          continue;
        }
        try {
          const url = await uploadImage(bucket, file, { folder, maxWidth });
          uploaded.push(url);
        } catch (e: any) {
          toast({ title: `Error subiendo ${file.name}`, description: e?.message || '', variant: 'destructive' });
        }
      }
      if (uploaded.length) {
        onChange([...value, ...uploaded]);
        toast({ title: 'Imágenes subidas', description: `${uploaded.length} optimizada(s) a WebP.` });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (idx: number) => {
    const url = value[idx];
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
    if (url) deleteImage(bucket, url).catch(() => {});
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className={cn('w-full space-y-3', className)}>
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url, idx) => (
            <div
              key={url + idx}
              draggable
              onDragStart={() => setDragIndex(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) reorder(dragIndex, idx);
                setDragIndex(null);
              }}
              className="relative group rounded-lg overflow-hidden border bg-muted aspect-[4/3]"
            >
              <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
              {idx === 0 && (
                <span className="absolute top-1 left-1 text-[10px] uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                  Portada
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <span className="absolute top-1 right-1 text-white/80">
                  <GripVertical className="h-4 w-4" />
                </span>
                <Button type="button" variant="destructive" size="sm" onClick={() => handleRemove(idx)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length < maxImages && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
          }}
          disabled={uploading}
          className={cn(
            'w-full h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors',
            'hover:border-primary hover:bg-primary/5',
            dragOver && 'border-primary bg-primary/5',
            uploading && 'opacity-60 cursor-not-allowed'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Optimizando y subiendo...</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">Subir fotos</span>
              <span className="text-xs text-muted-foreground">
                Click o arrastra · se convierten a WebP · {value.length}/{maxImages}
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}