'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isSupabaseConfigured, watch } from '../lib/supabase';
import { productFromRow, type Row } from '../lib/supabaseMap';
import { PERFUMES } from '../constants';
import { Perfume } from '../types';

interface ProductsContextValue {
  /** Todos los productos (incluye ocultos) — para el admin. */
  products: Perfume[];
  /** Solo los visibles — para la tienda. */
  visibleProducts: Perfume[];
  loading: boolean;
  /** 'remote' si los datos vienen de la base de datos, 'local' si usa el catálogo incluido. */
  source: 'remote' | 'local';
}

const ProductsContext = createContext<ProductsContextValue>({
  products: PERFUMES,
  visibleProducts: PERFUMES,
  loading: false,
  source: 'local',
});

export const useProducts = () => useContext(ProductsContext);

// La tienda recibe los productos por SSR/ISR (initial); la suscripción en vivo
// a la base de datos solo corre en /admin, donde hace falta ver los cambios al instante.
export const ProductsProvider: React.FC<{
  children: React.ReactNode;
  initial?: Perfume[];
  initialSource?: 'remote' | 'local';
}> = ({ children, initial, initialSource }) => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [products, setProducts] = useState<Perfume[]>(initial && initial.length ? initial : PERFUMES);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'remote' | 'local'>(initialSource || 'local');

  useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const stop = await watch<Row[]>(
        ['products'],
        (sb) => sb.from('products').select('*'),
        (rows) => {
          if (!rows.length) {
            // Tabla aún sin productos: mostrar el catálogo incluido.
            setProducts(PERFUMES);
            setSource('local');
          } else {
            setProducts(rows.map(productFromRow));
            setSource('remote');
          }
          setLoading(false);
        },
        (err) => {
          console.warn('[Äura] Error leyendo productos, usando catálogo local:', err);
          setProducts(PERFUMES);
          setSource('local');
          setLoading(false);
        },
      );
      if (cancelled) stop();
      else unsub = stop;
    })().catch(() => setLoading(false));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [isAdmin]);

  const visibleProducts = products.filter((p) => p.visible !== false);

  return (
    <ProductsContext.Provider value={{ products, visibleProducts, loading, source }}>
      {children}
    </ProductsContext.Provider>
  );
};
