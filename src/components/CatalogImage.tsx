'use client';

import Image, { type ImageProps } from 'next/image';
import smartImageLoader from '../lib/imageLoader';

// El loader queda dentro del cliente; la página de búsqueda se renderiza en el servidor.
export default function CatalogImage(props: Omit<ImageProps, 'loader'>) {
  return <Image {...props} loader={smartImageLoader} />;
}
