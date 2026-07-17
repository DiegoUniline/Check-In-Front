import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface Props {
  onChange: (dataUrl: string | null) => void;
  height?: number;
  className?: string;
}

/**
 * Pad de firma digital sobre canvas HTML5. Funciona con mouse y touch.
 * Al cambiar el trazo, emite el data URL PNG a `onChange`. Si el pad está
 * vacío, emite `null`.
 *
 * Uso típico en check-in: capturar la firma del huésped para incluirla en
 * el registro/tarjeta de huésped generada como PDF.
 */
export function SignaturePad({ onChange, height = 160, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const pointFromEvent = (e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const emit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(hasStrokes ? canvas.toDataURL('image/png') : null);
  };

  const handleDown = (e: React.PointerEvent) => {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointFromEvent(e);
  };
  const handleMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !last.current) return;
    const p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!hasStrokes) setHasStrokes(true);
  };
  const handleUp = () => {
    drawing.current = false;
    last.current = null;
    emit();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onChange(null);
  };

  return (
    <div className={className}>
      <div className="rounded-md border border-input bg-background overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height, touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{hasStrokes ? 'Firma capturada' : 'Firme dentro del recuadro'}</span>
        <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={!hasStrokes}>
          <Eraser className="mr-1 h-3 w-3" /> Borrar
        </Button>
      </div>
    </div>
  );
}