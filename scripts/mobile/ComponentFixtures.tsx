import { useState } from 'react';
import { SignaturePad } from '@/components/SignaturePad';
import { MultiImageUpload } from '@/components/ui/multi-image-upload';
// Rendered only by the isolated audit bundle; never registered in App routes.
export function ComponentFixtures() {
  const [images, setImages] = useState(['data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="orange"/></svg>', 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="navy"/></svg>']);
  const [signature, setSignature] = useState<string | null>(null);
  return <div className="p-3"><SignaturePad onChange={setSignature} /><output data-signature>{signature ? 'capturada' : 'vacía'}</output><MultiImageUpload bucket="habitacion-fotos" value={images} onChange={setImages} /></div>;
}
