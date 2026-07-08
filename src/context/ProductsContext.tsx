'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getFirebaseDb, isFirebaseConfigured } from '../lib/firebase';
import { PERFUMES } from '../constants';
import { Perfume } from '../types';

interface ProductsContextValue {
  /** Todos los productos (incluye ocultos) — para el admin. */
  products: Perfume[];
  /** Solo los visibles — para la tienda. */
  visibleProducts: Perfume[];
  loading: boolean;
  /** 'firebase' si los datos vienen de Firestore, 'local' si usa el catálogo incluido. */
  source: 'firebase' | 'local';
}

const ProductsContext = createContext<ProductsContextValue>({
  products: PERFUMES,
  visibleProducts: PERFUMES,
  loading: false,
  source: 'local',
});

export const useProducts = () => useContext(ProductsContext);

// La tienda recibe los productos por SSR/ISR (initial); la suscripción en vivo
// a Firestore solo corre en /admin, donde hace falta ver los cambios al instante.
export const ProductsProvider: React.FC<{
  children: React.ReactNode;
  initial?: Perfume[];
  initialSource?: 'firebase' | 'local';
}> = ({ children, initial, initialSource }) => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [products, setProducts] = useState<Perfume[]>(initial && initial.length ? initial : PERFUMES);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'firebase' | 'local'>(initialSource || 'local');

  useEffect(() => {
    if (!isAdmin || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [db, { collection, onSnapshot }] = await Promise.all([
        getFirebaseDb(),
        import('firebase/firestore'),
      ]);
      if (cancelled) return;
      unsub = onSnapshot(
        collection(db, 'products'),
        (snap) => {
          if (snap.empty) {
            // Firestore aún sin productos: mostrar el catálogo incluido.
            setProducts(PERFUMES);
            setSource('local');
          } else {
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Perfume, 'id'>) }));
            setProducts(list);
            setSource('firebase');
          }
          setLoading(false);
        },
        (err) => {
          console.warn('[Äura] Error leyendo productos de Firestore, usando catálogo local:', err);
          setProducts(PERFUMES);
          setSource('local');
          setLoading(false);
        }
      );
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
